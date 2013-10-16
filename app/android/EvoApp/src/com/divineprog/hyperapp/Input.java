package com.divineprog.hyperapp;

public class Input
{
    public interface Listener
    {
        public boolean onTouchDown(int touchX, int touchY, int touchId);
        public boolean onTouchDrag(int touchX, int touchY, int touchId);
        public boolean onTouchUp(int touchX, int touchY, int touchId);
        public boolean onKeyDown(int keyCode);
        public boolean onKeyUp(int keyCode);
    }

    public static class Adapter implements Listener
    {
        @Override
        public boolean onTouchDown(int touchX, int touchY, int touchId) { return false; }
        @Override
        public boolean onTouchDrag(int touchX, int touchY, int touchId) { return false; }
        @Override
        public boolean onTouchUp(int touchX, int touchY, int touchId) { return false; }
        @Override
        public boolean onKeyDown(int keyCode) { return false; }
        @Override
        public boolean onKeyUp(int keyCode) { return false; }
    }
}
