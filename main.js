/**
 * VSA Mastermind - Desktop Kernel
 * --------------------------------------------------
 * هذا الملف هو قلب تطبيق سطح المكتب، يدير النوافذ ويمنح صلاحيات النظام.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// تحديد مسار بيانات المستخدم في نفس مجلد البرنامج لتجنب أخطاء الصلاحيات
const userDataPath = path.join(__dirname, 'app_data');
if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath);
app.setPath('userData', userDataPath);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "VSA Mastermind - Desktop Edition",
        icon: path.join(__dirname, 'favicon.ico'), // إذا كان لديك أيقونة
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // تحميل ملف الواجهة الأساسي
    win.loadFile('index.html');

    // فتح أدوات المطور (اختياري)
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- [قنوات الاتصال المباشر بنظام الويندوز] ---

// 1. تنفيذ أوامر PowerShell/CMD
ipcMain.handle('os-command', async (event, command) => {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            resolve({ output: stdout, error: stderr || error?.message });
        });
    });
});

// 2. سرد الملفات المحلية (رادار الويندوز المدمج)
ipcMain.handle('list-local-files', async (event, dirPath) => {
    return new Promise((resolve) => {
        fs.readdir(dirPath || '.', { withFileTypes: true }, (err, files) => {
            if (err) return resolve({ error: err.message });
            const result = files.map(f => ({ name: f.name, type: f.isDirectory() ? 'dir' : 'file' }));
            resolve(result);
        });
    });
});
