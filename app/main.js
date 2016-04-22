'use strict';

const VERSION = '2.1.0-alpha6'

const electron = require('electron')
const Menu = electron.Menu
const MenuItem = electron.MenuItem
const Shell = electron.shell
const dialog = electron.dialog
const ipcMain = electron.ipcMain
const app = electron.app
const BrowserWindow = electron.BrowserWindow


// A global object makes it easy to reach windows and functions
// from BrowserWindows via Electron remote
global.main = {}

// Keeping track of Windows (windowID) listening to each channel
main.listeners = new Map()

main.addMenu = function() {
  var template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New App...',
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'newApp'}) }
        },
        {
          label: 'Getting Started',
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'gettingStarted'}) }
        },
        {
          label: 'Share in Social Media',
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'shareInSocialMedia'}) }
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
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'openSettingsDialog'}) }
        }
      ]
    },
    {
      label: 'Viewers',
      submenu: [
        {
          label: 'Disconnect all Viewers',
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'disconnectAllViewers'}) }
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
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'openConsoleWindow'}) }
        },
        {
          label: 'Viewers Explorer',
          accelerator: 'CmdOrCtrl+E',
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'openViewersWindow'}) }
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
    template.unshift({
      label: 'Evothings Studio',
      submenu: [
        /*{
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },*/
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide Evothings Studio',
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
        }
      ]
    })
    // Window menu.
    template[5].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    );
  } else {
    // Quit for Linux/Windows
    template[0].submenu.push(
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: function() { app.quit(); }
      }
    )
  }

  var menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

main.getAppPath = function() {
  return app.getAppPath()
}

main.createWorkbenchWindow = function() {
  main.workbenchWindow = new BrowserWindow({
    title: 'Evothings Workbench ' + VERSION,
    icon: 'hyper/ui/images/app-icon.png',
    width: 800, height: 600, webSecurity: false
  });

  main.workbenchWindow.on('closed', function() {
    main.workbenchWindow = null;
  });
  
  main.workbenchWindow.loadURL('file://' + __dirname + '/hyper/ui/index.html');
  main.addMenu();
  main.workbenchWindow.center()
  main.workbenchWindow.show()
}

main.openConsoleWindow = function() {
  if (main.consoleWindow) {
    main.consoleWindow.show()
  } else {
    main.consoleWindow = new BrowserWindow({
      title: 'Javascript Console',
      width: 800,
      height: 600,
      show: false
    })

    main.consoleWindow.on('closed', function() {
      main.consoleWindow = null;
    });

    main.consoleWindow.loadURL('file://' + __dirname + '/hyper/ui/tools-window.html')
    main.consoleWindow.center()
    main.consoleWindow.show()
  }
}

main.openViewersWindow = function() {
  if (main.viewersWindow) {
    main.viewersWindow.show()
  } else {
    main.viewersWindow = new BrowserWindow({
      title: 'Viewers Explorer',
      width: 800,
      height: 600,
      show: false
    })

    main.viewersWindow.on('closed', function() {
      main.viewersWindow = null;
    });

    main.viewersWindow.loadURL('file://' + __dirname + '/hyper/ui/hyper-viewers.html')
    main.viewersWindow.center()
    main.viewersWindow.show()
  }
}


// Work as relay between our BrowserWindows since they can not talk to
// each other directly. We simply have one relay handler per window.
ipcMain.on('workbench-window', function(event, arg) {
  if (main.workbenchWindow) {
    main.workbenchWindow.webContents.send('msg', arg);
  }
});
ipcMain.on('console-window', function(event, arg) {
  if (main.consoleWindow) {
    main.consoleWindow.webContents.send('msg', arg);
  }
});
ipcMain.on('viewers-window', function(event, arg) {
  if (main.viewersWindow) {
    main.viewersWindow.webContents.send('msg', arg);
  }
});

// This is yet another means of communicating between BrowserWindows
// but using a publish subscribe model, this was the previous EVENTS module
ipcMain.on('events-subscribe', function(event, channel, windowID) {
  var listeners = main.listeners[channel] || new Set()
  console.log("Subscribed window " + windowID + " to " + channel)
  listeners.add(windowID) 
  main.listeners[channel] = listeners
});
ipcMain.on('events-unsubscribe', function(event, channel, windowID) {
  var listeners = main.listeners[channel]
  if (listeners) {
    listeners.delete(windowID)
    console.log("Unsubscribed window " + windowID + " from " + channel)
  }
});
// Forward the event to all registered windows for this channel
ipcMain.on('events-publish', function(event, channel, obj) {
  var listeners = main.listeners[channel]
  console.log("Published "+ JSON.stringify(obj) + " to " + JSON.stringify(channel))
  if (listeners) {
    for (let windowID of listeners) {
      var window = BrowserWindow.fromId(windowID)
      if (window) {
        console.log("Sending " + JSON.stringify(obj) + " to " + channel + " in window " + windowID)
        window.webContents.send('events-event', channel, obj);
      }
    }
  }
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', main.createWorkbenchWindow);

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
  if (main.workbenchWindow === null) {
    app.createWorkbenchWindow();
  }
});
