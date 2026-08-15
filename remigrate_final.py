import json
import urllib.request
import urllib.error
import sys
import os

# Set encoding for output to handle Arabic in terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = "https://ozcffmadatsfyyldqmdl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"

def delete_data(table):
    print(f"Deleting data from {table}...")
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=not.is.null"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(url, headers=headers, method='DELETE')
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Deleted {table} success")
    except urllib.error.HTTPError as e:
        print(f"Error deleting {table}: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Failed to delete {table}: {e}")

def insert_data(table, data_list):
    if not data_list:
        print(f"No data for {table}")
        return

    print(f"Inserting {len(data_list)} records into {table}...")
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json; charset=utf-8",
        "Prefer": "return=minimal"
    }

    # Chunk data
    chunk_size = 50
    for i in range(0, len(data_list), chunk_size):
        chunk = data_list[i:i + chunk_size]
        body = json.dumps(chunk, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as response:
                pass
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            print(f"Error inserting into {table}: {e.code} - {error_msg}")
        except Exception as e:
            print(f"Failed to insert into {table}: {e}")
    print(f"Finished {table}")

def run_migration():
    json_files = ["vsa.json", "data.json", "Time-analysis.json", "technical-analysis.json", "PDF-images.json"]
    base_path = "D:/New folder/my/"

    cards = []
    videos = []
    video_chapters = []
    card_assets = []

    # Track added IDs to avoid duplicates in the migration lists
    card_ids = set()
    video_ids = set()

    for filename in json_files:
        path = os.path.join(base_path, filename)
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue

        print(f"Reading {filename}...")
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for item in data:
                if not isinstance(item, dict) or "__comment__" in item:
                    continue

                title = item.get("title")
                if not title: continue

                card_id = item.get("id")
                if not card_id:
                    # Create a deterministic ID from title and category
                    card_id = f"{item.get('category', 'misc')}-{title[:10]}"

                if card_id not in card_ids:
                    cards.append({
                        "id": card_id,
                        "title": title,
                        "category": item.get("category", ""),
                        "content": item.get("content", ""),
                        "image_url": item.get("image", "")
                    })
                    card_ids.add(card_id)

                # Videos
                for v in item.get("videos", []):
                    v_title = v.get("title", "")
                    v_url = v.get("url", "")
                    if not v_title and not v_url: continue

                    v_id = v.get("id")
                    if not v_id:
                        v_id = f"{card_id}-v-{v_title[:10]}"

                    if v_id not in video_ids:
                        videos.append({
                            "id": v_id,
                            "card_id": card_id,
                            "title": v_title,
                            "url": v_url
                        })
                        video_ids.add(v_id)

                        # Chapters
                        for ch in v.get("chapters", []):
                            video_chapters.append({
                                "video_id": v_id,
                                "chapter_time": ch.get("time", ""),
                                "chapter_text": ch.get("text", "")
                            })

                # Assets
                for link in item.get("links", []):
                    # Trying to omit asset_type for links as per migrate.ps1 observation
                    # If it fails, I will know from the error.
                    card_assets.append({
                        "card_id": card_id,
                        # "asset_type": "link", # Omitted as per constraint warning
                        "url": link.get("url", ""),
                        "title": link.get("text", "")
                    })

                for img in item.get("images", []):
                    card_assets.append({
                        "card_id": card_id,
                        "asset_type": "image",
                        "url": img.get("url", ""),
                        "title": img.get("title", "")
                    })

                for pdf in item.get("pdfs", []):
                    card_assets.append({
                        "card_id": card_id,
                        "asset_type": "pdf",
                        "url": pdf.get("url", ""),
                        "title": pdf.get("title", "")
                    })
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    # Delete existing data in reverse order of dependencies
    delete_data("video_chapters")
    delete_data("card_assets")
    delete_data("videos")
    delete_data("cards")

    # Insert new data
    insert_data("cards", cards)
    insert_data("videos", videos)
    insert_data("video_chapters", video_chapters)
    insert_data("card_assets", card_assets)

    # Verification
    print("\nVerifying 'cards' table...")
    verify_url = f"{SUPABASE_URL}/rest/v1/cards?select=title&limit=10"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    req = urllib.request.Request(verify_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print("Successfully migrated titles (verifying Arabic):")
            for row in result:
                print(f" - {row['title']}")
    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    run_migration()
