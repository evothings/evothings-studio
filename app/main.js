'use strict';

const VERSION = '2.1.0 alpha3'

const electron = require('electron')
const Menu = electron.Menu
const MenuItem = electron.MenuItem
const Shell = electron.shell
const dialog = electron.dialog
const ipcMain = electron.ipcMain
const app = electron.app
const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// A global object makes it easy to reach functions here via Electron remote
global.main = {}

var mWorkbenchWindow = null
var viewersWindow = null

main.addMenu = function() {
  var template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New App...',
          role: 'newapp',
          click: function() { mainWindow.webContents.send('command', {message: 'newApp'}) }
        },
        {
          label: 'Getting Started',
          role: 'gettingstarted',
          click: function() { mainWindow.webContents.send('command', {message: 'gettingStarted'}) }
        },
        {
          label: 'Share in Social Media',
          role: 'shareinsocialmedia',
          click: function() { mainWindow.webContents.send('command', {message: 'shareInSocialMedia'}) }
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: function() { app.quit(); }
        }
      ]
    },
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
        {
          type: 'separator'
        },
        {
          label: 'Settings',
          role: 'settings',
          click: function() { mainWindow.webContents.send('command', {message: 'openSettingsDialog'}) }
        }
      ]
    },
    {
      label: 'Viewers',
      role: 'viewers',
      submenu: [
        {
          label: 'Disconnect all Viewers',
          role: 'disconnectallviewers',
          click: function() { mainWindow.webContents.send('command', {message: 'disconnectAllViewers'}) }
        }
      ]
    },
    {
      label: 'Tools',
      role: 'tools',
      submenu: [
        {
          label: 'JavaScript Console',
          accelerator: 'CmdOrCtrl+J',
          role: 'javacriptconsole',
          click: function() { mainWindow.webContents.send('command', {message: 'openToolsWorkbenchWindow'}) }
        },
        {
          label: 'Viewers Explorer',
          accelerator: 'CmdOrCtrl+E',
          role: 'viewersexplorer',
          click: function() { mainWindow.webContents.send('command', {message: 'openViewersWindow'}) }
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
        }
      ]
    },
    {
      label: 'Documentation',
      role: 'documentation',
      submenu: [
        {
          label: 'Index',
          click: function() { Shell.openExternal('https://evothings.com/doc/') }
        },
        {
          label: 'Examples',
          click: function() { Shell.openExternal('https://evothings.com/doc/examples/examples.html') }
        },
        {
          label: 'ECMAScript 6',
          click: function() { Shell.openExternal('https://evothings.com/doc/tutorials/ecmascript6.html') }
        },
        {
          label: 'Frequently Asked Questions',
          click: function() { Shell.openExternal('https://evothings.com/doc/faq/faq.html') }
        }
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Chat on Gitter',
          click: function() { Shell.openExternal('https://gitter.im/evothings/evothings') }
        },
        {
          label: 'Forum',
          click: function() { Shell.openExternal('https://evothings.com/forum/') }
        },
        {
          label: 'Feedback',
          click: function() { Shell.openExternal('https://evothings.com/feedback/') }
        },
        {
          label: 'Release Notes',
          click: function() { Shell.openExternal('https://evothings.com/doc/studio/release-notes.html') }
        },
        {
          type: 'separator'
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
        {
          type: 'separator'
        },
        {
          label: 'About Evothings Studio',
          click: function() { dialog.showMessageBox({
            type: "info",
            title: "Evothings Studio " + VERSION,
            buttons: ["Close"],
            message: "Evothings Studio " + VERSION,
            detail: "Evothings Studio is a development environment tailored for making hybrid mobile apps in the IoT domain.\n" +
              "\nElectron: " + process.versions['electron'] +
              "\nChrome: " + process.versions['chrome'] +
              "\nNode: " + process.versions['node'] +
              "\nLicense: Apache License version 2.0" +
              "\n\nCopyright (c) 2016 Evothings AB"}) }
        }
      ]
    },
  ];

  if (process.platform == 'darwin') {
    var name = app.getName();
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

    mWorkbenchWindow.on('closed', function() {
      mWorkbenchWindow = null;
    });

    mWorkbenchWindow.loadURL('file://' + __dirname + '/hyper/ui/tools-window.html')
    mWorkbenchWindow.center()
    mWorkbenchWindow.show()
  }
}

main.openViewersWindow = function() {
  if (viewersWindow) {
    viewersWindow.show()
  } else {
    viewersWindow = new BrowserWindow({
      title: 'Javascript Tools',
      width: 800,
      height: 600,
      show: false
    })

    viewersWindow.on('closed', function() {
      viewersWindow = null;
    });

    viewersWindow.loadURL('file://' + __dirname + '/hyper/ui/hyper-viewers.html')
    viewersWindow.center()
    viewersWindow.show()
  }
}

// We like to reach these via remote for saving position and extent etc
main.getToolsWorkbenchWindow = function() {
  return mWorkbenchWindow;
}

main.getWorkbenchWindow = function() {
  return mainWindow;
}

main.getViewersWindow = function() {
  return viewersWindow;
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
