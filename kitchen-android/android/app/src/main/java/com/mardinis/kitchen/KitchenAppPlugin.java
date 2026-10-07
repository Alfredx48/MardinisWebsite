package com.mardinis.kitchen;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// The installed app's version (nativeApp() in client/src/native.js), so the kitchen page can ask
// for an update when it needs native code a tablet doesn't have yet (MIN_APP_VERSION in
// KitchenApp.jsx). Added in 1.3; older installs don't have this plugin.
@CapacitorPlugin(name = "KitchenApp")
public class KitchenAppPlugin extends Plugin {

    // info() → { versionCode, versionName }
    @PluginMethod
    public void info(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionCode", PackageInfoCompat.getLongVersionCode(info));
            result.put("versionName", info.versionName);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Couldn't read the app version", e);
        }
    }
}
