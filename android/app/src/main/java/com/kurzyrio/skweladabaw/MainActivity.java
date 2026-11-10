package com.kurzyrio.skweladabaw;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private PermissionRequest pendingPermissionRequest;
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1002;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1003;
    private String pendingGeoOrigin = null;
    private GeolocationPermissions.Callback pendingGeoCallback = null;
    public static volatile String lastLaunchTab = null;
    public static volatile String lastLaunchAction = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(EagleOverlayPlugin.class);
        handleLaunchIntent(getIntent());
        super.onCreate(savedInstanceState);

        // Initialize 5-minute background weather monitoring service
        WeatherBackgroundReceiver.scheduleNextWeatherAlarm(this, System.currentTimeMillis() + 10000L);

        // Configure WebView settings for WebRTC video playback and permissions
        if (bridge != null && bridge.getWebView() != null) {
            WebSettings settings = bridge.getWebView().getSettings();
            if (settings != null) {
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);
                settings.setAllowFileAccess(false);
                settings.setDomStorageEnabled(true);
                settings.setGeolocationEnabled(true);
            }

            // Route file downloads safely to Android system intent to avoid multi-download loops
            bridge.getWebView().setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
                try {
                    Intent downloadIntent = new Intent(Intent.ACTION_VIEW);
                    downloadIntent.setData(Uri.parse(url));
                    downloadIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(downloadIntent);
                } catch (Exception ignored) {}
            });

            bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        boolean hasCamera = false;
                        for (String r : request.getResources()) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                                hasCamera = true;
                                break;
                            }
                        }

                        if (hasCamera) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                request.grant(request.getResources());
                            } else {
                                pendingPermissionRequest = request;
                                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST_CODE);
                            }
                        } else {
                            super.onPermissionRequest(request);
                        }
                    });
                }

                @Override
                public void onGeolocationPermissionsShowPrompt(final String origin, final GeolocationPermissions.Callback callback) {
                    runOnUiThread(() -> {
                        boolean hasFine = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                        boolean hasCoarse = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                        if (hasFine || hasCoarse) {
                            callback.invoke(origin, true, true);
                        } else {
                            pendingGeoOrigin = origin;
                            pendingGeoCallback = callback;
                            requestPermissions(new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            }, LOCATION_PERMISSION_REQUEST_CODE);
                        }
                    });
                }

                @Override
                public void onGeolocationPermissionsHidePrompt() {
                    pendingGeoCallback = null;
                    pendingGeoOrigin = null;
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingPermissionRequest != null) {
                    runOnUiThread(() -> {
                        try {
                            pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                        } catch (Exception ignored) {}
                        pendingPermissionRequest = null;
                    });
                }
            } else {
                if (pendingPermissionRequest != null) {
                    runOnUiThread(() -> {
                        try {
                            pendingPermissionRequest.deny();
                        } catch (Exception ignored) {}
                        pendingPermissionRequest = null;
                    });
                }
            }
        } else if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            boolean granted = false;
            if (grantResults.length > 0) {
                for (int gr : grantResults) {
                    if (gr == PackageManager.PERMISSION_GRANTED) {
                        granted = true;
                        break;
                    }
                }
            }
            if (pendingGeoCallback != null) {
                final boolean finalGranted = granted;
                runOnUiThread(() -> {
                    try {
                        pendingGeoCallback.invoke(pendingGeoOrigin, finalGranted, true);
                    } catch (Exception ignored) {}
                    pendingGeoCallback = null;
                    pendingGeoOrigin = null;
                });
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleLaunchIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        checkAndResumeEagleOverlay();
    }

    private void checkAndResumeEagleOverlay() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                if (android.provider.Settings.canDrawOverlays(this)) {
                    android.content.SharedPreferences prefs = getSharedPreferences(EagleOverlayService.PREFS_NAME, android.content.Context.MODE_PRIVATE);
                    if (prefs.getBoolean(EagleOverlayService.PREF_IS_ACTIVE, false)) {
                        if (!EagleOverlayService.isRunning()) {
                            Intent overlayIntent = new Intent(this, EagleOverlayService.class);
                            overlayIntent.setAction(EagleOverlayService.ACTION_START);
                            androidx.core.content.ContextCompat.startForegroundService(this, overlayIntent);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private void handleLaunchIntent(Intent intent) {
        if (intent == null) return;
        String tab = intent.getStringExtra("target_tab");
        String action = intent.getStringExtra("target_action");
        Uri data = intent.getData();
        if (data != null) {
            if (tab == null) {
                tab = data.getHost();
                if (tab == null || tab.isEmpty()) {
                    tab = data.getSchemeSpecificPart();
                    if (tab != null && tab.startsWith("//")) {
                        tab = tab.substring(2);
                    }
                    if (tab != null && tab.contains("?")) {
                        tab = tab.substring(0, tab.indexOf("?"));
                    }
                    if (tab != null && tab.contains("#")) {
                        tab = tab.substring(0, tab.indexOf("#"));
                    }
                }
            }
            if (action == null && data.getQueryParameter("action") != null) {
                action = data.getQueryParameter("action");
            }
        }
        if (tab != null || action != null) {
            lastLaunchTab = tab;
            lastLaunchAction = action;
            WidgetBridgePlugin.notifyLaunchTarget(tab, action);
        }
    }
}
