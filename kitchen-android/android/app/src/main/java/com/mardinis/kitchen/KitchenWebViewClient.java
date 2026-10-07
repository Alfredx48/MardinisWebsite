package com.mardinis.kitchen;

import android.net.Uri;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Logger;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

// When the kitchen can't load (no Wi-Fi, the site down), shows res/raw/kitchen_offline.html
// instead of the WebView's error page. It checks every few seconds whether the site answers and
// then loads the page that failed, so the kitchen comes back without anyone touching it.
// Once the site has loaded, the web service worker's offline page and the kitchen's "Can't reach
// the server" banner cover later drops; this is for launches, reloads and restarts.
class KitchenWebViewClient extends BridgeWebViewClient {

    KitchenWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        if (request.isForMainFrame()) showOffline(view, request.getUrl());
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
        super.onReceivedHttpError(view, request, response);
        // Render's own error pages while the site is down or restarting.
        if (request.isForMainFrame() && response.getStatusCode() >= 500) showOffline(view, request.getUrl());
    }

    private static void showOffline(WebView view, Uri failed) {
        String scheme = failed.getScheme();
        if (!"https".equals(scheme) && !"http".equals(scheme)) return;
        String html;
        try (InputStream in = view.getResources().openRawResource(R.raw.kitchen_offline)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            for (int n; (n = in.read(buffer)) != -1; ) out.write(buffer, 0, n);
            html = out.toString(StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            Logger.error("Kitchen", "Couldn't show the offline page", e);
            return;
        }
        // JSONObject.quote makes a safe JS string (it also escapes "</").
        html = html.replace("\"__RETRY_URL__\"", JSONObject.quote(failed.toString()));
        // Shown as if it were the failed page, so the page can check the site (same origin) and
        // retry, and Back keeps treating it as the kitchen.
        view.loadDataWithBaseURL(failed.toString(), html, "text/html", "utf-8", failed.toString());
    }
}
