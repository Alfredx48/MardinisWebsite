package com.mardinis.kitchen;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.Logger;

// Opens the kitchen after the tablet restarts (a power cut, a Samsung system update), so it never
// sits on the home screen with nobody noticing. Android only lets an app open itself from the
// background with "Appear on top" (SYSTEM_ALERT_WINDOW) turned on; without it, an alarm-style
// notification's full-screen intent opens it instead, which works while the lock screen is up.
// Pushes ring after a restart either way: a reboot doesn't stop the app like Force stop does.
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        // BOOT_COMPLETED is a protected broadcast: only the system can send it.
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        OrderNotifications.createChannels(context);
        if (Settings.canDrawOverlays(context)) {
            try {
                context.startActivity(MainActivity.wakeIntent(context));
                return;
            } catch (RuntimeException e) {
                Logger.error("Kitchen", "Couldn't open the kitchen after a restart", e);
            }
        }
        OrderNotifications.showStartup(context);
    }
}
