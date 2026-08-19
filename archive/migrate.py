import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://ozcffmadatsfyyldqmdl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"

def upsert(table, data):
    if not data: return
    url = f"{SUPABASE_URL}/rest/v1/{table}"

    # Split into chunks to avoid potential request size limits
    chunk_size = 50
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        body = json.dumps(chunk).encode('utf-8')
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header("apikey", SUPABASE_KEY)
        req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "resolution=merge-duplicates")

        try:
            with urllib.request.urlopen(req) as resp:
                print(f"Successfully upserted {len(chunk)} rows to {table}")
        except urllib.error.HTTPError as e:
            print(f"Error upserting to {table}: {e.code} {e.read().decode()}")
        except Exception as e:
            print(f"Unexpected error upserting to {table}: {e}")

files = [
    "D:/New folder/my/vsa.json",
    "D:/New folder/my/data.json",
    "D:/New folder/my/Time-analysis.json",
    "D:/New folder/my/technical-analysis.json",
    "D:/New folder/my/PDF-images.json"
]

all_cards = []
all_videos = []
all_chapters = []
all_assets = []

card_ids = set()
video_ids = set()

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        continue

    for item in data:
        if not isinstance(item, dict): continue
        if "__comment__" in item and len(item) == 1: continue

        orig_id = item.get('id')
        title = item.get('title', '')
        category = item.get('category', '')

        if not orig_id:
            card_id = f"{category}-{title[:20]}"
        else:
            card_id = orig_id

        # Ensure unique card ID
        base_id = card_id
        counter = 1
        while card_id in card_ids:
            card_id = f"{base_id}-{counter}"
            counter += 1
        card_ids.add(card_id)

        card = {
            "id": card_id,
            "title": title,
            "category": category,
            "content": item.get('content', ''),
            "image_url": item.get('image') or item.get('image_url') or ""
        }
        all_cards.append(card)

        # Videos
        videos = item.get('videos', [])
        for i, v in enumerate(videos):
            video_id = v.get('id')
            if not video_id:
                video_id = f"{card_id}-v-{i}"

            # Ensure unique video ID
            v_base_id = video_id
            v_counter = 1
            while video_id in video_ids:
                video_id = f"{v_base_id}-{v_counter}"
                v_counter += 1
            video_ids.add(video_id)

            all_videos.append({
                "id": video_id,
                "card_id": card_id,
                "title": v.get('title'),
                "url": v.get('url'),
                "order_index": i
            })

            # Chapters
            chapters = v.get('chapters', [])
            for c in chapters:
                all_chapters.append({
                    "video_id": video_id,
                    "chapter_time": c.get('time'),
                    "chapter_text": c.get('text')
                })

        # Links
        links = item.get('links', [])
        for l in links:
            all_assets.append({
                "card_id": card_id,
                "asset_type": "link",
                "url": l.get('url'),
                "title": l.get('text')
            })

        # Images (from PDF-images.json)
        images = item.get('images', [])
        for img in images:
            all_assets.append({
                "card_id": card_id,
                "asset_type": "image",
                "url": img.get('url'),
                "title": img.get('title')
            })

        # PDFs (from PDF-images.json)
        pdfs = item.get('pdfs', [])
        for pdf in pdfs:
            if 'links' in pdf:
                for l in pdf['links']:
                    all_assets.append({
                        "card_id": card_id,
                        "asset_type": "pdf",
                        "url": l.get('url'),
                        "title": l.get('text')
                    })
            else:
                all_assets.append({
                    "card_id": card_id,
                    "asset_type": "pdf",
                    "url": pdf.get('url'),
                    "title": pdf.get('title')
                })

print(f"Total cards: {len(all_cards)}")
print(f"Total videos: {len(all_videos)}")
print(f"Total chapters: {len(all_chapters)}")
print(f"Total assets: {len(all_assets)}")

print("Starting migration...")
upsert("cards", all_cards)
upsert("videos", all_videos)
upsert("video_chapters", all_chapters)
upsert("card_assets", all_assets)
print("Migration finished.")
