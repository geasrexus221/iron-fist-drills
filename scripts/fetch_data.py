import urllib.request
import urllib.parse
import json
import re
import os
import time

CHARACTERS = ["Jin", "Kazuya", "Reina", "Heihachi"]
API_URL = "https://wavu.wiki/w/api.php"

def fetch_moves_for_character(char_name):
    print(f"[*] Fetching moves for {char_name}...")
    params = {
        "action": "cargoquery",
        "format": "json",
        "tables": "Move",
        "fields": "id,name,input,parent,target,damage,startup,recv,tot,crush,block,hit,ch,notes,video",
        "where": f"id LIKE '{char_name}-%'",
        "limit": "500"
    }
    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Tekken8Trainer/1.0"})
    
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
    moves = []
    video_titles = []
    
    if "cargoquery" in data:
        for item in data["cargoquery"]:
            title_obj = item["title"]
            moves.append(title_obj)
            vid = title_obj.get("video")
            if vid and str(vid).strip().startswith("File:"):
                video_titles.append(str(vid).strip())
                
    print(f"[+] Found {len(moves)} moves for {char_name} ({len(video_titles)} with video files).")
    return moves, video_titles

def resolve_video_urls(video_titles):
    """Batches queries to MediaWiki imageinfo API to get direct MP4 URLs."""
    video_map = {}
    unique_titles = list(set(video_titles))
    if not unique_titles:
        return video_map
    
    print(f"[*] Resolving direct URLs for {len(unique_titles)} video files...")
    chunk_size = 50
    for i in range(0, len(unique_titles), chunk_size):
        chunk = unique_titles[i:i + chunk_size]
        params = {
            "action": "query",
            "format": "json",
            "titles": "|".join(chunk),
            "prop": "imageinfo",
            "iiprop": "url"
        }
        url = f"{API_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Tekken8Trainer/1.0"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                
                # Check normalized titles map
                normalized_map = {}
                for norm in data.get("query", {}).get("normalized", []):
                    normalized_map[norm.get("to")] = norm.get("from")
                    
                pages = data.get("query", {}).get("pages", {})
                for page_id, page_info in pages.items():
                    title = page_info.get("title")
                    imageinfo = page_info.get("imageinfo")
                    if title and imageinfo and len(imageinfo) > 0:
                        direct_url = imageinfo[0].get("url")
                        video_map[title] = direct_url
                        video_map[title.lower()] = direct_url
                        orig = normalized_map.get(title)
                        if orig:
                            video_map[orig] = direct_url
                            video_map[orig.lower()] = direct_url
        except Exception as e:
            print(f"[!] Error resolving video URLs chunk {i}: {e}")
        time.sleep(0.15)
        
    print(f"[+] Successfully resolved {len(video_map)} video mappings.")
    return video_map

def clean_frame_num(val):
    """Cleans a frame string like '-14~-15' or '+8' or '-10(g)' into an integer or None."""
    if not val:
        return None
    val = str(val).strip()
    val = re.sub(r"\(.*?\)", "", val).replace(",", "").strip()
    m = re.search(r"([+-]?\d+)", val)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None

def clean_startup(val):
    """Extracts base startup integer, e.g. 'i10', '15~16', ',i21' -> 10, 15, 21."""
    if not val:
        return None
    val = str(val).strip()
    m = re.search(r"i?(\d+)", val)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None

