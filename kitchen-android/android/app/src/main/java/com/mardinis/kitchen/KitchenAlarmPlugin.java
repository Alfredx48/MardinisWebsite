package com.mardinis.kitchen;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Plays the kitchen sounds through Android's Alarm volume, so a new order is loud even when
// Media volume is down. While the new-order alarm plays, the Alarm volume is raised to max and
// put back afterwards (the softer admin chime plays at the current Alarm volume). The kitchen page calls it through playChime() in client/src/admin/adminUtils.js;
// the Sound on/off setting is checked there.
@CapacitorPlugin(name = "KitchenAlarm")
public class KitchenAlarmPlugin extends Plugin {

    private static final AudioAttributes ATTRIBUTES = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build();

    private static final String SAVED_VOLUME = "savedAlarmVolume";

    private AudioManager audioManager;
    private SharedPreferences prefs;
    private MediaPlayer player;
    private AudioFocusRequest focusRequest;
    // Alarm volume before we raised it, or -1 when we haven't changed it. Also kept in prefs, so
    // the volume still goes back if the app is killed or updated while a sound plays.
    private int savedVolume = -1;

    @Override
    public void load() {
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        prefs = getContext().getSharedPreferences("KitchenAlarm", Context.MODE_PRIVATE);
        savedVolume = prefs.getInt(SAVED_VOLUME, -1);
        restoreVolume();
    }

    // play({ sound: "alarm" | "chime" })
    @PluginMethod
    public void play(PluginCall call) {
        boolean chime = "chime".equals(call.getString("sound", "alarm"));
        try {
            start(chime ? R.raw.kitchen_chime : R.raw.kitchen_alarm, !chime);
            call.resolve();
        } catch (Exception e) {
            Logger.error("KitchenAlarm", "Couldn't play the " + (chime ? "chime" : "alarm"), e);
            finish();
            call.reject("Couldn't play the sound", e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        finish();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        finish();
    }

    private synchronized void start(int resource, boolean loud) throws Exception {
        // A new sound replaces one still playing, keeping the volume we saved the first time.
        releasePlayer();
        requestFocus();
        if (loud) raiseVolume();

        MediaPlayer mp = new MediaPlayer();
        player = mp;
        mp.setAudioAttributes(ATTRIBUTES);
        try (AssetFileDescriptor afd = getContext().getResources().openRawResourceFd(resource)) {
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
        }
        mp.setOnCompletionListener((done) -> finishIfCurrent(done));
        mp.setOnErrorListener((failed, what, extra) -> {
            Logger.error("KitchenAlarm", "MediaPlayer error " + what + "/" + extra, null);
            finishIfCurrent(failed);
            return true;
        });
        mp.prepare();
        mp.start();
    }

    private synchronized void finishIfCurrent(MediaPlayer mp) {
        if (mp == player) finish();
    }

    private synchronized void finish() {
        releasePlayer();
        restoreVolume();
        abandonFocus();
    }

    private void releasePlayer() {
        if (player == null) return;
        try {
            player.stop();
        } catch (IllegalStateException ignored) {
            // Not started yet, or already finished.
        }
        player.release();
        player = null;
    }

    private void raiseVolume() {
        if (savedVolume >= 0) return;
        try {
            int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            int current = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            if (current < max) {
                savedVolume = current;
                prefs.edit().putInt(SAVED_VOLUME, current).commit();
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, max, 0);
            }
        } catch (SecurityException e) {
            // Do Not Disturb can refuse volume changes; play at the current volume.
            Logger.error("KitchenAlarm", "Couldn't raise the alarm volume", e);
        }
    }

    private void restoreVolume() {
        if (savedVolume < 0) return;
        try {
            // If someone changed the volume while it played, leave their setting alone.
            int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            if (audioManager.getStreamVolume(AudioManager.STREAM_ALARM) == max) {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, savedVolume, 0);
            }
        } catch (SecurityException e) {
            Logger.error("KitchenAlarm", "Couldn't restore the alarm volume", e);
        }
        savedVolume = -1;
        prefs.edit().remove(SAVED_VOLUME).apply();
    }

    @SuppressWarnings("deprecation")
    private void requestFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(ATTRIBUTES).build();
            }
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
    }

    @SuppressWarnings("deprecation")
    private void abandonFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            audioManager.abandonAudioFocus(null);
        }
    }
}
