package com.divineprog.hyperapp;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions.Callback;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebSettings.LayoutAlgorithm;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * JavaScript enabled WebView.
 * @author miki
 */
public class JavaScriptWebView extends WebView
{
    Context mContext;
    ConsoleListener mConsoleListener;

	@SuppressLint("SetJavaScriptEnabled")
	public JavaScriptWebView(Context context)
	{
		super(context);

		mContext = context;

		WebSettings settings = getSettings();
		settings.setJavaScriptEnabled(true);
		settings.setGeolocationEnabled(true);
		settings.setBuiltInZoomControls(true);
		setVerticalScrollbarOverlay(true);

		// This is needed for persistent DOM storage (localStorage).
		settings.setDomStorageEnabled(true);
		settings.setDatabaseEnabled(true);
		settings.setDatabasePath(
			"/data/data/" + 
			context.getPackageName() +
			"/databases/");

		setWebViewClient(new MyWebViewClient());
		setWebChromeClient(new MyChromeClient());

		try { new JavaScriptWebViewNewSettings().applySettings(this); }
		catch (java.lang.Throwable e) {}
	}

    public void callJS(final String js)
    {
        final WebView webView = this;
        ((Activity) mContext).runOnUiThread(new Runnable() {
            @Override
            public void run() { webView.loadUrl("javascript:" + js); }
        });
    }

    /**
     * Set the listener that will be called on WebView console messages
     * (typically errors and console.log).
     * @param listener
     */
    public void setConsoleListener(ConsoleListener listener)
    {
        mConsoleListener = listener;
    }

    /**
     * A WebViewClient is needed to make the WebVew open URLs internally.
     * This class may add methods in the future.
     */
    class MyWebViewClient extends WebViewClient
    {
	    @Override
	    public void onScaleChanged(
    		WebView view, 
    		float oldScale, 
    		float newScale)
	    {
	    	// Make text to reflow to WebView width.
	        view.getSettings().setLayoutAlgorithm(
	                LayoutAlgorithm.NARROW_COLUMNS);
	        view.invalidate();
	        super.onScaleChanged(view, oldScale, newScale);
	    }
    }

	class MyChromeClient extends WebChromeClient
	{
		@Override
		public boolean onJsAlert(
			WebView view,
			String url,
			String message,
			JsResult result)
		{
		    // Display alert as a Toast.
			Toast.makeText(
				view.getContext(),
				message,
				Toast.LENGTH_SHORT).show();
			result.confirm();
			return true;
		}

		@Override
		public boolean onJsPrompt(
			WebView view,
			String url,
			String message,
			String defaultValue,
			JsPromptResult result)
		{
		    // Need to set a result.
			result.confirm("ok");

			// Hard-coded to test performance of prompt.
			callJS("PromptCallback()");

			return true;
		}

		@Override
		public void onGeolocationPermissionsShowPrompt(
		    String origin,
		    Callback callback)
		{
		    super.onGeolocationPermissionsShowPrompt(origin, callback);
		    callback.invoke(origin, true, false);
		}

        @Override
		public boolean onConsoleMessage(ConsoleMessage consoleMessage)
		{
            if (null != mConsoleListener)
            {
                mConsoleListener.onConsoleMessage(consoleMessage);
                return true;
            }
            else
            {
                return false;
            }
		}
	}

	/**
	 * Interface for listening to console messages on this WebView.
	 */
    public static interface ConsoleListener
    {
        public void onConsoleMessage(ConsoleMessage message);
    }
}
