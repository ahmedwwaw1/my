import ccxt
import json
import os
from datetime import datetime

def analyze_crypto_market():
    """
    جلب بيانات العملات من Binance وتحديث ملف crypto_alerts.json
    """
    try:
        # إنشاء اتصال مع بينانس (بدون API keys للبيانات العامة)
        exchange = ccxt.kucoin()
        
        # العملات المراد مراقبتها
        symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT']
        
        alerts = []
        
        for symbol in symbols:
            try:
                # جلب البيانات الأخيرة
                ticker = exchange.fetch_ticker(symbol)
                
                volume = ticker['quoteVolume']  # حجم التداول
                price = ticker['last']  # السعر الحالي
                change_percent = ticker['percentage']  # نسبة التغيير
                
                # الشرط: إذا كان حجم التداول أكثر من 10 مليون (تعديل)
                if volume > 10000000:
                    new_alert = {
                        "symbol": symbol,
                        "price": price,
                        "volume": round(volume, 2),
                        "change_percent": round(change_percent, 2),
                        "timestamp": datetime.now().isoformat(),
                        "category": "high_volume"
                    }
                    alerts.append(new_alert)
                    print(f"✅ تنبيه: {symbol} - السعر: {price} - الحجم: {volume}")
            
            except Exception as e:
                print(f"⚠️ خطأ في جلب بيانات {symbol}: {e}")
                continue
        
        # حفظ البيانات الجديدة
        if alerts:
            save_alerts(alerts)
        else:
            print("ℹ️ لا توجد تنبيهات جديدة الآن")
    
    except Exception as e:
        print(f"❌ خطأ في تحليل السوق: {e}")

def save_alerts(new_alerts):
    """
    حفظ التنبيهات الجديدة في crypto_alerts.json مع تجنب التكرار
    """
    file_name = 'crypto_alerts.json'
    existing_data = []
    
    # قراءة البيانات القديمة
    if os.path.exists(file_name):
        with open(file_name, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except json.JSONDecodeError:
                existing_data = []
    
    # إضافة التنبيهات الجديدة مع تجنب التكرار
    for alert in new_alerts:
        # التحقق من عدم وجود نفس التنبيه مسبقاً
        is_duplicate = any(
            item.get('symbol') == alert['symbol'] and 
            item.get('timestamp') == alert['timestamp']
            for item in existing_data
        )
        
        if not is_duplicate:
            existing_data.insert(0, alert)
            print(f"✅ تم إضافة تنبيه: {alert['symbol']}")
    
    # الحفاظ على آخر 50 تنبيه فقط
    existing_data = existing_data[:50]
    
    # حفظ الملف محلياً
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 تم حفظ {len(existing_data)} تنبيه في {file_name}")

# 🎯 تشغيل البرنامج مرة واحدة فقط (بدون حلقة لانهائية)
if __name__ == "__main__":
    print("🤖 بدء تحليل السوق...")
    print(f"⏰ الوقت: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    analyze_crypto_market()
    print("✅ انتهى التحليل")
