import ccxt
import json
import os
from datetime import datetime

def analyze_crypto_market():
    """
    جلب بيانات العملات وتحديث ملف crypto_alerts.json
    """
    try:
        # استخدام منصة KuCoin لتجنب الحظر الجغرافي لـ GitHub الأمريكي
        exchange = ccxt.kucoin()
        
        # العملات المراد مراقبتها
        symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT']
        
        alerts = []
        
        for symbol in symbols:
            try:
                # جلب البيانات الأخيرة
                ticker = exchange.fetch_ticker(symbol)
                
                volume = ticker['quoteVolume']  # حجم التداول بالـ USDT
                price = ticker['last']  # السعر الحالي
                change_percent = ticker['percentage']  # نسبة التغيير
                
                # الشرط: إذا كان حجم التداول أكثر من 10 مليون
                if volume > 10000000:
                    new_alert = {
                        "symbol": symbol,
                        "price": price,
                        "volume": round(volume, 2),
                        "change_percent": round(change_percent, 2),
                        "timestamp": datetime.utcnow().isoformat() + "Z", # استخدام UTC مع علامة Z
                        "category": "high_volume"
                    }
                    alerts.append(new_alert)
                    print(f"✅ تنبيه: {symbol} - السعر: {price} - الحجم: {volume}")
            except Exception as e:
                print(f"⚠️ خطأ في جلب بيانات {symbol}: {e}")
                continue
        
        # استدعاء دالة الحفظ في حال وجود تنبيهات
        if alerts:
            save_alerts(alerts)
        else:
            print("ℹ️ لم يتم العثور على أي عملة حققت شرط الحجم المطلق حالياً.")
            
    except Exception as e:
        print(f"❌ خطأ في تحليل السوق: {e}")

def save_alerts(new_alerts):
    """
    حفظ التنبيهات الجديدة في crypto_alerts.json مع تجنب التكرار اليومي
    """
    file_name = 'crypto_alerts.json'
    existing_data = []
    
    # قراءة البيانات القديمة إن وجدت
    if os.path.exists(file_name):
        with open(file_name, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except json.JSONDecodeError:
                existing_data = []
    
    today_date = datetime.now().strftime('%Y-%m-%d')
    
    # إضافة التنبيهات الجديدة مع منع التكرار لكل عملة في نفس اليوم
    for alert in new_alerts:
        # التحقق مما إذا كانت العملة قد أُضيفت بالفعل اليوم
        is_already_added_today = any(
            item.get('symbol') == alert['symbol'] and 
            item.get('timestamp', '').startswith(today_date)
            for item in existing_data
        )
        
        if not is_already_added_today:
            existing_data.insert(0, alert)
            print(f"✅ تم إضافة تنبيه جديد لـ {alert['symbol']} اليوم.")
        else:
            print(f"ℹ️ تنبيه {alert['symbol']} موجود بالفعل لتاريخ اليوم {today_date}. تخطي الإضافة.")
    
    # الاحتفاظ بآخر 50 تنبيه فقط ليبقى الملف خفيفاً ومناسباً للموقع
    existing_data = existing_data[:50]
    
    # كتابة وحفظ الملف بنظام الترميز العام ليعرض اللغة العربية والرموز بشكل صحيح
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

# 🚀 السطرين السحريين لتشغيل البوت فوراً عند استدعاء الملف
if __name__ == '__main__':
    analyze_crypto_market()
