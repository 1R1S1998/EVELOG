const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// 保持对主窗口的全局引用，否则当JavaScript对象被垃圾回收时，窗口会自动关闭
let mainWindow;

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'EVE Online Log Analyzer',
        icon: path.join(__dirname, 'build', 'icon.ico')
    });

    // 加载应用的index.html
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'templates', 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // 打开开发者工具
    // mainWindow.webContents.openDevTools();

    // 当窗口关闭时触发
    mainWindow.on('closed', function () {
        // 取消引用窗口对象，如果你的应用支持多窗口，通常会把所有窗口存储在一个数组中，
        // 与此同时，你应该删除相应的元素。
        mainWindow = null;
    });
}

// Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', createWindow);

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', function () {
    // 在macOS上，除非用户用Cmd+Q明确退出，否则应用及其菜单栏会保持活动状态
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，通常会在应用中重新创建一个窗口
    if (mainWindow === null) {
        createWindow();
    }
});

// 可以在这个文件中包括应用的其他主要进程代码
// 也可以将它们放在单独的文件中并在此处引入
