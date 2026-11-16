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

            // Also keep ongoing status bar notification in sync without illegal background startForegroundService on Android 12+
            SkwelaOngoingService.refreshNotificationFromBackground(context);
        } catch (Exception e) {
            Log.w(TAG, "Error executing widget evaluation in receiver", e);
        }
    }
}
