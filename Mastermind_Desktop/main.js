const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#171717',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.loadFile('index.html');
}

// --- [الجسر المدمج: معالجة طلبات النظام] ---

ipcMain.handle('os-command', async (event, command) => {
  return new Promise((resolve) => {
    const cmdClean = command.toLowerCase().trim();

    // 🚀 ذكاء التشغيل الفوري: إذا كان الأمر يبدأ بـ start، نستخدم الإطلاق المستقل لضمان ظهور النافذة
    if (cmdClean.startsWith('start ')) {
      const { spawn } = require('child_process');
      const appName = command.substring(6).trim();
      const child = spawn('cmd.exe', ['/c', 'start', '""', appName], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      resolve(`🚀 تم إرسال أمر التشغيل لـ [${appName}] بشكل مستقل (CMD Engine). ستظهر النافذة الآن.`);
      return;
    }

    // 🛡️ فلتر القوة: تحديد ما إذا كان الأمر يحتاج فعلاً لـ PowerShell
    const psKeywords = ['$', '|', 'get-', 'set-', 'stop-', 'start-process', 'powershell', 'expand-archive', 'compress-archive'];
    const isPowerShellRequest = psKeywords.some(kw => cmdClean.includes(kw));

    if (isPowerShellRequest) {
      // تنفيذ العمليات المعقدة عبر PowerShell
      exec(command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
        if (error && !cmdClean.includes('stop-')) {
          resolve(`❌ خطأ PowerShell: ${stdout || stderr || error.message}`);
          return;
        }
        resolve(stdout || stderr || "✅ تم التنفيذ بنجاح (PowerShell Engine).");
      });
    } else {
      // ⚡ محرك CMD السريع: هو المحرك الافتراضي للعمليات الأساسية
      exec(command, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
        if (error) {
          if (cmdClean.includes('taskkill')) {
            // تحديث ذكي: لا نعطي نجاحاً وهمياً، بل نطلب التأكد من الاسم الحقيقي للعملية
            resolve(`⚠️ تنبيه: لم يتم العثور على العملية. في ويندوز الحديث، قد تختلف الأسماء (مثلاً الحاسبة هي CalculatorApp.exe). يرجى البحث أولاً باستخدام 'tasklist | findstr /i "name"'.`);
            return;
          }
          resolve(`❌ خطأ CMD: ${stdout || stderr || error.message}`);
          return;
        }
        resolve(stdout || stderr || `✅ تم التنفيذ بنجاح (CMD Engine).`);
      });
    }
  });
});

ipcMain.handle('fs-read', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) { return `❌ فشل القراءة: ${e.message}`; }
});

ipcMain.handle('fs-write', async (event, { path: filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return "✅ تم الحفظ بنجax.";
  } catch (e) { return `❌ فشل الحفظ: ${e.message}`; }
});

ipcMain.handle('fs-list', async (event, dirPath) => {
  try {
    const targetPath = dirPath || '.';
    console.log(`Listing directory: ${targetPath}`);
    if (!fs.existsSync(targetPath)) return `❌ المسار غير موجود: ${targetPath}`;
    const files = fs.readdirSync(targetPath);
    return files.join('\n');
  } catch (e) { return `❌ فشل سرد الملفات: ${e.message}`; }
});

ipcMain.handle('ping', async () => {
  return "pong";
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
