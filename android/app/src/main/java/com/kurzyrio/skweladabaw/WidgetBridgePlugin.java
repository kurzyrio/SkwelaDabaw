package com.kurzyrio.skweladabaw;

import android.app.Activity;
import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.content.ContentValues;
import android.content.ContentResolver;
import android.util.Base64;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.List;

import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "WidgetBridge",
    permissions = {
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }
        )
    }
)
public class WidgetBridgePlugin extends Plugin {
    private static WidgetBridgePlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyLaunchTarget(String tab, String action) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("tab", tab != null ? tab : "");
            data.put("action", action != null ? action : "");
            instance.notifyListeners("launchTarget", data);
        }
    }

    @PluginMethod
    public void getLaunchTarget(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("tab", MainActivity.lastLaunchTab != null ? MainActivity.lastLaunchTab : "");
        ret.put("action", MainActivity.lastLaunchAction != null ? MainActivity.lastLaunchAction : "");
        MainActivity.lastLaunchTab = null;
        MainActivity.lastLaunchAction = null;
        call.resolve(ret);
    }

    @PluginMethod
    public void setWidgetData(PluginCall call) {
        try {
            String key = call.getString("key");
            String value = call.getString("value");
            if (key != null && value != null) {
                Context context = getContext();
                SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                prefs.edit().putString(key, value).apply();

                SharedPreferences customPrefs = context.getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
                customPrefs.edit().putString(key, value).apply();

                SharedPreferences widgetPrefs = context.getSharedPreferences("SkwelaWidgetPrefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = widgetPrefs.edit();
                editor.putString(key, value);

                if ("widget_schedule_data".equals(key)) {
                    try {
                        org.json.JSONObject json = new org.json.JSONObject(value);
                        String mediumSubject = json.optString("mediumSubject", "");
                        String mediumUpcoming = json.optString("mediumUpcoming", "");
                        String activeText = !mediumSubject.isEmpty() ? mediumSubject : "SkwelaDabaw • No Active Classes Today";
                        String nextText = !mediumUpcoming.isEmpty() ? mediumUpcoming : "Up Next • Free Time";

                        editor.putString("active_class_text", activeText);
                        editor.putString("next_class_text", nextText);
                        editor.putString("active_subject", mediumSubject);
                        editor.putString("active_room", json.optString("smallRoom", ""));
                        editor.putString("active_time", json.optString("smallTime", ""));
                        editor.putString("next_subject", mediumUpcoming);
                    } catch (Exception ignored) {}
                }
                editor.apply();

                // Dispatch explicit update broadcasts to all widget providers
                broadcastUpdateToAllProviders(context);

                if ("all_schedules_json".equals(key) || "widget_schedule_data".equals(key)) {
                    WidgetScheduleHelper.evaluateAndUpdateAllWidgets(context);
                } else if ("widget_tasks_data".equals(key)) {
                    WidgetScheduleHelper.updateWidgetProvidersDirectly(context);
                } else if ("app_theme_id".equals(key)) {
                    WidgetScheduleHelper.evaluateAndUpdateAllWidgets(context);
                    WidgetScheduleHelper.updateWidgetProvidersDirectly(context);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set widget data", e);
        }
    }

    private void broadcastUpdateToAllProviders(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            Class<?>[] providers = new Class<?>[]{
                SkwelaWidgetProvider.class,
                ScheduleSmallWidgetProvider.class,
                ScheduleMediumWidgetProvider.class,
                ScheduleLargeWidgetProvider.class,
                TasksWidgetProvider.class
            };

            for (Class<?> cls : providers) {
                int[] ids = manager.getAppWidgetIds(new ComponentName(context, cls));
                if (ids != null && ids.length > 0) {
                    Intent intent = new Intent(context, cls);
                    intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                    context.sendBroadcast(intent);
                }
            }

            Intent broadIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            context.sendBroadcast(broadIntent);
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void updateWidgets(PluginCall call) {
        try {
            Context context = getContext();
            WidgetScheduleHelper.evaluateAndUpdateAllWidgets(context);
            WidgetScheduleHelper.updateWidgetProvidersDirectly(context);
            broadcastUpdateToAllProviders(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widgets", e);
        }
    }

    @PluginMethod
    public void isBatteryOptimized(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                boolean isIgnoring = pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
                JSObject ret = new JSObject();
                ret.put("isIgnoringBatteryOptimizations", isIgnoring);
                call.resolve(ret);
                return;
            }
            JSObject ret = new JSObject();
            ret.put("isIgnoringBatteryOptimizations", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error checking battery optimization", e);
        }
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        try {
            Context context = getContext();
            Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity is unavailable");
                return;
            }

            activity.runOnUiThread(() -> {
                try {
                    String packageName = context.getPackageName();
                    boolean opened = false;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                        boolean isIgnoring = pm != null && pm.isIgnoringBatteryOptimizations(packageName);

                        if (!isIgnoring) {
                            // Tier 1: Direct OS Dialog Prompt
                            try {
                                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                                intent.setData(Uri.parse("package:" + packageName));
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                activity.startActivity(intent);
                                opened = true;
                            } catch (Exception ex) {
                                // Fallback Tier 2: System battery optimization list
                                try {
                                    Intent listIntent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                                    listIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    activity.startActivity(listIntent);
                                    opened = true;
                                } catch (Exception ignored) {}
                            }
                        } else {
                            // Already exempted, open list if user wants to review
                            try {
                                Intent listIntent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                                listIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                activity.startActivity(listIntent);
                                opened = true;
                            } catch (Exception ignored) {}
                        }
                    }

                    if (!opened) {
                        // Tier 3: OEM Auto-Start & Background Managers (Xiaomi/HyperOS, Samsung, Oppo, Vivo, Huawei)
                        opened = launchOemBatterySettings(activity, packageName);
                    }

                    if (!opened) {
                        // Tier 4: Direct App Info settings (user can toggle Battery -> Unrestricted)
                        try {
                            Intent appSettingsIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            appSettingsIntent.setData(Uri.parse("package:" + packageName));
                            appSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            activity.startActivity(appSettingsIntent);
                            opened = true;
                        } catch (Exception ignored) {}
                    }

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("opened", opened);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Failed to request battery exemption", e);
                }
            });
        } catch (Exception e) {
            call.reject("Failed to request battery exemption", e);
        }
    }

    private boolean launchOemBatterySettings(Activity activity, String packageName) {
        Intent[] oemIntents = new Intent[] {
            // Xiaomi / HyperOS / MIUI
            new Intent().setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
            new Intent().setComponent(new ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.PowerHideActivity")),
            // Samsung Device Care / Battery
            new Intent().setComponent(new ComponentName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")),
            new Intent().setComponent(new ComponentName("com.samsung.android.sm", "com.samsung.android.sm.battery.ui.BatteryActivity")),
            // Huawei Startup / Protected Apps
            new Intent().setComponent(new ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")),
            new Intent().setComponent(new ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")),
            // Oppo / Realme Startup
            new Intent().setComponent(new ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
            new Intent().setComponent(new ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")),
            // Vivo Auto-Start / Whitelist
            new Intent().setComponent(new ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")),
            new Intent().setComponent(new ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.PurviewTabActivity"))
        };

        for (Intent intent : oemIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (activity.getPackageManager().resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY) != null) {
                    activity.startActivity(intent);
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        try {
            Context context = getContext();
            boolean granted = true;
            boolean openedSettings = false;

            if (Build.VERSION.SDK_INT >= 33) {
                granted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                if (!granted) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        openedSettings = true;
                    } catch (Exception e) {
                        Intent appSettingsIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        appSettingsIntent.setData(Uri.parse("package:" + context.getPackageName()));
                        appSettingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(appSettingsIntent);
                        openedSettings = true;
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("granted", granted);
            ret.put("openedSettings", openedSettings);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request notification permission", e);
        }
    }

    @PluginMethod
    public void postUnremovableNotification(PluginCall call) {
        try {
            Context context = getContext();
            String title = call.getString("title", "SkwelaDabaw Class Status");
            String body = call.getString("body", "Student Timetable");
            String subText = call.getString("subText", "Timetable");

            String currentClass = call.getString("currentClass", "");
            String currentRoom = call.getString("currentRoom", "");
            String currentTime = call.getString("currentTime", "");
            String nextClass = call.getString("nextClass", "");
            String nextRoom = call.getString("nextRoom", "");
            String nextTime = call.getString("nextTime", "");
            String statusState = call.getString("statusState", "");
            String themeKey = call.getString("themeKey", "midnight");
            String themeBg = call.getString("themeBg", "#141416");
            String themeAccent = call.getString("themeAccent", "#3B82F6");
            String themeBorder = call.getString("themeBorder", "#2C2C2E");
            String themeText = call.getString("themeText", "#FFFFFF");

            Intent serviceIntent = new Intent(context, SkwelaOngoingService.class);
            serviceIntent.setAction(SkwelaOngoingService.ACTION_START);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_TITLE, title);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_BODY, body);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_SUBTEXT, subText);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_CURRENT_CLASS, currentClass);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_CURRENT_ROOM, currentRoom);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_CURRENT_TIME, currentTime);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_NEXT_CLASS, nextClass);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_NEXT_ROOM, nextRoom);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_NEXT_TIME, nextTime);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_STATUS_STATE, statusState);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_THEME_KEY, themeKey);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_THEME_BG, themeBg);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_THEME_ACCENT, themeAccent);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_THEME_BORDER, themeBorder);
            serviceIntent.putExtra(SkwelaOngoingService.EXTRA_THEME_TEXT, themeText);

            ContextCompat.startForegroundService(context, serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to post unremovable notification", e);
        }
    }

    @PluginMethod
    public void cancelUnremovableNotification(PluginCall call) {
        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, SkwelaOngoingService.class);
            serviceIntent.setAction(SkwelaOngoingService.ACTION_STOP);
            context.startService(serviceIntent);

            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(SkwelaOngoingService.ONGOING_NOTIFICATION_ID);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to cancel unremovable notification", e);
        }
    }

    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        try {
            String dataUrl = call.getString("dataUrl");
            String fileName = call.getString("fileName", "SkwelaDabaw_Timetable.png");
            if (dataUrl == null || !dataUrl.contains(",")) {
                call.reject("Invalid image data");
                return;
            }

            String base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
            byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);

            Context context = getContext();
            ContentResolver resolver = context.getContentResolver();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/SkwelaDabaw");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream out = resolver.openOutputStream(uri)) {
                        if (out != null) {
                            out.write(imageBytes);
                            out.flush();
                        }
                    }
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(uri, values, null, null);
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SkwelaDabaw");
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File imageFile = new File(dir, fileName);
                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                    fos.write(imageBytes);
                    fos.flush();
                }
                android.media.MediaScannerConnection.scanFile(context, new String[]{imageFile.getAbsolutePath()}, new String[]{"image/png"}, null);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "Wallpaper saved to Photos/SkwelaDabaw album");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save image to gallery", e);
        }
    }

    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is not available");
            return;
        }

        boolean hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (!hasFine && !hasCoarse) {
            requestPermissionForAlias("location", call, "locationPermsCallback");
            return;
        }

        fetchNativeLocation(call);
    }

    @PermissionCallback
    public void locationPermsCallback(PluginCall call) {
        Context context = getContext();
        boolean hasFine = context != null && ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = context != null && ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (hasFine || hasCoarse) {
            fetchNativeLocation(call);
        } else {
            call.reject("Location permission was denied by user");
        }
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Activity activity = getActivity();
        Context context = activity != null ? activity : getContext();
        if (context != null) {
            String type = call.getString("type", "location");
            try {
                Intent intent;
                if ("permission".equalsIgnoreCase(type)) {
                    intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.fromParts("package", context.getPackageName(), null));
                } else {
                    intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (activity != null) {
                    activity.startActivity(intent);
                } else {
                    context.startActivity(intent);
                }
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                try {
                    Intent fallbackIntent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                    fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    if (activity != null) {
                        activity.startActivity(fallbackIntent);
                    } else {
                        context.startActivity(fallbackIntent);
                    }
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                    return;
                } catch (Exception ignored) {}
            }
        }
        call.reject("Unable to open device settings");
    }

    @PluginMethod
    public void checkLocationStatus(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is not available");
            return;
        }
        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = false;
        boolean isNetworkEnabled = false;
        if (lm != null) {
            try {
                isGpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER);
            } catch (Exception ignored) {}
            try {
                isNetworkEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            } catch (Exception ignored) {}
        }
        boolean hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("isPermitted", hasFine || hasCoarse);
        ret.put("isGpsEnabled", isGpsEnabled || isNetworkEnabled);
        call.resolve(ret);
    }

    private void fetchNativeLocation(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context is not available");
            return;
        }

        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) {
            call.reject("LocationManager service not found");
            return;
        }

        boolean isGpsEnabled = false;
        boolean isNetworkEnabled = false;
        try {
            isGpsEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER);
        } catch (Exception ignored) {}
        try {
            isNetworkEnabled = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception ignored) {}

        if (!isGpsEnabled && !isNetworkEnabled) {
            call.reject("Location services are disabled in device settings");
            return;
        }

        // 1. Check for best recent cached location across all providers
        Location bestLocation = null;
        try {
            List<String> providers = lm.getAllProviders();
            if (providers != null) {
                for (String provider : providers) {
                    if (provider == null) continue;
                    try {
                        Location l = lm.getLastKnownLocation(provider);
                        if (l != null) {
                            if (bestLocation == null || l.getTime() > bestLocation.getTime() || (l.getAccuracy() < bestLocation.getAccuracy() && (System.currentTimeMillis() - l.getTime()) < 600000)) {
                                bestLocation = l;
                            }
                        }
                    } catch (SecurityException ignored) {}
                }
            }
        } catch (Exception ignored) {}

        // If cached location is fresh (< 20 seconds) and high-accuracy (<= 25 meters), return immediately
        long now = System.currentTimeMillis();
        if (bestLocation != null && (now - bestLocation.getTime()) < 20000 && bestLocation.getAccuracy() <= 25.0f) {
            JSObject res = new JSObject();
            res.put("lat", bestLocation.getLatitude());
            res.put("lng", bestLocation.getLongitude());
            res.put("accuracy", (double) bestLocation.getAccuracy());
            call.resolve(res);
            return;
        }

        // 2. Request updates concurrently (GPS for pinpoint precision, Network as immediate coarse fallback)
        final Location[] currentBest = { bestLocation };
        android.os.Handler handler = new android.os.Handler(Looper.getMainLooper());
        final boolean[] resolved = {false};
        final LocationListener commonListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (resolved[0]) return;
                
                // Track best location seen
                if (currentBest[0] == null || location.getAccuracy() < currentBest[0].getAccuracy()) {
                    currentBest[0] = location;
                }

                // If high accuracy (< 25m) or from GPS provider, resolve immediately
                if (location.getAccuracy() <= 25.0f || LocationManager.GPS_PROVIDER.equals(location.getProvider())) {
                    resolved[0] = true;
                    try { lm.removeUpdates(this); } catch (Exception ignored) {}

                    JSObject res = new JSObject();
                    res.put("lat", location.getLatitude());
                    res.put("lng", location.getLongitude());
                    res.put("accuracy", (double) location.getAccuracy());
                    call.resolve(res);
                }
            }

            @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };

        handler.postDelayed(() -> {
            if (resolved[0]) return;
            resolved[0] = true;
            try { lm.removeUpdates(commonListener); } catch (Exception ignored) {}

            Location fallback = currentBest[0];
            if (fallback != null) {
                JSObject res = new JSObject();
                res.put("lat", fallback.getLatitude());
                res.put("lng", fallback.getLongitude());
                res.put("accuracy", (double) fallback.getAccuracy());
                call.resolve(res);
            } else {
                call.reject("GPS location request timed out");
            }
        }, 6500);

        try {
            if (isNetworkEnabled) {
                lm.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, commonListener, Looper.getMainLooper());
            }
            if (isGpsEnabled) {
                lm.requestSingleUpdate(LocationManager.GPS_PROVIDER, commonListener, Looper.getMainLooper());
            }
        } catch (SecurityException e) {
            if (!resolved[0]) {
                resolved[0] = true;
                call.reject("Location permission security exception: " + e.getMessage());
            }
        } catch (Exception e) {
            if (!resolved[0]) {
                Location fallbackLoc = currentBest[0];
                if (fallbackLoc != null) {
                    resolved[0] = true;
                    JSObject res = new JSObject();
                    res.put("lat", fallbackLoc.getLatitude());
                    res.put("lng", fallbackLoc.getLongitude());
                    res.put("accuracy", (double) fallbackLoc.getAccuracy());
                    call.resolve(res);
                } else {
                    resolved[0] = true;
                    call.reject("Failed to request location: " + e.getMessage());
                }
            }
        }
    }
}
