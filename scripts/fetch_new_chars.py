import urllib.request
import urllib.parse
import json
import re
import os
import time

NEW_CHARACTERS = ["King", "Armor King"]
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

def normalize_moves(char_name, raw_moves, video_map):
    cleaned = []
    moves_by_id = {m["id"]: m for m in raw_moves if "id" in m}
    
    for m in raw_moves:
        move_id = m.get("id")
        if not move_id:
            continue
            
        full_input_parts = []
        curr = m
        visited = set()
        while curr and curr.get("id") not in visited:
            visited.add(curr.get("id"))
            inp = curr.get("input") or ""
            if inp:
                full_input_parts.append(inp)
            parent_id = curr.get("parent")
            curr = moves_by_id.get(parent_id) if parent_id else None
            
        full_input_parts.reverse()
        full_input = "".join(full_input_parts)
        if not full_input:
            full_input = m.get("input") or m.get("name") or "Unknown"
            
        # Target
        full_target_parts = []
        curr = m
        visited = set()
        while curr and curr.get("id") not in visited:
            visited.add(curr.get("id"))
            tgt = curr.get("target") or ""
            if tgt:
                full_target_parts.append(tgt)
            parent_id = curr.get("parent")
            curr = moves_by_id.get(parent_id) if parent_id else None
        full_target_parts.reverse()
        full_target = ",".join(full_target_parts).replace(",,", ",")
        if full_target.startswith(","): full_target = full_target[1:]
        if not full_target:
            full_target = m.get("target") or ""
            
        # Startup
        curr = m
        root_startup = m.get("startup")
        visited = set()
        while curr and curr.get("id") not in visited:
            visited.add(curr.get("id"))
            if curr.get("startup"):
                root_startup = curr.get("startup")
            parent_id = curr.get("parent")
            curr = moves_by_id.get(parent_id) if parent_id else None
            
        root_startup_str = str(root_startup or "").strip()
        startup_num = clean_frame_num(root_startup_str)
        
        # Damage
        dmg_parts = []
        curr = m
        visited = set()
        while curr and curr.get("id") not in visited:
            visited.add(curr.get("id"))
            d = curr.get("damage")
            if d:
                dmg_parts.append(str(d))
            parent_id = curr.get("parent")
            curr = moves_by_id.get(parent_id) if parent_id else None
        dmg_parts.reverse()
        
        total_dmg = 0
        has_calc_dmg = False
        for dp in dmg_parts:
            m_dmg = re.search(r"(\d+)", dp)
            if m_dmg:
                total_dmg += int(m_dmg.group(1))
                has_calc_dmg = True
                
        if has_calc_dmg and len(dmg_parts) > 1:
            full_damage = f"{total_dmg} ({', '.join(dmg_parts)})"
        elif has_calc_dmg:
            full_damage = str(total_dmg)
        else:
            full_damage = m.get("damage") or ""
            
        block_num = clean_frame_num(m.get("block"))
        hit_num = clean_frame_num(m.get("hit"))
        ch_num = clean_frame_num(m.get("ch"))
        
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
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(root_dir, "data")
    web_data_dir = os.path.join(root_dir, "web", "src", "data")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(web_data_dir, exist_ok=True)
    
    for char in NEW_CHARACTERS:
        raw_moves, video_titles = fetch_moves_for_character(char)
        video_map = resolve_video_urls(video_titles)
        cleaned_moves = normalize_moves(char, raw_moves, video_map)
        
        file_name = char.lower().replace(" ", "_") + ".json"
        
        p1 = os.path.join(data_dir, file_name)
        with open(p1, "w", encoding="utf-8") as f:
            json.dump(cleaned_moves, f, indent=2, ensure_ascii=False)
            
        p2 = os.path.join(web_data_dir, file_name)
        with open(p2, "w", encoding="utf-8") as f:
            json.dump(cleaned_moves, f, indent=2, ensure_ascii=False)
            
        with_vid = len([m for m in cleaned_moves if m['video_url']])
        punishable = len([m for m in cleaned_moves if m['is_punishable']])
        print(f"[OK] Saved {len(cleaned_moves)} moves for {char} ({with_vid} with video, {punishable} punishable) -> {p1} and {p2}")
        time.sleep(0.5)

if __name__ == "__main__":
    main()
