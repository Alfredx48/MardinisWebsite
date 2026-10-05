package com.mardinis.kitchen;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Orders pushed to this tablet that the kitchen page hasn't shown yet. The page takes them
// (KitchenPushPlugin.takePendingOrders) when it opens or comes back on screen and pops them up
// like any new order; a page that loads fresh doesn't announce orders that are already there.
final class PendingOrders {

    private static final String PREFS = "KitchenPush";
    private static final String KEY = "pendingOrderIds";

    private PendingOrders() {}

    static synchronized void add(Context context, String orderId) {
        Set<String> ids = new HashSet<>(prefs(context).getStringSet(KEY, new HashSet<>()));
        ids.add(orderId);
        prefs(context).edit().putStringSet(KEY, ids).commit();
    }

    static synchronized List<String> take(Context context) {
        List<String> ids = new ArrayList<>(prefs(context).getStringSet(KEY, new HashSet<>()));
        prefs(context).edit().remove(KEY).commit();
        return ids;
    }

    static synchronized int count(Context context) {
        return prefs(context).getStringSet(KEY, new HashSet<>()).size();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
