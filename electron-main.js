const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// تشغيل السيرفر
function startServer() {
    return new Promise((resolve) => {
        serverProcess = spawn('node', ['server.js'], {
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        // انتظار تشغيل السيرفر
        setTimeout(() => {
            resolve();
        }, 3000);
    });
}

async function createWindow() {
    // تشغيل السيرفر أولاً
    await startServer();
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        },
        titleBarStyle: 'default',
        show: false,
        title: 'نظام إدارة المتاجر - CodeVia'
    });

    // تحميل الصفحة
    mainWindow.loadURL('http://localhost:3000');
    
    // إظهار النافذة عند الانتهاء من التحميل
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // إنشاء قائمة مخصصة بدلاً من إزالتها
    const template = [
        {
            label: 'أدوات',
            submenu: [
                {
                    label: 'أدوات المطور',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                {
                    label: 'إعادة تحميل',
                    accelerator: 'F5',
                    click: () => {
                        mainWindow.webContents.reload();
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// عند تشغيل التطبيق
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// عند إغلاق التطبيق
app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// إغلاق السيرفر عند إنهاء التطبيق
app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
});