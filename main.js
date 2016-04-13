'use strict';

const VERSION = '2.1.0 alpha3';
const electron = require('electron');

const Menu = electron.Menu;
const MenuItem = electron.MenuItem;
const ipcMain = electron.ipcMain;

// Module to control application life
const app = electron.app;

// Module to create native browser windows
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// A global object makes it easy to reach functions here via Electron remote
global.main = {}

var mWorkbenchWindow = null;

main.addMenu = function() {
  var template = [
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: (function() {
            if (process.platform == 'darwin')
              return 'Ctrl+Command+F';
            else
              return 'F11';
          })(),
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: (function() {
            if (process.platform == 'darwin')
              return 'Alt+Command+I';
            else
              return 'Ctrl+Shift+I';
          })(),
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.toggleDevTools();
          }
        },
      ]
    },
    {
      label: 'Documentation',
      role: 'doc',
      submenu: [
        {
          label: 'Getting Started',
          accelerator: 'CmdOrCtrl+G',
          role: 'gettingstarted'
        },
        {
          label: 'Disconnect all viewers',
          accelerator: 'CmdOrCtrl+D',
          role: 'disconnect'
        },
      ]
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        },
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: function() { require('electron').shell.openExternal('http://electron.atom.io') }
        },
      ]
    },
  ];

  if (process.platform == 'darwin') {
    var name = require('electron').remote.app.getName();
    template.unshift({
      label: name,
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + name,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { app.quit(); }
        },
      ]
    });
    // Window menu.
    template[3].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    );
  }

  var menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

main.createMainWindow = function() {
  mainWindow = new BrowserWindow({
    title: 'Evothings Workbench ' + VERSION,
    icon: 'hyper/ui/images/app-icon.png',
    width: 800, height: 600, webSecurity: false});

  mainWindow.loadURL('file://' + __dirname + '/hyper/ui/index.html');
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  main.addMenu();
}

main.openToolsWorkbenchWindow = function() {
  if (mWorkbenchWindow) {
    mWorkbenchWindow.show()
  } else {
    mWorkbenchWindow = new BrowserWindow({
      title: 'Javascript Tools',
      width: 800,
      height: 600,
      show: false
    })
    mWorkbenchWindow.webContents.openDevTools();

    mWorkbenchWindow.on('closed', function() {
      mWorkbenchWindow = null;
    });

    mWorkbenchWindow.loadURL('file://' + __dirname + '/hyper/ui/tools-window.html')
    mWorkbenchWindow.center()
    mWorkbenchWindow.show()
  }
}

// We like to reach these via remote for saving position and extent etc
main.getToolsWorkbenchWindow = function() {
  return mWorkbenchWindow;
}

main.getWorkbenchWindow = function() {
  return mainWindow;
}

// Work as relay between our BrowserWindows since they can not talk to
// each other directly. We simply have one relay handler per window.
ipcMain.on('workbench-window', function(event, arg) {
  if (mainWindow) {
    mainWindow.webContents.send('msg', arg);
  }
});
ipcMain.on('tools-workbench-window', function(event, arg) {
  if (mWorkbenchWindow) {
    mWorkbenchWindow.webContents.send('msg', arg);
  }
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', main.createMainWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createMainWindow();
  }
});
