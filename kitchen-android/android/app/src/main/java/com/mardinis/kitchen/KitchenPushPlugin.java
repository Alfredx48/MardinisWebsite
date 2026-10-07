package com.mardinis.kitchen;

import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

// Push alerts for the kitchen page (nativePush() in client/src/native.js): the device's push
// token for /api/admin/devices, orders pushed while the page wasn't showing, and whether
// Android lets the alerts through. The ringing itself is KitchenMessagingService + AlarmService.
@CapacitorPlugin(name = "KitchenPush")
public class KitchenPushPlugin extends Plugin {

    // getToken() → { token }. Rejects in builds without google-services.json.
    @PluginMethod
    public void getToken(PluginCall call) {
        if (FirebaseApp.getApps(getContext()).isEmpty()) {
            call.reject("Push alerts aren't set up in this build of the app", "NOT_CONFIGURED");
            return;
        }
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener((task) -> {
            if (task.isSuccessful() && task.getResult() != null) {
                JSObject result = new JSObject();
                result.put("token", task.getResult());
                call.resolve(result);
            } else {
                call.reject("Couldn't get a push token", task.getException());
            }
        });
    }

    // setKitchenOpen({ open }): the kitchen page is (no longer) showing, so pushes either go to
    // it or ring natively.
    @PluginMethod
    public void setKitchenOpen(PluginCall call) {
        MainActivity.kitchenOpen = call.getBoolean("open", false);
        call.resolve();
    }

    // takePendingOrders() → { orderIds }: orders pushed since the page last asked. Stops the
    // ringing, since the page now shows them.
    @PluginMethod
    public void takePendingOrders(PluginCall call) {
        JSObject result = new JSObject();
        result.put("orderIds", new JSArray(PendingOrders.take(getContext())));
        AlarmService.stop(getContext());
        call.resolve(result);
    }

    // status() → { notifications, fullScreen, battery, overlay }: false means alerts may not get
    // through while the app is closed, or (overlay, "Appear on top") that the kitchen can't open
    // itself after a restart (BootReceiver).
    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notifications", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= 34) {
            fullScreen = getContext().getSystemService(NotificationManager.class).canUseFullScreenIntent();
        }
        result.put("fullScreen", fullScreen);
        PowerManager power = getContext().getSystemService(PowerManager.class);
        result.put("battery", power.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        result.put("overlay", Settings.canDrawOverlays(getContext()));
        call.resolve(result);
    }

    // openSettings({ which: "notifications" | "fullScreen" | "battery" | "overlay" }): the Android screen
    // that turns that one on.
    @PluginMethod
    public void openSettings(PluginCall call) {
        String which = call.getString("which", "notifications");
        Uri app = Uri.parse("package:" + getContext().getPackageName());
        Intent intent;
        if ("fullScreen".equals(which) && Build.VERSION.SDK_INT >= 34) {
            intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, app);
        } else if ("overlay".equals(which)) {
            intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, app);
        } else if ("battery".equals(which)) {
            intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, app);
        } else {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        }
        try {
            getActivity().startActivity(intent);
        } catch (RuntimeException e) {
            // Some Samsung builds lack a screen; fall back to the app's info page.
            getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, app));
        }
        call.resolve();
    }
}
