package com.divineprog.hyperapp;

import java.util.ArrayList;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

/**
 * "Abstract" activity that supports simplified input handling.
 * Implement application behaviour in a subclass.
 * @author miki
 */
public class InputActivity extends Activity
{
    ArrayList<Input.Listener> mInputListeners;

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        mInputListeners = new ArrayList<Input.Listener>();
    }

    public void addInputListener(Input.Listener listener)
    {
        mInputListeners.add(listener);
    }

    public void removeInputListener(Input.Listener listener)
    {
        mInputListeners.remove(listener);
    }

    public void removeInputListeners()
    {
        mInputListeners.clear();
    }

    public void showView(final View view)
    {
        final Activity me = this;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                me.setContentView(view);
            }
        });
    }

    @Override
    public boolean onTouchEvent(MotionEvent event)
    {
        if (mInputListeners.isEmpty()) { return false; }

        int action = event.getActionMasked();
        int index = event.getActionIndex();
        int id = event.getPointerId(index);
        int x = (int) event.getX(index);
        int y = (int) event.getY(index);

        switch (action)
        {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN:
                for (Input.Listener listener : mInputListeners)
                {
                    listener.onTouchDown(x, y, id);
                }
                break;

            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP:
                for (Input.Listener listener : mInputListeners)
                {
                    listener.onTouchUp(x, y, id);
                }
                break;

            case MotionEvent.ACTION_MOVE:
                for (Input.Listener listener : mInputListeners)
                {
                    listener.onTouchDrag(x, y, id);
                }
                break;

            default:
                // Event not handled.
                return false;
        }

        // Event handled.
        return true;
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event)
    {
        if (mInputListeners.isEmpty())
        {
            return super.onKeyDown(keyCode, event);
        }

        for (Input.Listener listener : mInputListeners)
        {
            listener.onKeyDown(keyCode);
        }

        return true;
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event)
    {
        if (mInputListeners.isEmpty())
        {
            return super.onKeyUp(keyCode, event);
        }

        for (Input.Listener listener : mInputListeners)
        {
            listener.onKeyUp(keyCode);
        }

        return true;
    }
}
