package com.mardinis.kitchen;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
import org.json.JSONObject;

// Receives KitchenPush's new-order messages (app/services/kitchen_push.rb). They're data-only
// and high priority, so this runs even when the app is closed or the tablet is asleep.
public class KitchenMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String orderId = data.get("order_id");
        if (!"new_order".equals(data.get("type")) || orderId == null) return;

        PendingOrders.add(this, orderId);
        // The kitchen page is on screen: it pops the order up and rings itself, without waiting
        // for its next poll. Anything else (asleep, another app, another page): ring here.
        if (MainActivity.sendToVisibleKitchen("kitchenpushorder", new JSONObject())) return;
        AlarmService.start(this, data.get("number"));
    }

    @Override
    public void onNewToken(String token) {
        try {
            MainActivity.sendToPage("kitchenpushtoken", new JSONObject().put("token", token));
        } catch (org.json.JSONException ignored) {
            // Can't happen with a string value.
        }
    }
}
