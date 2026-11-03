package com.kurzyrio.skweladabaw;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

public class WidgetActionReceiver extends BroadcastReceiver {
    private static final String TAG = "WidgetActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        Log.d(TAG, "Interactive widget action received: " + action + " for widgetId: " + appWidgetId);

        SharedPreferences prefs = context.getSharedPreferences(WidgetScheduleHelper.PREFS_NAME, Context.MODE_PRIVATE);

        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            String offsetKey = "selected_day_offset_" + appWidgetId;
            if (WidgetScheduleHelper.ACTION_WIDGET_NAVIGATE_DAY.equals(action)) {
                int delta = intent.getIntExtra("delta", 0);
                int currentOffset = prefs.getInt(offsetKey, 0);
                int newOffset = currentOffset + delta;
                if (newOffset > 6) newOffset = -6;
                if (newOffset < -6) newOffset = 6;
                prefs.edit().putInt(offsetKey, newOffset).apply();
                WidgetScheduleHelper.updateWidgetInstance(context, appWidgetId);
            } else if (WidgetScheduleHelper.ACTION_WIDGET_TODAY.equals(action)) {
                prefs.edit().putInt(offsetKey, 0).apply();
                WidgetScheduleHelper.updateWidgetInstance(context, appWidgetId);
            } else if (WidgetScheduleHelper.ACTION_WIDGET_REFRESH.equals(action)) {
                WidgetScheduleHelper.updateWidgetInstance(context, appWidgetId);
            }
        } else {
            // Global action fallback
            if (WidgetScheduleHelper.ACTION_WIDGET_NAVIGATE_DAY.equals(action)) {
                int delta = intent.getIntExtra("delta", 0);
                int currentOffset = prefs.getInt("selected_day_offset", 0);
                int newOffset = currentOffset + delta;
                if (newOffset > 6) newOffset = -6;
                if (newOffset < -6) newOffset = 6;
                prefs.edit().putInt("selected_day_offset", newOffset).apply();
                WidgetScheduleHelper.evaluateAndUpdateAllWidgets(context);
            } else if (WidgetScheduleHelper.ACTION_WIDGET_TODAY.equals(action) || WidgetScheduleHelper.ACTION_WIDGET_REFRESH.equals(action)) {
                prefs.edit().putInt("selected_day_offset", 0).apply();
                WidgetScheduleHelper.evaluateAndUpdateAllWidgets(context);
            }
        }
    }
}
