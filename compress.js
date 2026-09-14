const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const sourceDir = 'Mastermind_Desktop';
const outputZip = 'Mastermind_Desktop.zip';

console.log('جاري ضغط المجلد باستخدام أدوات النظام...');

// التحقق من وجود المجلد
if (!fs.existsSync(sourceDir)) {
    console.error(`خطأ: المجلد ${sourceDir} غير موجود.`);
    process.exit(1);
}

// استخدام أمر zip المدمج في بيئات Linux/GitHub
exec(`zip -r ${outputZip} ${sourceDir}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`فشل الضغط: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`تنبيه: ${stderr}`);
    }
    console.log(`✅ تم ضغط المجلد بنجاح إلى: ${outputZip}`);
});
