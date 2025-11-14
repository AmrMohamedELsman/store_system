const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// إنشاء النافذة الرئيسية
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'نظام إدارة المحل',
    show: false
  });

  // تحميل الصفحة الرئيسية
  mainWindow.loadURL('http://localhost:3000');

  // فتح أدوات المطور تلقائياً في وضع التطوير
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // إضافة مستمع للاختصارات
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl+Shift+I أو F12 لفتح أدوات المطور
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
    // Ctrl+R أو F5 لإعادة التحميل
    if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      mainWindow.webContents.reload();
    }
  });

  // إظهار النافذة عندما تكون جاهزة
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // إنشاء قائمة مع خيارات أدوات المطور
  const template = [
    {
      label: 'عرض',
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
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'تكبير',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 1);
          }
        },
        {
          label: 'تصغير',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 1);
          }
        },
        {
          label: 'الحجم الطبيعي',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.setZoomLevel(0);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // التعامل مع إغلاق النافذة
  mainWindow.on('closed', () => {
    mainWindow = null;
    // إيقاف الخادم عند إغلاق التطبيق
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

// بدء تشغيل الخادم
function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      if (data.toString().includes('Server running on port 3000')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // انتظار 3 ثوانٍ كحد أقصى لبدء الخادم
    setTimeout(() => {
      resolve();
    }, 3000);
  });
}

// عند جاهزية التطبيق
app.whenReady().then(async () => {
  try {
    // بدء تشغيل الخادم أولاً
    await startServer();
    // ثم إنشاء النافذة
    createWindow();
  } catch (error) {
    console.error('Error starting server:', error);
    // إنشاء النافذة حتى لو فشل الخادم
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// إنهاء التطبيق عند إغلاق جميع النوافذ (إلا في macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // إيقاف الخادم
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

// التعامل مع إنهاء التطبيق
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});