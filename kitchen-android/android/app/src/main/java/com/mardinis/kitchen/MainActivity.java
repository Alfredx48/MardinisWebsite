package com.mardinis.kitchen;

import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

// The kitchen screen in a full-screen WebView (the live site, see capacitor.config.ts).
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(KitchenAlarmPlugin.class);
        super.onCreate(savedInstanceState);

        // The tablet sits on the counter all day: never let the screen sleep while the app is open.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();

        WebView webView = getBridge().getWebView();
        // The new-order alarm has to play without anyone tapping the screen first.
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

        // Back never closes the app or leaves the kitchen. On the kitchen it acts as Escape, which
        // closes an open dialog or menu (never the new-order popup); on another page (Change
        // password, Admin), it goes back towards the kitchen.
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    if (isKitchenPage(webView.getUrl())) {
                        webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ESCAPE));
                        webView.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ESCAPE));
                        return;
                    }
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        webView.loadUrl(getBridge().getServerUrl());
                    }
                }
            }
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Dialogs, the keyboard and swipes can bring the bars back; hide them again.
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onPause() {
        super.onPause();
        // Save the sign-in cookie to disk now, so it survives the app being killed.
        CookieManager.getInstance().flush();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    private static boolean isKitchenPage(String url) {
        if (url == null) return true;
        String path = Uri.parse(url).getPath();
        return path == null || path.equals("/kitchen") || path.startsWith("/kitchen/");
    }
}
