$(function()
{
	var OS = require('os')
	var SETTINGS = require('../settings/settings.js')
	var LOGGER = require('../server/log.js')
	var GUI = require('nw.gui')

	// Main application window
	var mMainWindow = window.opener

	// Editor component.
	var mEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'),
	{
		mode: 'javascript',
		indentUnit: 4,
		autoMatchParens: true,
		lineNumbers: true,
		matchBrackets: true,
		continueComments: 'Enter',
		extraKeys: {'Ctrl-Q': 'toggleComment'}
	})

	// Result/log component.
	var mResult = CodeMirror.fromTextArea(document.getElementById('result-editor'),
	{
	})

	// Flag for toggling autoscroll of log view.
	var mAutoScroll = true

	// Buffer for log when autoscroll is off.
	var mScrollBuffer = null

	$('#button-eval').click(function()
	{
		if (!mMainWindow)
		{
			showResult('ERR: Could not find main window - report to developer')
			return
		}

		if (!mEditor.somethingSelected())
		{
			showResult('Select some code to evaluate')
			return
		}

		var code = mEditor.getSelection()
		mMainWindow.postMessage({ message: 'eval', code: code }, '*')
	})

	// Evaluate in node-webkit. Not used.
	$('#button-eval-node').click(function()
	{
		if (!mMainWindow)
		{
			showResult('ERR: Could not find main window - report to developer')
			return
		}

		if (!mEditor.somethingSelected())
		{
			showResult('Select some code to evaluate')
			return
		}

		try
		{
			var code = mEditor.getSelection()
			// TODO: Add runtime error handling.
			var result = eval(code)
			showResult('NODE: ' + result)
		}
		catch (err)
		{
			showResult('NODE: ' + err)
		}
	})

	$('#button-undo').click(function()
	{
		mEditor.undo()
	})

	$('#button-redo').click(function()
	{
		mEditor.redo()
	})

	$('#button-clear-log').click(function()
	{
		mResult.setValue('')
	})

	$('#button-clear-editor').click(function()
	{
		mEditor.setValue('\n\n\n\n\n\n\n\n\n')
	})

	$('#button-toggle-autoscroll').click(function()
	{
		mAutoScroll = !mAutoScroll
		if (mAutoScroll)
		{
			$('#button-toggle-autoscroll').text('AutoScroll On')
			showScrollBuffer()
		}
		else
		{
			$('#button-toggle-autoscroll').text('AutoScroll Off')
		}
	})

	$('#button-restore').click(function()
	{
		restoreState()
	})

	/*
	$('input.buttonEvalInBrowser').click(function()
	{
		try
		{
			var code = mEditor.selection()
			var res = eval(code)
			showResult(res);
		}
		catch (error)
		{
			 showResult('Error: ' + error)
		}
	});
	*/

	function showScrollBuffer()
	{
		// If we have scroll buffer, show it.
		if (mScrollBuffer)
		{
			mResult.setValue(mResult.getValue() + '\n' + mScrollBuffer)
			mScrollBuffer = null
			mResult.scrollIntoView({ line: mResult.lastLine(), ch: 0 })
		}
	}

	function showResult(res)
	{
		if (mAutoScroll)
		{
			showScrollBuffer()

			// Show the result and scroll.
			mResult.setValue(mResult.getValue() + '\n' + res)
			mResult.scrollIntoView({ line: mResult.lastLine(), ch: 0 })
		}
		else
		{
			// Initialise scroll buffer.
			if (!mScrollBuffer)
			{
				mScrollBuffer = ''
			}

			// Add log data to scroll buffer.
			mScrollBuffer += '\n' + res
		}
	}

	window.hyper = {}

	window.hyper.log = function(message)
	{
		showResult('NODE: ' + message)
	}

	window.hyper.inspect = function(obj)
	{
		window.hyper.log('Object inspect:\n' +
			window.hyper.objectToString(obj, [], '  '))
	}

	window.hyper.objectToString = function (obj, visited, level)
	{
		// Check for circular structures.
		for (var i = 0; i < visited.length; ++i)
		{
			if (visited[i] === obj) { return level + '<circular reference>\n' }
		}
		visited.push(obj)

		if (!level) { level = '' }

		var s = ''

		for (prop in obj)
		{
			if (obj.hasOwnProperty(prop))
			{
				var value = obj[prop]
				if (typeof value === 'object')
				{
					s += level + prop + ':\n' +
						window.hyper.objectToString(value, visited, level + '  ')
				}
				else
				{
					s += level + prop + ': ' + value + '\n'
				}
			}
		}

		return s
	}

	function receiveMessage(event)
	{
		//LOGGER.log('Workbench got : ' + event.data.message)
		if ('hyper.hello' == event.data.message)
		{
			mMainWindow = event.source
		}
		else if ('hyper.log' == event.data.message)
		{
			showResult('LOG: ' + event.data.logMessage)
		}
		else if ('hyper.result' == event.data.message)
		{
			showResult('RES: ' + event.data.result)
		}
	}

	function saveUIState()
	{
		// Save editor and log content.

		var maxStorageSize = 100000
		var editorContent = mEditor.getValue()
		var resultContent = mResult.getValue()
		if (editorContent.length > maxStorageSize)
		{
			editorContent = editorContent.substring(0, maxStorageSize)
		}
		if (resultContent.length > maxStorageSize)
		{
			resultContent = resultContent.substring(0, maxStorageSize)
		}

		SETTINGS.setWorkbenchCodeEditorContent(editorContent)
		SETTINGS.setWorkbenchResultEditorContent(resultContent)

		// Save window layout.

		var win = GUI.Window.get()

		// Do not save if window is minimized on Windows.
		// On Windows an icon has x,y coords -32000 when
		// window is minimized. On Linux and OS X the window
		// coordinates and size are intact when minimized.
		if (win.x < -1000)
		{
			return;
		}

		SETTINGS.setWorkbenchWindowGeometry({
			x: win.x,
			y: win.y,
			width: win.width,
			height: win.height
			})

		var layout = $('body').layout()
		SETTINGS.setWorkbenchWindowDividerPosition(layout.state.south.size)
	}

	// Save global reference to function.
	window.saveUIState = saveUIState

	function restoreSavedUIState()
	{
		var editorContent = SETTINGS.getWorkbenchCodeEditorContent()
			|| $('#code-editor-default-content').html()
		var resultContent = SETTINGS.getWorkbenchResultEditorContent()
			|| $('#result-editor-default-content').html()
		mEditor.setValue(editorContent)
		mResult.setValue(resultContent)

		var geometry = SETTINGS.getWorkbenchWindowGeometry()
		if (geometry)
		{
			var win = GUI.Window.get()

			// Make sure top-left corner is visible.
			var offsetY = 0
			if ('darwin' == OS.platform())
			{
				offsetY = 22
			}
			geometry.x = Math.max(geometry.x, 1)
			geometry.y = Math.max(geometry.y, 1 + offsetY)
			geometry.x = Math.min(geometry.x, screen.width - 100)
			geometry.y = Math.min(geometry.y, screen.height - 200)

			// Set window size.
			win.x = geometry.x
			win.y = geometry.y
			win.width = geometry.width
			win.height = geometry.height
		}

		var size = SETTINGS.getWorkbenchWindowDividerPosition()
		if (size)
		{
			var layout = $('body').layout()
			layout.sizePane('south', size)
		}
	}

	// Restore the original content of the panes.
	function restoreState()
	{
		var editorContent = $('#code-editor-default-content').html()
		var resultContent = $('#result-editor-default-content').html()
		mEditor.setValue(editorContent)
		mResult.setValue(resultContent)
	}

	function setLayoutProperties()
	{
		$('body').layout(
		{
			south: { size: 300 },
			//center: { maskContents: true },
			fxName: 'none'
		})
	}

	// Set up event listeners.
	window.addEventListener('message', receiveMessage, false)

	var win = GUI.Window.get()
	win.on('close', function()
	{
		saveUIState()
		this.close(true)
	})

	// Init layout.
	setLayoutProperties()

	// Set the save state since last session.
	restoreSavedUIState()

	setTimeout(
		function()
		{
			// Set fonts based on settings.
			$('.CodeMirror').css('font-family', SETTINGS.getWorkbenchFontFamily())
			$('.CodeMirror').css('font-size', SETTINGS.getWorkbenchFontSize())
		},
		1)
})
