import ccxt
import json
import os
from datetime import datetime

# إعدادات الأهداف السعرية المحددة (Price Targets)
PRICE_TARGETS = {
    'BTC/USDT': {'target': 80000.0, 'side': 'above'},
    'ETH/USDT': {'target': 3000.0, 'side': 'above'},
    'SOL/USDT': {'target': 100.0, 'side': 'above'},
    'BNB/USDT': {'target': 700.0, 'side': 'above'}
}

def analyze_crypto_market():
    """
    جلب بيانات العملات وتحديث ملف crypto_alerts.json مع دعم إضافي لتحليل التقلب (Volatility)
    وفحص الأهداف السعرية المحددة.
    """
    try:
        # استخدام منصة KuCoin لتجنب الحظر الجغرافي لـ GitHub الأمريكي
        exchange = ccxt.kucoin()
        
        # العملات المراد مراقبتها
        symbols = list(PRICE_TARGETS.keys())
        
        alerts = []
        
        for symbol in symbols:
            try:
                # جلب البيانات الأخيرة
                ticker = exchange.fetch_ticker(symbol)
                
                volume = ticker['quoteVolume']  # حجم التداول بالـ USDT
                price = ticker['last']  # السعر الحالي
                change_percent = ticker['percentage']  # نسبة التغيير
                high_24h = ticker.get('high', price)
                low_24h = ticker.get('low', price)

                # حساب مؤشر التقلب البسيط (نطاق التغير خلال 24 ساعة)
                volatility = round(((high_24h - low_24h) / price) * 100, 2) if price > 0 else 0
                
                # 🎯 فحص الأهداف السعرية
                target_info = PRICE_TARGETS.get(symbol)
                category = None

                if target_info:
                    target_price = target_info['target']
                    side = target_info['side']

                    hit = False
                    if side == 'above' and price >= target_price:
                        hit = True
                    elif side == 'below' and price <= target_price:
                        hit = True

                    if hit:
                        print(f"🚀 تم الوصول للهدف السعري! {symbol}: {price} (الهدف: {target_price})")
                        category = "price_target_hit"
                    else:
                        # إذا لم يضرب الهدف، نتحقق من حجم التداول كشرط بديل
                        category = "high_volume_with_analytics" if volume > 10000000 else None

                # الشرط: إذا كان حجم التداول أكثر من 10 مليون أو تم ضرب الهدف
                if category:
                    new_alert = {
                        "symbol": symbol,
                        "price": price,
                        "volume": round(volume, 2),
                        "change_percent": round(change_percent, 2),
                        "volatility": volatility,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "category": category,
                        "target_hit": (category == "price_target_hit")
                    }
                    alerts.append(new_alert)
                    print(f"✅ تنبيه مطور: {symbol} - السعر: {price} - الفئة: {category}")
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
    في كلا المسارين (المجلد الخاص بالبوت والمجلد الرئيسي للموقع) لضمان الربط التام.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. المسار الأول: ScriptBot/ScriptBot json/crypto_alerts.json
    target_dir_bot = os.path.join(current_dir, '..', 'ScriptBot json')
    os.makedirs(target_dir_bot, exist_ok=True)
    file_path_bot = os.path.join(target_dir_bot, 'crypto_alerts.json')
    
    # 2. المسار الثاني: بيانات موقعي json/crypto_alerts.json (ليقرأه موقع الويب)
    target_dir_web = os.path.join(current_dir, '..', '..', 'بيانات موقعي json')
    os.makedirs(target_dir_web, exist_ok=True)
    file_path_web = os.path.join(target_dir_web, 'crypto_alerts.json')
    
    existing_data = []
    
    # قراءة البيانات القديمة إن وجدت من المسار الأساسي
    if os.path.exists(file_path_bot):
        with open(file_path_bot, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except json.JSONDecodeError:
                existing_data = []
    
    today_date = datetime.now().strftime('%Y-%m-%d')
    
    # إضافة التنبيهات الجديدة مع منع التكرار لكل عملة في نفس اليوم
    for alert in new_alerts:
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
    
    # الاحتفاظ بآخر تنبيهين فقط
    existing_data = existing_data[:2]
    
    # حفظ الملف في المسار الأول (ScriptBot json)
    with open(file_path_bot, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
    print(f"📁 تم الحفظ في بوت المجلد: {file_path_bot}")
    
    # حفظ النسخة المطابقة في مسار موقع الويب (بيانات موقعي json)
    with open(file_path_web, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
    print(f"🌐 تم تحديث نسخة الموقع في: {file_path_web}")

# 🚀 السطرين السحريين لتشغيل البوت فوراً عند استدعاء الملف
if __name__ == '__main__':
    analyze_crypto_market()
