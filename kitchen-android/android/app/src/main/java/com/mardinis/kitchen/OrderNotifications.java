package com.mardinis.kitchen;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

// The alarm-style "New order" notification for push alerts. Its full-screen intent opens the
// kitchen like an alarm clock when the tablet is asleep or locked; with the screen on and
// another app in front it shows as a banner.
final class OrderNotifications {

    // Silent: AlarmService plays the alarm itself, at the kitchen's loudness.
    static final String CHANNEL = "new_orders";
    // With the alarm as its sound, for when Android won't let AlarmService start.
    static final String BACKUP_CHANNEL = "new_orders_backup";
    // Opens the kitchen after a restart when it can't open itself (BootReceiver).
    static final String STARTUP_CHANNEL = "kitchen_startup";
    static final int SERVICE_ID = 1;
    static final int BACKUP_ID = 2;
    static final int STARTUP_ID = 3;
    private static final long BACKUP_TIMEOUT_MS = 10 * 60_000;

    private OrderNotifications() {}

    static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);

        NotificationChannel channel = new NotificationChannel(CHANNEL, "New orders", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Wakes the tablet for a new order. The app plays the alarm itself.");
        channel.setSound(null, null);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);

        NotificationChannel backup = new NotificationChannel(BACKUP_CHANNEL, "New orders (backup alarm)", NotificationManager.IMPORTANCE_HIGH);
        backup.setDescription("Used only if the app can't play the alarm itself.");
        backup.setSound(Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.kitchen_alarm), AlarmPlayer.ATTRIBUTES);
        backup.enableVibration(true);
        backup.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(backup);

        // High importance, or Android won't use the full-screen intent.
        NotificationChannel startup = new NotificationChannel(STARTUP_CHANNEL, "Kitchen restarted", NotificationManager.IMPORTANCE_HIGH);
        startup.setDescription("Opens the kitchen after the tablet restarts.");
        startup.setSound(null, null);
        startup.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(startup);
    }

    static Notification build(Context context, String channel, String number) {
        return builder(context, channel, number).build();
    }

    private static PendingIntent openKitchen(Context context) {
        return PendingIntent.getActivity(context, 0, MainActivity.wakeIntent(context), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static NotificationCompat.Builder builder(Context context, String channel, String number) {
        PendingIntent pending = openKitchen(context);
        int count = PendingOrders.count(context);
        String title = count > 1 ? count + " new orders" : number != null ? "New order #" + number : "New order";
        return new NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_order)
            .setContentTitle(title)
            .setContentText("Tap to open the kitchen.")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pending, true)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true);
    }

    // Rings with the channel's sound until opened or dismissed (FLAG_INSISTENT).
    static void showBackup(Context context, String number) {
        Notification notification = builder(context, BACKUP_CHANNEL, number).setTimeoutAfter(BACKUP_TIMEOUT_MS).build();
        notification.flags |= Notification.FLAG_INSISTENT;
        try {
            NotificationManagerCompat.from(context).notify(BACKUP_ID, notification);
        } catch (SecurityException e) {
            // Notifications are off for the app; nothing more we can do.
        }
    }

    static void cancelBackup(Context context) {
        NotificationManagerCompat.from(context).cancel(BACKUP_ID);
    }

    // After a restart: the lock screen is up, so the full-screen intent opens the kitchen right
    // away; if someone is using the tablet, it's a banner to tap instead.
    static void showStartup(Context context) {
        PendingIntent pending = openKitchen(context);
        Notification notification = new NotificationCompat.Builder(context, STARTUP_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_order)
            .setContentTitle("The tablet restarted")
            .setContentText("Tap to open the kitchen.")
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(pending, true)
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setOngoing(true)
            .build();
        try {
            NotificationManagerCompat.from(context).notify(STARTUP_ID, notification);
        } catch (SecurityException e) {
            // Notifications are off for the app; someone has to open it.
        }
    }

    static void cancelStartup(Context context) {
        NotificationManagerCompat.from(context).cancel(STARTUP_ID);
    }
}
