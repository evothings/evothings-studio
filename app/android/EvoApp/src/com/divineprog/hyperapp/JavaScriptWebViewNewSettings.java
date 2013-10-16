package com.divineprog.hyperapp;

import android.webkit.WebView;

public class JavaScriptWebViewNewSettings
{
    void applySettings(WebView webView)
    {
        webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
    }
}
