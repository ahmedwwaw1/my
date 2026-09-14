const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// هذا السكربت يقوم بضغط المجلد إلى ملف واحد (Tarball)
// لأن Node.js المدمج يدعم .tar.gz بشكل أفضل من .zip
const { execSync } = require('child_process');

console.log('جاري ضغط المجلد...');

try {
    // استخدام أمر tar المدمج في معظم الأنظمة
    execSync('tar -czf Mastermind_Desktop.tar.gz Mastermind_Desktop');
    console.log('✅ تم الضغط بنجاح! الملف الناتج: Mastermind_Desktop.tar.gz');
} catch (err) {
    console.error('خطأ أثناء الضغط:', err.message);
}
