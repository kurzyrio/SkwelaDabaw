package com.kurzyrio.skweladabaw;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EagleOverlay")
public class EagleOverlayPlugin extends Plugin {

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        Context context = getContext();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            granted = Settings.canDrawOverlays(context);
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context context = getContext();
        Activity activity = getActivity();
        boolean granted = true;
        boolean openedSettings = false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            granted = Settings.canDrawOverlays(context);
            if (!granted) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    if (activity != null) {
                        activity.startActivity(intent);
                    } else {
                        context.startActivity(intent);
                    }
                    openedSettings = true;
                } catch (Exception e) {
                    try {
                        Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        fallback.setData(Uri.parse("package:" + context.getPackageName()));
                        fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        if (activity != null) {
                            activity.startActivity(fallback);
                        } else {
                            context.startActivity(fallback);
                        }
                        openedSettings = true;
                    } catch (Exception ignored) {}
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        ret.put("openedSettings", openedSettings);
        call.resolve(ret);
    }

    @PluginMethod
    public void startEagleOverlay(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            call.reject("OVERLAY_PERMISSION_REQUIRED");
            return;
        }

        try {
            context.getSharedPreferences(EagleOverlayService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(EagleOverlayService.PREF_IS_ACTIVE, true)
                .apply();

            Intent intent = new Intent(context, EagleOverlayService.class);
            intent.setAction(EagleOverlayService.ACTION_START);
            ContextCompat.startForegroundService(context, intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start Eagle Overlay", e);
        }
    }

    @PluginMethod
    public void stopEagleOverlay(PluginCall call) {
        try {
            Context context = getContext();
            context.getSharedPreferences(EagleOverlayService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(EagleOverlayService.PREF_IS_ACTIVE, false)
                .apply();

            Intent intent = new Intent(context, EagleOverlayService.class);
            intent.setAction(EagleOverlayService.ACTION_STOP);
            context.startService(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop Eagle Overlay", e);
        }
    }

    @PluginMethod
    public void isOverlayRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", EagleOverlayService.isRunning());
        call.resolve(ret);
    }

    @PluginMethod
    public void syncOverlayData(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(EagleOverlayService.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("weatherTemp")) editor.putString("weather_temp", call.getString("weatherTemp"));
            if (call.hasOption("weatherCondition")) editor.putString("weather_condition", call.getString("weatherCondition"));
            if (call.hasOption("heatIndex")) editor.putString("heat_index", call.getString("heatIndex"));
            if (call.hasOption("currentClass")) editor.putString("current_class", call.getString("currentClass"));
            if (call.hasOption("currentRoom")) editor.putString("current_room", call.getString("currentRoom"));
            if (call.hasOption("currentTime")) editor.putString("current_time", call.getString("currentTime"));
            if (call.hasOption("nextClass")) editor.putString("next_class", call.getString("nextClass"));
            if (call.hasOption("nextRoom")) editor.putString("next_room", call.getString("nextRoom"));
            if (call.hasOption("nextTime")) editor.putString("next_time", call.getString("nextTime"));
            if (call.hasOption("statusState")) editor.putString("status_state", call.getString("statusState"));
            if (call.hasOption("pendingTasksCount")) editor.putInt("pending_tasks_count", call.getInt("pendingTasksCount", 0));
            if (call.hasOption("nextTaskTitle")) editor.putString("next_task_title", call.getString("nextTaskTitle"));
            if (call.hasOption("nextTaskDue")) editor.putString("next_task_due", call.getString("nextTaskDue"));
            editor.apply();

            if (EagleOverlayService.isRunning()) {
                Intent updateIntent = new Intent(context, EagleOverlayService.class);
                updateIntent.setAction(EagleOverlayService.ACTION_UPDATE_DATA);
                context.startService(updateIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to sync overlay data", e);
        }
    }
}
