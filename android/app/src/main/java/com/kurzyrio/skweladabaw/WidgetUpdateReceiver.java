package com.kurzyrio.skweladabaw;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class WidgetUpdateReceiver extends BroadcastReceiver {
    private static final String TAG = "WidgetUpdateReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "Received widget update broadcast with action: " + action);

        try {
            WidgetScheduleHelper.evaluateAndUpdateAllWidgets(context);

            // Also keep ongoing status bar notification in sync with real-time class transitions
            SharedPreferences ongoingPrefs = context.getSharedPreferences("skweladabaw_ongoing_service_prefs", Context.MODE_PRIVATE);
            if (ongoingPrefs.getBoolean("pref_is_active", false)) {
                Intent serviceIntent = new Intent(context, SkwelaOngoingService.class);
                serviceIntent.setAction(SkwelaOngoingService.ACTION_UPDATE);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error executing widget evaluation in receiver", e);
        }
    }
}