def normalize_moves(char_name, raw_moves, video_map):
    cleaned = []
    seen_ids = set()
    
    # Map raw moves by ID for fast parent lookups
    moves_by_id = {m.get("id"): m for m in raw_moves if m.get("id")}
    
    for m in raw_moves:
        move_id = m.get("id", "")
        if not move_id or move_id in seen_ids:
            continue
        seen_ids.add(move_id)
        
        # Derive full notation from ID, e.g., 'Jin-d/f+2' -> 'd/f+2'
        if "-" in move_id:
            full_input = move_id.split("-", 1)[1]
        else:
            full_input = m.get("input", "")
            
        # 1. Trace parent chain to find root startup
        curr = m
        visited = set()
        root_startup_str = m.get("startup") or ""
        
        while curr:
            visited.add(curr.get("id"))
            st = str(curr.get("startup") or "").strip()
            parent_id = curr.get("parent")
            # If st does not start with comma and is not empty, it's the root startup
            if st and not st.startswith(","):
                root_startup_str = st
                break
            if not parent_id or parent_id not in moves_by_id or parent_id in visited:
                root_startup_str = st.lstrip(",")
                break
            curr = moves_by_id[parent_id]
            
        startup_num = clean_startup(root_startup_str)
        
        # 2. Build full sequence for target and damage along parent chain
        chain = []
        curr = m
        visited = set()
        while curr:
            chain.append(curr)
            visited.add(curr.get("id"))
            pid = curr.get("parent")
            if not pid or pid not in moves_by_id or pid in visited:
                break
            curr = moves_by_id[pid]
        chain.reverse()
        
        # Full targets: e.g. 'h, h, m'
        targets = []
        for node in chain:
            t = str(node.get("target") or "").strip().lstrip(",")
            if t:
                targets.append(t)
        full_target = ", ".join(targets) if targets else (m.get("target") or "")
        
        # Full damage: e.g. '27 (5, 6, 16)'
        damages = []
        total_dmg = 0
        has_valid_dmg = False
        for node in chain:
            d = str(node.get("damage") or "").strip().lstrip(",")
            m_d = re.search(r"(\d+)", d)
            if m_d:
                has_valid_dmg = True
                total_dmg += int(m_d.group(1))
                damages.append(d)
        if has_valid_dmg and len(damages) > 1:
            full_damage = f"{total_dmg} ({', '.join(damages)})"
        elif has_valid_dmg:
            full_damage = str(total_dmg)
        else:
            full_damage = m.get("damage") or ""
            
        block_num = clean_frame_num(m.get("block"))
        hit_num = clean_frame_num(m.get("hit"))
        ch_num = clean_frame_num(m.get("ch"))
        
        # Match video
        raw_vid = m.get("video")
        direct_video = None
        if raw_vid:
            raw_vid_str = str(raw_vid).strip()
            direct_video = (video_map.get(raw_vid_str) 
                            or video_map.get(raw_vid_str.lower())
                            or video_map.get(f"File:{raw_vid_str}")
                            or video_map.get(f"File:{raw_vid_str}".lower()))
            
        is_punishable = block_num is not None and block_num <= -10
        is_plus_on_block = block_num is not None and block_num > 0
        is_plus_on_hit = hit_num is not None and hit_num > 0
        
        is_low = "l" in full_target.lower()
        is_high = "h" in full_target.lower() and "m" not in full_target.lower() and "l" not in full_target.lower()
        is_mid = "m" in full_target.lower()
        
        # Identify whether it's a launcher from CH, Hit, or notes
        notes = (m.get("notes") or "").lower()
        ch_str = str(m.get("ch") or "").lower()
        hit_str = str(m.get("hit") or "").lower()
        is_launcher = ("launch" in notes or "launch" in ch_str or "launch" in hit_str 
                       or "tgd" in ch_str or "knd" in hit_str and "launch" in notes)
        
        move_obj = {
            "id": move_id,
            "character": char_name,
            "name": m.get("name") or full_input,
            "input": full_input,
            "parent": m.get("parent"),
            "target": full_target,
            "is_low": is_low,
            "is_high": is_high,
            "is_mid": is_mid,
            "damage": full_damage,
            "startup": root_startup_str,
            "startup_num": startup_num,
            "last_hit_startup": m.get("startup"),
            "block": m.get("block"),
            "block_num": block_num,
            "hit": m.get("hit"),
            "hit_num": hit_num,
            "ch": m.get("ch"),
            "ch_num": ch_num,
            "is_punishable": is_punishable,
            "is_plus_on_block": is_plus_on_block,
            "is_plus_on_hit": is_plus_on_hit,
            "is_launcher": is_launcher,
            "video_file": raw_vid,
            "video_url": direct_video,
            "notes": m.get("notes")
        }
        cleaned.append(move_obj)
        
    return cleaned

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(script_dir, "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    
    all_data = {}
    
    for char in CHARACTERS:
        raw_moves, video_titles = fetch_moves_for_character(char)
        video_map = resolve_video_urls(video_titles)
        cleaned_moves = normalize_moves(char, raw_moves, video_map)
        
        char_file = os.path.join(out_dir, f"{char.lower()}.json")
        with open(char_file, "w", encoding="utf-8") as f:
            json.dump(cleaned_moves, f, indent=2, ensure_ascii=False)
            
        all_data[char] = cleaned_moves
        with_vid = len([m for m in cleaned_moves if m['video_url']])
        punishable = len([m for m in cleaned_moves if m['is_punishable']])
        print(f"[OK] Saved {len(cleaned_moves)} moves for {char} ({with_vid} with video, {punishable} punishable) -> {char_file}")
        time.sleep(0.5)
        
    summary_file = os.path.join(out_dir, "roster_summary.json")
    summary = {
        char: {
            "total_moves": len(moves),
            "with_video": len([m for m in moves if m["video_url"]]),
            "punishable_moves": len([m for m in moves if m["is_punishable"]]),
            "plus_on_block_moves": len([m for m in moves if m["is_plus_on_block"]]),
            "plus_on_hit_moves": len([m for m in moves if m["is_plus_on_hit"]])
        }
        for char, moves in all_data.items()
    }
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[OK] Summary saved to {summary_file}")

if __name__ == "__main__":
    main()
