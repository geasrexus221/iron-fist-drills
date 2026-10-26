import urllib.request
import urllib.parse
import json
import re
import os
import time
import sys

# Ensure UTF-8 for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://wavu.wiki/w/api.php"

# All 35 Characters in Tekken 8
ROSTER_CONFIG = [
    {"name": "Alisa", "id_prefix": "Alisa", "title": "Automaton of Destruction", "style": "Thruster-based High Mobility", "avatar": "AL", "color": "#ec4899"},
    {"name": "Asuka", "id_prefix": "Asuka", "title": "Spirited Peacemaker", "style": "Kazama Style Traditional Martial Arts", "avatar": "AS", "color": "#3b82f6"},
    {"name": "Azucena", "id_prefix": "Azucena", "title": "Perfect Blend", "style": "Raku", "avatar": "AZ", "color": "#f59e0b"},
    {"name": "Bryan", "id_prefix": "Bryan", "title": "Harbinger of Chaos", "style": "Kickboxing", "avatar": "BR", "color": "#94a3b8"},
    {"name": "Claudio", "id_prefix": "Claudio", "title": "The Banishing Archer", "style": "Sirius Style Exorcism Arts", "avatar": "CL", "color": "#06b6d4"},
    {"name": "Devil Jin", "id_prefix": "Devil Jin", "title": "Black Wings of Ruin", "style": "Unknown", "avatar": "DJ", "color": "#8b5cf6"},
    {"name": "Eddy", "id_prefix": "Eddy", "title": "Indomitable Flash", "style": "Capoeira", "avatar": "ED", "color": "#eab308"},
    {"name": "Feng", "id_prefix": "Feng", "title": "God Fist", "style": "God Fist Style Chinese Martial Arts", "avatar": "FG", "color": "#ea580c"},
    {"name": "Hwoarang", "id_prefix": "Hwoarang", "title": "Blood Talon", "style": "Taekwondo", "avatar": "HW", "color": "#ef4444"},
    {"name": "Jack-8", "id_prefix": "Jack-8", "title": "High-Tech Annihilator", "style": "Brute Force", "avatar": "J8", "color": "#10b981"},
    {"name": "Jin", "id_prefix": "Jin", "title": "Lightning of Fate", "style": "Traditional Karate", "avatar": "JN", "color": "#00d2ff"},
    {"name": "Jun", "id_prefix": "Jun", "title": "Chosen of Light", "style": "Kazama Style Traditional Martial Arts", "avatar": "JU", "color": "#a7f3d0"},
    {"name": "Kazuya", "id_prefix": "Kazuya", "title": "Cold-Blooded Oppressor", "style": "Mishima Style Fighting Karate", "avatar": "KZ", "color": "#ff2a5f"},
    {"name": "King", "id_prefix": "King", "title": "Anger of the Beast", "style": "Pro Wrestling", "avatar": "KG", "color": "#ffcc00"},
    {"name": "Kuma", "id_prefix": "Kuma", "title": "Master of Salmon", "style": "Heihachi Style Improved Kuma Shinken", "avatar": "KM", "color": "#b45309"},
    {"name": "Lars", "id_prefix": "Lars", "title": "Iron Lion", "style": "Tekken Forces Martial Arts", "avatar": "LR", "color": "#38bdf8"},
    {"name": "Lee", "id_prefix": "Lee", "title": "Silver-Haired Demon", "style": "Martial Arts", "avatar": "LE", "color": "#c084fc"},
    {"name": "Leo", "id_prefix": "Leo", "title": "Seeker of Truth", "style": "Bajiquan", "avatar": "LO", "color": "#facc15"},
    {"name": "Leroy", "id_prefix": "Leroy", "title": "Grandmaster of Drip", "style": "Wing Chun", "avatar": "LY", "color": "#f97316"},
    {"name": "Lidia", "id_prefix": "Lidia", "title": "Warrior Prime Minister", "style": "Traditional Karate", "avatar": "LD", "color": "#e11d48"},
    {"name": "Lili", "id_prefix": "Lili", "title": "Fighting Heiress", "style": "Gymnastics Street Fight", "avatar": "LL", "color": "#f43f5e"},
    {"name": "Law", "id_prefix": "Law", "title": "Legendary Dragon", "style": "Martial Arts", "avatar": "LW", "color": "#eab308"},
    {"name": "Nina", "id_prefix": "Nina", "title": "Silent Assassin", "style": "Assassination Arts", "avatar": "NN", "color": "#a855f7"},
    {"name": "Panda", "id_prefix": "Panda", "title": "Pretty Beast", "style": "Heihachi Style Improved Kuma Shinken", "avatar": "PD", "color": "#f472b6"},
    {"name": "Paul", "id_prefix": "Paul", "title": "Hot-Blooded Destroyer", "style": "Integrated Martial Arts based on Judo", "avatar": "PL", "color": "#f97316"},
    {"name": "Raven", "id_prefix": "Raven", "title": "Shadow Agent", "style": "Ninjutsu", "avatar": "RV", "color": "#6366f1"},
    {"name": "Reina", "id_prefix": "Reina", "title": "Purple Lightning", "style": "Mishima Style + Taido", "avatar": "RN", "color": "#b026ff"},
    {"name": "Shaheen", "id_prefix": "Shaheen", "title": "Desert Falcon", "style": "Military Close Combat", "avatar": "SH", "color": "#14b8a6"},
    {"name": "Steve", "id_prefix": "Steve", "title": "Counter-Punching Paragon", "style": "Boxing", "avatar": "ST", "color": "#0284c7"},
    {"name": "Victor", "id_prefix": "Victor", "title": "Refined Refractor", "style": "Super Spy CQB", "avatar": "VC", "color": "#94a3b8"},
    {"name": "Xiaoyu", "id_prefix": "Xiaoyu", "title": "Dancing Phoenix", "style": "Baguazhang, Piguazhang", "avatar": "XY", "color": "#fb7185"},
    {"name": "Yoshimitsu", "id_prefix": "Yoshimitsu", "title": "Mechanized Space Ninja", "style": "Advanced Manji Ninjutsu", "avatar": "YS", "color": "#10b981"},
    {"name": "Zafina", "id_prefix": "Zafina", "title": "Mystic Stargazer", "style": "Ancient Assassination Arts", "avatar": "ZF", "color": "#7c3aed"},
    {"name": "Heihachi", "id_prefix": "Heihachi", "title": "King of Iron Fist", "style": "Mishima Style Karate", "avatar": "HH", "color": "#ffaa00"},
    {"name": "Armor King", "id_prefix": "Armor King", "title": "Dark Black Jaguar", "style": "Shoot Wrestling", "avatar": "AK", "color": "#a855f7"},
]

