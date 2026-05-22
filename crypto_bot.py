import ccxt
import json
import os

def analyze_crypto_market():
    print("🔄 جاري الاتصال بمنصة Binance وسحب أحجام التداول...")
    try:
        # 1. الاتصال المباشر بجلب أسعار شمعة الـ 4 ساعات للبيتكوين
        exchange = ccxt.binance()
        bars = exchange.fetch_ohlcv('BTC/USDT', timeframe='4h', limit=1)
        
        if not bars:
            return
            
        latest_bar = bars[0]
        time, open_p, high, low, close_p, volume = latest_bar
        spread = high - low
        
        print(f"📊 البار الحالي - الحجم: {volume:.2f}, المدى: {spread:.2f}")

        # 2. شروط VSA (تعدل لاحقاً بناءً على معادلاتك الدقيقة لـ جان والـ VSA)
        # كمثال: إذا كان الفوليوم مرتفعاً نسبياً
        if volume > 1000: 
            new_alert = {
                "category": "vsa",
                "title": "تنبيه حيتان البيتكوين (BTC) - آلي",
                "content": f"تحليل VSA مؤتمت: تم رصد حجم تداول مرتفع جداً ({volume:.0f}) عند السعر {close_p}. يرجى مراقبة مستويات زوايا جان الهامة للتأكيد.",
                "links": [
                    { "text": "تداول الآن", "url": "https://www.binance.com" }
                ]
            }
            
            # 3. تحديث ملف JSON دون حذف البيانات القديمة
            file_name = 'data.json'
            existing_data = []
            
            # إذا كان الملف موجوداً سابقاً، نقرأ محتواه أولاً
            if os.path.exists(file_name):
                with open(file_name, 'r', encoding='utf-8') as f:
                    try:
                        existing_data = json.load(f)
                    except json.JSONDecodeError:
                        existing_data = []

            # التحقق لمنع تكرار نفس التنبيه بناءً على العنوان
            if not any(item['title'] == new_alert['title'] for item in existing_data):
                # إضافة التنبيه الجديد في بداية المصفوفة لكي يظهر أول واحد للمستخدم
                existing_data.insert(0, new_alert)
                
                # حفظ المصفوفة كاملة بعد التحديث
                with open(file_name, 'w', encoding='utf-8') as f:
                    json.dump(existing_data, f, ensure_ascii=False, indent=4)
                print("✅ تم رصد فرصة وتحديث ملف data.json بنجاح!")
            else:
                print("ℹ️ التنبيه موجود مسبقاً في الملف، لم يتم التكرار.")
                
    except Exception as e:
        print(f"❌ حدث خطأ أثناء تشغيل البوت: {e}")

# تشغيل البوت
analyze_crypto_market()