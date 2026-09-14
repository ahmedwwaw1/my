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
      // تنفيذ العمليات المعقدة عبر PowerShell مع إجبار ترميز UTF-8
      const psCommand = `$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`;
      exec(psCommand, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
        if (error && !cmdClean.includes('stop-')) {
          resolve(`❌ خطأ PowerShell: ${stdout || stderr || error.message}`);
          return;
        }
        resolve(stdout || stderr || "✅ تم التنفيذ بنجاح (PowerShell Engine).");
      });
    } else {
      // ⚡ محرك CMD السريع: مع إجبار ترميز UTF-8 (Code Page 65001)
      const cmdCommand = `chcp 65001 > nul && ${command}`;
      exec(cmdCommand, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
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
  } catch (e) {
    return { error: `❌ Error reading file: ${e.message}` };
  }
});

ipcMain.handle('fs-write', async (event, payload) => {
  try {
    fs.writeFileSync(payload.path, payload.content);
    return "✅ File written successfully (Native FS Engine).";
  } catch (e) {
    return { error: `❌ Error writing file: ${e.message}` };
  }
});

ipcMain.handle('fs-list', async (event, dirPath) => {
  try {
    const target = dirPath || '.';
    const files = fs.readdirSync(target);
    const result = files.map(f => {
      try {
        const fullPath = path.join(target, f);
        const isDirectory = fs.statSync(fullPath).isDirectory();
        return `${isDirectory ? '📁' : '📄'} ${f}`;
      } catch (e) { return `📄 ${f} (access denied)`; }
    }).join('\n');
    return result || "📁 (Empty directory)";
  } catch (e) {
    return { error: `❌ Error listing directory: ${e.message}` };
  }
});

ipcMain.handle('ping', async () => {
  return "pong";
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
