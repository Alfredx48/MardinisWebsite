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

// Plays the kitchen sounds through Android's Alarm volume, so a new order is heard even when
// Media volume is down. While the new-order alarm plays, the Alarm volume is set to the kitchen's
// Alarm loudness (max for Loud) and put back afterwards; the softer admin chime plays at the
// current Alarm volume. Used by the kitchen page (KitchenAlarmPlugin) and by push alerts while
// the app is closed (AlarmService). Also keeps the page's Sound on/off and loudness, so push
// alerts follow them.
final class AlarmPlayer {

    static final AudioAttributes ATTRIBUTES = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build();

    private static final String SAVED_VOLUME = "savedAlarmVolume";
    private static final String APPLIED_VOLUME = "appliedAlarmVolume";
    private static final String SOUND_ON = "soundOn";
    private static final String ALARM_VOLUME = "alarmVolume";

    private static AlarmPlayer instance;

    private final Context context;
    private final AudioManager audioManager;
    private final SharedPreferences prefs;
    private MediaPlayer player;
    private AudioFocusRequest focusRequest;
    // Alarm volume before we changed it and the volume we set, or -1 when we haven't changed it.
    // Also kept in prefs, so the volume still goes back if the app is killed or updated while a
    // sound plays.
    private int savedVolume;
    private int appliedVolume;

    static synchronized AlarmPlayer get(Context context) {
        if (instance == null) instance = new AlarmPlayer(context.getApplicationContext());
        return instance;
    }

    private AlarmPlayer(Context context) {
        this.context = context;
        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        prefs = context.getSharedPreferences("KitchenAlarm", Context.MODE_PRIVATE);
        savedVolume = prefs.getInt(SAVED_VOLUME, -1);
        appliedVolume = prefs.getInt(APPLIED_VOLUME, -1);
        restoreVolume();
    }

    // volume: the alarm's share of the max Alarm volume (0-1); < 0 plays at the current volume.
    synchronized void play(boolean chime, double volume) throws Exception {
        // A new sound replaces one still playing, keeping the volume we saved the first time.
        releasePlayer();
        requestFocus();
        if (!chime && volume >= 0) setVolume(volume);

        MediaPlayer mp = new MediaPlayer();
        player = mp;
        mp.setAudioAttributes(ATTRIBUTES);
        try (AssetFileDescriptor afd = context.getResources().openRawResourceFd(chime ? R.raw.kitchen_chime : R.raw.kitchen_alarm)) {
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

    synchronized void stop() {
        releasePlayer();
        restoreVolume();
        abandonFocus();
    }

    void saveSoundSetting(boolean on, double volume) {
        prefs.edit().putBoolean(SOUND_ON, on).putFloat(ALARM_VOLUME, (float) volume).apply();
    }

    boolean soundOn() {
        return prefs.getBoolean(SOUND_ON, true);
    }

    double alarmVolume() {
        return prefs.getFloat(ALARM_VOLUME, 1f);
    }

    private synchronized void finishIfCurrent(MediaPlayer mp) {
        if (mp == player) stop();
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

    private void setVolume(double share) {
        try {
            int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            int target = Math.max(1, (int) Math.round(Math.min(1, share) * max));
            int current = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            if (current == target) return;
            if (savedVolume < 0) savedVolume = current;
            appliedVolume = target;
            prefs.edit().putInt(SAVED_VOLUME, savedVolume).putInt(APPLIED_VOLUME, target).commit();
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, target, 0);
        } catch (SecurityException e) {
            // Do Not Disturb can refuse volume changes; play at the current volume.
            Logger.error("KitchenAlarm", "Couldn't set the alarm volume", e);
        }
    }

    private void restoreVolume() {
        if (savedVolume < 0) return;
        try {
            // If someone changed the volume while it played, leave their setting alone.
            if (audioManager.getStreamVolume(AudioManager.STREAM_ALARM) == appliedVolume) {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, savedVolume, 0);
            }
        } catch (SecurityException e) {
            Logger.error("KitchenAlarm", "Couldn't restore the alarm volume", e);
        }
        savedVolume = -1;
        appliedVolume = -1;
        prefs.edit().remove(SAVED_VOLUME).remove(APPLIED_VOLUME).apply();
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
