import json
import urllib.request
import urllib.error
import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ozcffmadatsfyyldqmdl.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg"

def delete_all(table):
    print(f"Deleting {table}...")
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=not.is.null"
    req = urllib.request.Request(url, method='DELETE')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    try:
        urllib.request.urlopen(req)
    except:
        pass

def upsert(table, data):
    if not data: return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    # ensure_ascii=False is the key for Arabic
    body = json.dumps(data, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("Prefer", "resolution=merge-duplicates")
    try:
        urllib.request.urlopen(req)
        print(f"Upserted {len(data)} rows to {table}")
    except urllib.error.HTTPError as e:
        print(f"Error {table}: {e.read().decode()}")

files = ["vsa.json", "data.json", "Time-analysis.json", "technical-analysis.json", "PDF-images.json"]
all_cards, all_videos, all_chapters, all_assets = [], [], [], []

for f_name in files:
    try:
        with open(f"D:/New folder/my/{f_name}", "r", encoding="utf-8") as f:
            items = json.load(f)
            for item in items:
                if not isinstance(item, dict) or "__comment__" in item: continue
                c_id = item.get("id") or f"{item.get('category')}-{item.get('title')[:10]}"
                all_cards.append({"id":c_id, "title":item.get("title",""), "category":item.get("category",""), "content":item.get("content",""), "image_url":item.get("image","")})
                for v in item.get("videos", []):
                    v_id = v.get("id") or f"{c_id}-v-{v.get('title')[:10]}"
                    all_videos.append({"id":v_id, "card_id":c_id, "title":v.get("title",""), "url":v.get("url","")})
                    for ch in v.get("chapters", []):
                        all_chapters.append({"video_id":v_id, "chapter_time":ch.get("time",""), "chapter_text":ch.get("text","")})
                for link in item.get("links", []):
                    all_assets.append({"card_id":c_id, "asset_type":"pdf", "url":link.get("url",""), "title":link.get("text","")})
                for img in item.get("images", []):
                    all_assets.append({"card_id":c_id, "asset_type":"image", "url":img.get("url",""), "title":img.get("title","")})
                for pdf in item.get("pdfs", []):
                    all_assets.append({"card_id":c_id, "asset_type":"pdf", "url":pdf.get("url",""), "title":pdf.get("title","")})
    except: pass

delete_all("video_chapters"); delete_all("card_assets"); delete_all("videos"); delete_all("cards")
upsert("cards", all_cards); upsert("videos", all_videos); upsert("video_chapters", all_chapters); upsert("card_assets", all_assets)

# Verify
req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/cards?select=title&limit=1")
req.add_header("apikey", SUPABASE_KEY); req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
print("Verification:", urllib.request.urlopen(req).read().decode())