def get_file_name(char_name):
    return char_name.lower().replace(" ", "_").replace("-", "_") + ".json"

def fetch_moves_for_character(char_prefix):
    params = {
        "action": "cargoquery",
        "format": "json",
        "tables": "Move",
        "fields": "id,name,input,parent,target,damage,startup,recv,tot,crush,block,hit,ch,notes,video",
        "where": f"id LIKE '{char_prefix}-%'",
        "limit": "500"
    }
    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Tekken8Trainer/2.0"})
    
    with urllib.request.urlopen(req, timeout=15) as resp:
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
                
    return moves, video_titles

def resolve_video_urls(video_titles):
    video_map = {}
    unique_titles = list(set(video_titles))
    if not unique_titles:
        return video_map
    
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
        req = urllib.request.Request(url, headers={"User-Agent": "Tekken8Trainer/2.0"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                
                normalized_map = {}
                for norm in data.get("query", {}).get("normalized", []):
                    normalized_map[norm.get("to")] = norm.get("from")
                    
                pages = data.get("query", {}).get("pages", {})
                for page_id, pdata in pages.items():
                    title = pdata.get("title", "")
                    imageinfo = pdata.get("imageinfo", [])
                    if imageinfo:
                        direct_url = imageinfo[0].get("url")
                        if direct_url:
                            video_map[title] = direct_url
                            video_map[title.lower()] = direct_url
                            clean_t = title.replace("File:", "").strip()
                            video_map[clean_t] = direct_url
                            video_map[clean_t.lower()] = direct_url
                            
                            if title in normalized_map:
                                orig = normalized_map[title]
                                video_map[orig] = direct_url
                                video_map[orig.lower()] = direct_url
                                video_map[orig.replace("File:", "").strip()] = direct_url
        except Exception as e:
            print(f"      [!] Error resolving video URLs chunk: {e}")
        time.sleep(0.1)
        
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
    
    total_chars = len(ROSTER_CONFIG)
    print(f"=== Starting Tekken 8 Full Roster Fetch ({total_chars} characters) ===")
    
    roster_summary = []
    
    for idx, c_cfg in enumerate(ROSTER_CONFIG, 1):
        char_name = c_cfg["name"]
        id_prefix = c_cfg["id_prefix"]
        file_name = get_file_name(char_name)
        
        p1 = os.path.join(data_dir, file_name)
        p2 = os.path.join(web_data_dir, file_name)
        
        # If already exists and valid, load it; else fetch from Wavu Wiki
        cleaned_moves = None
        if os.path.exists(p1) and os.path.getsize(p1) > 1000:
            try:
                with open(p1, "r", encoding="utf-8") as f:
                    cleaned_moves = json.load(f)
                print(f"[{idx}/{total_chars}] CACHED: {char_name} ({len(cleaned_moves)} moves)")
                # Ensure p2 also has it
                if not os.path.exists(p2) or os.path.getsize(p2) != os.path.getsize(p1):
                    with open(p2, "w", encoding="utf-8") as f:
                        json.dump(cleaned_moves, f, indent=2, ensure_ascii=False)
            except Exception:
                cleaned_moves = None
                
        if cleaned_moves is None:
            print(f"[{idx}/{total_chars}] FETCHING: {char_name} (prefix: '{id_prefix}')...")
            try:
                raw_moves, video_titles = fetch_moves_for_character(id_prefix)
                video_map = resolve_video_urls(video_titles)
                cleaned_moves = normalize_moves(char_name, raw_moves, video_map)
                
                with open(p1, "w", encoding="utf-8") as f:
                    json.dump(cleaned_moves, f, indent=2, ensure_ascii=False)
                with open(p2, "w", encoding="utf-8") as f:
                    json.dump(cleaned_moves, f, indent=2, ensure_ascii=False)
                    
                print(f"     -> SAVED {len(cleaned_moves)} moves ({len(video_map)} videos resolved)")
                time.sleep(0.3)
            except Exception as e:
                print(f"     [!] Failed to fetch {char_name}: {e}")
                continue
                
        # Calculate stats for summary
        with_vid = len([m for m in cleaned_moves if m.get('video_url')])
        punishable = len([m for m in cleaned_moves if m.get('is_punishable')])
        launchers = len([m for m in cleaned_moves if m.get('is_launcher')])
        
        roster_summary.append({
            "name": char_name,
            "title": c_cfg["title"],
            "style": c_cfg["style"],
            "avatar": c_cfg["avatar"],
            "color": c_cfg["color"],
            "file": file_name,
            "total_moves": len(cleaned_moves),
            "video_count": with_vid,
            "punishable_count": punishable,
            "launcher_count": launchers
        })
        
    summary_path1 = os.path.join(data_dir, "roster_summary.json")
    summary_path2 = os.path.join(web_data_dir, "roster_summary.json")
    with open(summary_path1, "w", encoding="utf-8") as f:
        json.dump(roster_summary, f, indent=2, ensure_ascii=False)
    with open(summary_path2, "w", encoding="utf-8") as f:
        json.dump(roster_summary, f, indent=2, ensure_ascii=False)
        
    print(f"\n[DONE] Successfully processed all {len(roster_summary)} characters!")

if __name__ == "__main__":
    main()
