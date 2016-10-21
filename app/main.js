'use strict';

// A global object makes it easy to reach windows and functions
// from BrowserWindows via Electron remote
global.main = {}

// Version
main.MAJOR = 2
main.MINOR = 2
main.PATCH = 0
// Disabled for a real release:
main.BUILD = "beta1"

// This one is burned in by scripts
main.TIMESTAMP = '<timestamp>'

// Don't edit below
main.VERSION = main.MAJOR + '.' + main.MINOR
main.FULLVERSION = main.VERSION + '.' + main.PATCH
if (main.BUILD) {
  main.FULLVERSION = main.FULLVERSION + '-' + main.BUILD
}
main.BASE = 'https://evothings.com/' + main.VERSION
main.DOC = main.BASE + "/doc"
main.NEWS = main.BASE + "/news"
main.EXAMPLES = main.BASE + "/examples"
main.LIBRARIES = main.BASE + "/libraries"
main.BUILDS = main.BASE + "/builds"
main.PLUGINS = main.BASE + "/plugins"
main.TRANSLATIONS = main.BASE + '/translations'

main.limits = 'Not yet available'

// Fix for accessing vagrant, virtualbox and vscode that usually installs in /usr/local/bin
// When OSX runs a UI app it often seems to only include core bin PATHs and not user .profile paths.
if (process.platform == 'darwin') {
  if (!process.env['PATH'].includes('/usr/local/bin')) {
    process.env['PATH'] += ':/usr/local/bin'
  }
}

const electron = require('electron')
const app = electron.app
const DIALOG = electron.dialog;
const UTIL = require('./hyper/util/util.js')

// We don't really want caching since it can serve stale examples and libraries
app.commandLine.appendSwitch('disable-http-cache', 'true');

// First we need to handle Squirrel installer events and exit fast.
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};


// Some more things we want
const Menu = electron.Menu
const MenuItem = electron.MenuItem
const Shell = electron.shell
const dialog = electron.dialog
const ipcMain = electron.ipcMain
const BrowserWindow = electron.BrowserWindow


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
          type: 'separator'
        },
        {
          label: 'Settings...',
          click: function() { main.workbenchWindow.webContents.send('command', {message: 'openSettingsDialog'}) }
        },
        {
          type: 'separator'
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
          click: function() { Shell.openExternal(main.DOC) }
        },
        {
          label: 'Examples',
          click: function() { Shell.openExternal(main.DOC + '/examples/examples.html') }
        },
        {
          label: 'ECMAScript 6',
          click: function() { Shell.openExternal(main.DOC + '/tutorials/ecmascript6.html') }
        },
        {
          label: 'Release Notes',
          click: function() { Shell.openExternal(main.DOC + '/studio/release-notes.html') }
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
          label: 'Support',
          submenu: [
            {
              label: 'Discussions',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/support/discussions') }
            },
            {
              label: 'Feedback',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/support/discussions/topics/new?forum_id=14000130317') }
            },
            {
              label: 'Feature Request',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/support/discussions/topics/new?forum_id=14000128400') }
            },
            {
              type: 'separator'
            },
            {
              label: 'Knowledge Base',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/support/solutions') }
            },
            {
              label: 'Frequently Asked Questions',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/solution/folders/14000103190') }
            },
            {
              label: 'New Support Ticket',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/support/tickets/new') }
            },
            {
              label: 'My Tickets',
              click: function() { Shell.openExternal('https://evothings.freshdesk.com/support/tickets') }
            },
          ]
        },
        {
          label: 'Old forum',
          click: function() { Shell.openExternal('https://evothings.com/forum/') }
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
            title: "Evothings Studio " + main.FULLVERSION,
            buttons: ["Close"],
            message: "Evothings Studio " + main.FULLVERSION,
            detail: "Evothings Studio is a development environment tailored for making hybrid mobile apps in the IoT domain.\n" +
              "\nBuilt: " + main.TIMESTAMP +
              "\nElectron: " + process.versions['electron'] +
              "\nChrome: " + process.versions['chrome'] +
              "\nNode: " + process.versions['node'] +
              "\n\nLimits: " + main.limits +
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

//
//  TODO: Create a generic way to hold app state
//
main.setCurrentViewers = function(data)
{
  main.currentViewers = data
}

main.getCurrentViewers = function()
{
  return main.currentViewers
}
//
//
//

main.getRootDir = function() {
  return __dirname
}

main.createWorkbenchWindow = function() {
  main.workbenchWindow = new BrowserWindow({
    title: 'Evothings Studio ' + main.FULLVERSION + ' - Workbench',
    icon: 'hyper/ui/images/app-icon.png',
    width: 850, height: 720, webSecurity: false, show: false
  });

  main.workbenchWindow.on('closed', function() {
    main.workbenchWindow = null;
  });
  
  main.workbenchWindow.loadURL('file://' + __dirname + '/hyper/ui/index.html');
  main.addMenu();
  main.workbenchWindow.center()
}
main.showWorkbenchWindow = function() {
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
  }
}
main.showConsoleWindow = function() {
  main.consoleWindow.show()
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

  }
}
main.showViewersWindow = function() {
  main.viewersWindow.show()
}

main.selectOrCreateFolder = function(title, defaultDir) {
  return DIALOG.showOpenDialog({ title: title,
        defaultPath: defaultDir, properties: [ 'openDirectory', 'createDirectory']})
}

main.openDialog = function(title, content, type) {
  console.log('openDialog called title = '+title+', content = '+content)
  DIALOG.showMessageBox(
  {
    type: type || "info",
    title: title,
    /*message:content,*/
    buttons: ["Close"],
    detail: UTIL.translate(content)
  })
}

main.openWorkbenchDialog = function(title, message, details, type, butts) {
  var buttons = butts || ["Close"]
  var index = DIALOG.showMessageBox(
    main.workbenchWindow,
    {
      type: type || "info",
      title: title,
      message: message,
      buttons: buttons,
      detail: UTIL.translate(details)
    })
  return buttons[index]
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
  //console.log("Subscribed window " + windowID + " to " + channel)
  // We don't want to add null as windowID...
  if (windowID) {
    listeners.add(windowID)
  }
  main.listeners[channel] = listeners
});
ipcMain.on('events-unsubscribe', function(event, channel, windowID) {
  var listeners = main.listeners[channel]
  if (listeners && windowID) {
    listeners.delete(windowID)
    console.log("Unsubscribed window " + windowID + " from " + channel)
  }
});
// Forward the event to all registered windows for this channel
ipcMain.on('events-publish', function(event, channel, obj) {
  var listeners = main.listeners[channel]
  //console.log("Published "+ JSON.stringify(obj) + " to " + JSON.stringify(channel))
  if (listeners) {
    for (let windowID of listeners) {
      if (windowID) {
        var window = BrowserWindow.fromId(windowID)
        if (window) {
          //console.log("Sending " + JSON.stringify(obj) + " to " + channel + " in window " + windowID)
          window.webContents.send('events-event', channel, obj);
        }
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
    main.createWorkbenchWindow();
  }
});
