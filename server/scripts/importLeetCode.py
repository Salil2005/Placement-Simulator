import urllib.request
import json
import os
import sys

URLS = [
    ("train", "https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/LeetCodeDataset-train.jsonl"),
    ("test", "https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/LeetCodeDataset-test.jsonl")
]

def format_title(task_id):
    if not task_id:
        return "Algorithm Problem"
    words = task_id.replace("_", "-").split("-")
    capitalized = []
    for w in words:
        if w.lower() in ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]:
            capitalized.append(w.upper())
        else:
            capitalized.append(w.capitalize())
    return " ".join(capitalized)

records = []
seen_texts = set()

print("[*] Starting download of ALL LeetCode questions (Train: 2,641 + Test: 228 = 2,869 problems)...")

for split_name, url in URLS:
    print(f"[*] Fetching {split_name} split from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    
    with urllib.request.urlopen(req) as resp:
        count = 0
        for line in resp:
            line_str = line.decode("utf-8", errors="replace").strip()
            if not line_str:
                continue
            
            try:
                data = json.loads(line_str)
            except Exception as e:
                continue

            diff_raw = (data.get("difficulty") or "medium").strip().lower()
            if diff_raw not in ["easy", "medium", "hard"]:
                diff_raw = "medium"

            tags = data.get("tags") or []
            topic = tags[0] if tags else "Data Structures & Algorithms"

            title = format_title(data.get("task_id", ""))
            description = (data.get("problem_description") or "").strip()

            if not description:
                continue

            # Standardize problem text
            text = f"**Problem: {title}**\n\n{description}"
            if text in seen_texts:
                continue
            seen_texts.add(text)

            records.append({
                "category": "dsa",
                "difficulty": diff_raw,
                "topic": topic,
                "text": text,
                "active": True
            })
            count += 1
            if count % 500 == 0:
                print(f"    - Parsed {count} questions from {split_name}...")

        print(f"[+] Finished {split_name}: {count} problems added.")

print(f"[*] Total unique LeetCode questions parsed: {len(records)}")

output_file = "d:/Collage Projects/Placement-Simulator/server/knowledge/leetcodeQuestions.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"[+] Successfully wrote {len(records)} questions to {output_file}")
