package com.evothings.evoapp;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

import com.divineprog.hyperapp.Input;
import com.divineprog.hyperapp.InputActivity;
import com.divineprog.hyperapp.JavaScriptWebView;
import com.evothings.evoapp.R;

import android.os.Bundle;
import android.app.Activity;
import android.content.res.Configuration;
import android.util.Log;
import android.view.KeyEvent;
import android.view.Menu;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;

public class MainActivity
    extends InputActivity
    implements JavaScriptWebView.ConsoleListener
{
    JavaScriptWebView mWebView;
    String mHomePageUrl = "file:///android_asset/index.html";

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        // Create WebView.
        mWebView = new JavaScriptWebView(this);
        mWebView.setConsoleListener(this);
        mWebView.loadUrl(mHomePageUrl);
        mWebView.addJavascriptInterface(
        		new JavaScriptInterface(),
        		"hyper");
        //mWebView.loadUrl("http://192.168.43.226:4042");
        setContentView(mWebView);
        createInputListener();
    }

    /**
     * Handle back key.
     */
    void createInputListener()
    {
        addInputListener(new Input.Adapter()
        {
            @Override
            public boolean onKeyUp(int keyCode)
            {
                if (KeyEvent.KEYCODE_BACK == keyCode)
                {
                    if (mWebView.getUrl().equals(mHomePageUrl))
                    {
                        // If on home page then exit app.
                        finish();
                    }
                    else
                    {
                        // Otherwise show app home page.
                        mWebView.loadUrl(mHomePageUrl);
                    }
                    return true;
                }
                else
                {
                    return false;
                }
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu)
    {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig)
    {
        super.onConfigurationChanged(newConfig);
        /*
        // Checks the orientation of the screen
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            Toast.makeText(this, "landscape", Toast.LENGTH_SHORT).show();
        } else if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT){
            Toast.makeText(this, "portrait", Toast.LENGTH_SHORT).show();
        }
        */
    }

    @Override
    public void onConsoleMessage(ConsoleMessage message)
    {
    		String file = "";
    		if (null != message.sourceId())
    		{
	        int pos = message.sourceId().lastIndexOf("/");
	        if (pos > 1)
	        {
	        		file = message.sourceId().substring(pos + 1);
	        }
	        else
	        {
	        		file = message.sourceId();
	        }
    		}
    		
        String msg =
            message.message() + 
            " [" + file + ":" +  message.lineNumber() + "]";
        
        Log.i("@@@", msg);
        
        mWebView.callJS(
            "try{hyperapp.nativeConsoleMessageCallBack('"
            + msg
            + "')}catch(err){}");
    }
    
    public static String[] getLocalIpAddresses()
    {
        try
        {
            List<String> ipaddresses = new ArrayList<String>();
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements())
            {
                NetworkInterface interf = interfaces.nextElement();
                Enumeration<InetAddress> adresses = interf.getInetAddresses();
                while (adresses.hasMoreElements())
                {
                    InetAddress address = adresses.nextElement();
                    if (!address.isLoopbackAddress() && address.isSiteLocalAddress())
                    {
                        ipaddresses.add(address.getHostAddress().toString());
                    }
                }
            }
            
            if (ipaddresses.size() > 0)
            {
                return ipaddresses.toArray(new String[1]);
            }
        }
        catch (SocketException e)
        {
            e.printStackTrace();
        }
        return null;
    }
    
    public static class JavaScriptInterface
    {
        @JavascriptInterface
        public String getLocalIpAddress()
        {
        		String[] addresses = getLocalIpAddresses();
        		if (null != addresses)
        		{
        			return addresses[0];
        		}
        		else
        		{
        			return null;
        		}
        }
    }
}
