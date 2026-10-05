package com.mardinis.kitchen;

import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// The kitchen page's sounds on Android's Alarm volume (see AlarmPlayer). The page calls it
// through playChime() in client/src/admin/adminUtils.js, which also checks Sound on/off.
@CapacitorPlugin(name = "KitchenAlarm")
public class KitchenAlarmPlugin extends Plugin {

    private AlarmPlayer player;

    @Override
    public void load() {
        player = AlarmPlayer.get(getContext());
    }

    // play({ sound: "alarm" | "chime", volume }): volume is the alarm's share of the max Alarm
    // volume (0-1, default 1); the chime ignores it.
    @PluginMethod
    public void play(PluginCall call) {
        boolean chime = "chime".equals(call.getString("sound", "alarm"));
        double volume = Math.max(0, Math.min(1, call.getDouble("volume", 1.0)));
        try {
            player.play(chime, volume);
            call.resolve();
        } catch (Exception e) {
            Logger.error("KitchenAlarm", "Couldn't play the " + (chime ? "chime" : "alarm"), e);
            player.stop();
            call.reject("Couldn't play the sound", e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        player.stop();
        call.resolve();
    }

    // setSound({ on, volume }): the page's Sound on/off and Alarm loudness, so push alerts
    // follow them while the page isn't open.
    @PluginMethod
    public void setSound(PluginCall call) {
        player.saveSoundSetting(call.getBoolean("on", true), Math.max(0, Math.min(1, call.getDouble("volume", 1.0))));
        call.resolve();
    }
}
