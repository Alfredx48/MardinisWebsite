package com.mardinis.kitchen;

import android.Manifest;
import android.app.KeyguardManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import org.json.JSONObject;

// The kitchen screen in a full-screen WebView (the live site, see capacitor.config.ts).
public class MainActivity extends BridgeActivity {

    // Set on the intent of a push alert's notification (OrderNotifications).
    static final String EXTRA_ALARM = "kitchenAlarm";

    // The running kitchen screen, whether it's on screen, and whether the page showing is the
    // kitchen (set by the page through KitchenPushPlugin.setKitchenOpen), for KitchenMessagingService.
    private static volatile MainActivity current;
    private static volatile boolean visible;
    static volatile boolean kitchenOpen;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(KitchenAlarmPlugin.class);
        registerPlugin(KitchenPushPlugin.class);
        super.onCreate(savedInstanceState);
        current = this;
        OrderNotifications.createChannels(this);
        // Android 13+: push alerts need the notification permission.
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1);
        }

        // The tablet sits on the counter all day: never let the screen sleep while the app is open.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();

        WebView webView = getBridge().getWebView();
        // A new page load (reload, or leaving the kitchen) until the kitchen page says it's open again.
        getBridge().addWebViewListener(
            new WebViewListener() {
                @Override
                public void onPageStarted(WebView view) {
                    kitchenOpen = false;
                }
            }
        );
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
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getBooleanExtra(EXTRA_ALARM, false)) wakeUp();
    }

    @Override
    public void onResume() {
        super.onResume();
        visible = true;
        // The kitchen is on screen: stop ringing and let the page pop up the pushed orders.
        AlarmService.stop(this);
        if (PendingOrders.count(this) > 0) sendToPage("kitchenpushpending", new JSONObject());
    }

    @Override
    public void onPause() {
        super.onPause();
        visible = false;
        // Save the sign-in cookie to disk now, so it survives the app being killed.
        CookieManager.getInstance().flush();
    }

    @Override
    public void onStop() {
        super.onStop();
        // Only an alert shows the kitchen over the lock screen, not every time after one.
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(false);
            setTurnScreenOn(false);
        }
    }

    @Override
    public void onDestroy() {
        if (current == this) {
            current = null;
            visible = false;
        }
        super.onDestroy();
    }

    // Opened by a push alert: show over the lock screen and turn the screen on, like an alarm clock.
    @SuppressWarnings("deprecation")
    private void wakeUp() {
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            getSystemService(KeyguardManager.class).requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
    }

    // A window event for the kitchen page (data becomes properties of the event); false if the
    // page isn't running.
    static boolean sendToPage(String event, JSONObject data) {
        MainActivity activity = current;
        if (activity == null || activity.getBridge() == null) return false;
        activity.runOnUiThread(() -> activity.getBridge().triggerWindowJSEvent(event, data.toString()));
        return true;
    }

    // Like sendToPage, but only while the kitchen page itself is on screen.
    static boolean sendToVisibleKitchen(String event, JSONObject data) {
        return visible && kitchenOpen && sendToPage(event, data);
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
