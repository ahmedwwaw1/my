const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname, 'Mastermind_Desktop');
const outputZip = path.join(__dirname, 'Mastermind_Desktop.zip');

console.log('بدء عملية الضغط...');

// محاولة استخدام أمر النظام الافتراضي للضغط
try {
    if (process.platform === 'win32') {
        execSync(`powershell Compress-Archive -Path "${sourceDir}" -DestinationPath "${outputZip}" -Force`);
    } else {
        execSync(`zip -r "${outputZip}" "Mastermind_Desktop"`);
    }
    console.log('تم الضغط بنجاح باستخدام أوامر النظام!');
} catch (error) {
    console.log('فشلت أوامر النظام، جاري المحاولة عبر Node.js...');
    // إذا لم تنجح أوامر النظام، يمكن استخدام مكتبة مدمجة أو إشعار المستخدم
    console.error('يرجى تشغيل السكربت في بيئة تدعم PowerShell أو zip.');
}
