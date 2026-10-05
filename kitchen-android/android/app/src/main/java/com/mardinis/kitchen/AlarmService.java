package com.mardinis.kitchen;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Logger;

// Rings for a pushed order while the kitchen isn't on screen: the alarm every 20s, like the
// kitchen page, at its loudness (unless Sound is off there), plus OrderNotifications' alarm-style
// notification that opens the kitchen. Stops when the kitchen opens (MainActivity.onResume)
// or after 10 minutes. Started by KitchenMessagingService for a high-priority push, which
// Android allows from the background.
public class AlarmService extends Service {

    private static final String EXTRA_NUMBER = "number";
    private static final long REPEAT_MS = 20_000;
    private static final long GIVE_UP_MS = 10 * 60_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable ring = new Runnable() {
        @Override
        public void run() {
            playOnce();
            handler.postDelayed(this, REPEAT_MS);
        }
    };
    private final Runnable giveUp = this::stopSelf;
    private PowerManager.WakeLock wakeLock;

    static void start(Context context, String number) {
        try {
            ContextCompat.startForegroundService(context, new Intent(context, AlarmService.class).putExtra(EXTRA_NUMBER, number));
        } catch (RuntimeException e) {
            // ForegroundServiceStartNotAllowedException and friends: ring with the notification instead.
            Logger.error("KitchenPush", "Couldn't start the alarm service", e);
            OrderNotifications.showBackup(context, number);
        }
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, AlarmService.class));
        OrderNotifications.cancelBackup(context);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String number = intent != null ? intent.getStringExtra(EXTRA_NUMBER) : null;
        try {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
            ServiceCompat.startForeground(this, OrderNotifications.SERVICE_ID, OrderNotifications.build(this, OrderNotifications.CHANNEL, number), type);
        } catch (RuntimeException e) {
            Logger.error("KitchenPush", "Couldn't run the alarm service in the foreground", e);
            OrderNotifications.showBackup(this, number);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (wakeLock == null) {
            // Keeps the 20s repeats on time while the screen is off.
            wakeLock = ((PowerManager) getSystemService(Context.POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Kitchen:alarm");
            wakeLock.acquire(GIVE_UP_MS + 5_000);
        }
        // Each new order rings right away and restarts the 10 minutes.
        handler.removeCallbacks(ring);
        handler.post(ring);
        handler.removeCallbacks(giveUp);
        handler.postDelayed(giveUp, GIVE_UP_MS);
        return START_NOT_STICKY;
    }

    private void playOnce() {
        AlarmPlayer player = AlarmPlayer.get(this);
        if (!player.soundOn()) return;
        try {
            player.play(false, player.alarmVolume());
        } catch (Exception e) {
            Logger.error("KitchenPush", "Couldn't play the alarm", e);
        }
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
