import ccxt
import json
import os
import time  # 👇 مكتبة التحكم بالوقت
import subprocess  # 👇 المكتبة السحرية التي ستتحكم بـ GitHub بدلاً منك

# 1️⃣ دالة الرفع التلقائي إلى GitHub
def auto_github_push():
    try:
        print("📤 جاري رفع البيانات الجديدة إلى GitHub تلقائياً...")
        # تنفيذ أمر git add لملف البيانات فقط
        subprocess.run(["git", "add", "data.json"], check=True)
        # تنفيذ أمر commit مع رسالة تلقائية ثابتة
        subprocess.run(["git", "commit", "-m", "Auto-update crypto alerts"], check=True)
        # تنفيذ أمر push لرفع الملف للموقع أونلاين
        subprocess.run(["git", "push"], check=True)
        print("🚀 تم تحديث موقعك على GitHub Pages بنجاح وبشكل آلي!")
    except Exception as e:
        print(f"⚠️ تنبيه: لم يتم الرفع (قد لا توجد تغييرات جديدة أو مشكلة اتصال): {e}")

def analyze_crypto_market():
    # ... (الأكواد الحالية الخاصة بك لجلب البيانات من بينانس) ...
    
    # مثال على حجم التداول والشرط الخاص بك:
    if volume > 100:  # الرقم للتجربة
        new_alert = {
            "category": "vsa",
            # بقية تفاصيل الكارت الخاص بك...
        }
        
        file_name = 'data.json'
        existing_data = []
        
        # قراءة البيانات القديمة
        if os.path.exists(file_name):
            with open(file_name, 'r', encoding='utf-8') as f:
                try: existing_data = json.load(f)
                except json.JSONDecodeError: existing_data = []

        # التحقق من عدم التكرار
        if not any(item['title'] == new_alert['title'] for item in existing_data):
            existing_data.insert(0, new_alert)
            existing_data = existing_data[:30]  # سقف الـ 30 كارت لحماية الحجم
            
            # حفظ الملف محلياً
            with open(file_name, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=4)
            print("✅ تم تحديث ملف data.json محلياً!")
            
            # 🔥 هنا السر: استدعاء دالة الرفع فوراً بعد الحفظ الناجح
            auto_github_push()
        else:
            print("ℹ️ التنبيه موجود مسبقاً، لن يتم التكرار ولن نرفع شيئاً لـ GitHub.")

# 2️⃣ حلقة التشغيل اللانهائية الآلية
if __name__ == "__main__":
    print("🤖 تم تشغيل بوت الأتمتة الكاملة بنجاح...")
    
    while True:  # حلقة لا تنتهي أبداً
        try:
            print(f"\n🔄 جاري فحص السوق الآن... {time.strftime('%Y-%m-%d %H:%M:%S')}")
            analyze_crypto_market()
        except Exception as e:
            print(f"❌ حدث خطأ غير متوقع في هذه الدورة: {e}")
        
        # ⏳ تحديد مدة الانتظار قبل الفحص القادم (بالثواني)
        # 300 ثانية تعني أن البوت سيفحص السوق كل 5 دقائق بشكل صامت تلقائياً
        print("⏳ في انتظار الفحص القادم بعد 5 دقائق...")
        time.sleep(300)