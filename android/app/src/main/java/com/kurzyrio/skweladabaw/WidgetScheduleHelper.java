package com.kurzyrio.skweladabaw;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class WidgetScheduleHelper {
    private static final String TAG = "WidgetScheduleHelper";
    public static final String ACTION_SCHEDULE_WIDGET_UPDATE = "com.kurzyrio.skweladabaw.ACTION_SCHEDULE_WIDGET_UPDATE";
    public static final String ACTION_WIDGET_NAVIGATE_DAY = "com.kurzyrio.skweladabaw.ACTION_WIDGET_NAVIGATE_DAY";
    public static final String ACTION_WIDGET_REFRESH = "com.kurzyrio.skweladabaw.ACTION_WIDGET_REFRESH";
    public static final String ACTION_WIDGET_TODAY = "com.kurzyrio.skweladabaw.ACTION_WIDGET_TODAY";
    public static final String PREFS_NAME = "SkwelaWidgetPrefs";

    public static class ScheduleItem {
        public String id;
        public String subjectCode;
        public String subjectName;
        public String room;
        public String building;
        public String startTime;
        public String endTime;
        public List<String> days = new ArrayList<>();
        public int startMinutes;
        public int endMinutes;
        public int reminderMinutes = 10;
    }

    public static class RoutineItem {
        public String id;
        public String title;
        public String time;
        public String dayOfWeek;
        public boolean enabled = true;
        public String notes;
        public int timeMinutes;
    }

    public static class TaskWidgetItem {
        public String id;
        public String title;
        public String dueDate;
        public String dueTime;
        public String priority;
        public String courseCode;
        public boolean completed;
        public String notes;
    }

    public static PendingIntent getPendingIntentForAction(Context context, String action, int delta, int requestCode) {
        return getPendingIntentForWidgetAction(context, action, AppWidgetManager.INVALID_APPWIDGET_ID, delta, requestCode);
    }

    public static PendingIntent getPendingIntentForWidgetAction(Context context, String action, int appWidgetId, int delta, int requestCode) {
        Intent intent = new Intent(context, WidgetActionReceiver.class);
        intent.setAction(action);
        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        }
        if (delta != 0) {
            intent.putExtra("delta", delta);
        }
        intent.setData(Uri.parse("skwelawidget://action/" + action + "/" + appWidgetId + "/" + delta + "/" + requestCode));
        return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static PendingIntent getPendingIntentForTab(Context context, String tab, int requestCode) {
        return getPendingIntentForTab(context, tab, null, requestCode);
    }

    public static PendingIntent getPendingIntentForTab(Context context, String tab, String action, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_tab", tab);
        if (action != null) {
            intent.putExtra("target_action", action);
        }
        String dataUri = "skweladabaw://" + tab + (action != null ? "?action=" + action : "") + "#" + requestCode;
        intent.setData(Uri.parse(dataUri));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static List<ScheduleItem> getAllScheduleItems(Context context) {
        List<ScheduleItem> list = new ArrayList<>();
        if (context == null) return list;

        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String allSchedulesJson = widgetPrefs.getString("all_schedules_json", null);

        if (allSchedulesJson == null || allSchedulesJson.trim().isEmpty()) {
            SharedPreferences capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            allSchedulesJson = capPrefs.getString("all_schedules_json", null);
        }
        if (allSchedulesJson == null || allSchedulesJson.trim().isEmpty()) {
            SharedPreferences customPrefs = context.getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
            allSchedulesJson = customPrefs.getString("all_schedules_json", null);
        }

        if (allSchedulesJson != null && !allSchedulesJson.trim().isEmpty()) {
            try {
                JSONArray arr = new JSONArray(allSchedulesJson);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    ScheduleItem item = new ScheduleItem();
                    item.id = obj.optString("id", obj.optString("c", ""));
                    item.subjectCode = obj.optString("subjectCode", obj.optString("c", ""));
                    item.subjectName = obj.optString("subjectName", obj.optString("n", ""));
                    item.room = obj.optString("room", obj.optString("r", ""));
                    item.building = obj.optString("building", obj.optString("b", ""));
                    item.startTime = obj.optString("startTime", obj.optString("s", ""));
                    item.endTime = obj.optString("endTime", obj.optString("e", ""));
                    item.startMinutes = parseMinutes(item.startTime);
                    item.endMinutes = parseMinutes(item.endTime);
                    item.reminderMinutes = obj.optInt("reminderMinutes", obj.optInt("reminder_minutes", 10));

                    JSONArray daysArr = obj.optJSONArray("days");
                    if (daysArr == null) {
                        daysArr = obj.optJSONArray("d");
                    }
                    if (daysArr != null) {
                        for (int d = 0; d < daysArr.length(); d++) {
                            item.days.add(daysArr.optString(d));
                        }
                    } else {
                        String daysStr = obj.optString("days", obj.optString("d", ""));
                        if (!daysStr.isEmpty()) {
                            String[] parts = daysStr.split(",");
                            for (String p : parts) {
                                item.days.add(p.trim());
                            }
                        }
                    }

                    list.add(item);
                }
            } catch (Exception e) {
                Log.w(TAG, "Error parsing all schedules JSON", e);
            }
        }
        return list;
    }

    public static void evaluateAndUpdateAllWidgets(Context context) {
        if (context == null) return;

        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        List<ScheduleItem> allParsed = getAllScheduleItems(context);

        Calendar now = Calendar.getInstance();
        int todayDayOfWeek = now.get(Calendar.DAY_OF_WEEK);
        String actualTodayName = getDayName(todayDayOfWeek);
        int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        List<ScheduleItem> todayClasses = new ArrayList<>();
        for (ScheduleItem it : allParsed) {
            if (matchesDay(it.days, actualTodayName)) {
                todayClasses.add(it);
            }
        }

        Collections.sort(todayClasses, new Comparator<ScheduleItem>() {
            @Override
            public int compare(ScheduleItem a, ScheduleItem b) {
                return Integer.compare(a.startMinutes, b.startMinutes);
            }
        });

        ScheduleItem currentClass = null;
        ScheduleItem nextClass = null;
        for (ScheduleItem cls : todayClasses) {
            if (currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes) {
                currentClass = cls;
            } else if (currentMinutes < cls.startMinutes) {
                if (nextClass == null) nextClass = cls;
            }
        }

        long nextTransitionMillis = 0;
        if (currentClass != null) {
            nextTransitionMillis = getTimestampForMinutesToday(now, currentClass.endMinutes);
        } else if (nextClass != null) {
            nextTransitionMillis = getTimestampForMinutesToday(now, nextClass.startMinutes);
        } else {
            nextTransitionMillis = getMidnightTomorrowTimestamp(now);
        }

        // Update all provider instances directly
        updateWidgetProvidersDirectly(context);

        if (nextTransitionMillis > System.currentTimeMillis()) {
            scheduleNextTransitionAlarm(context, nextTransitionMillis);
        }
    }

    public static class WidgetTheme {
        public int cardBgRes;
        public int itemBgRes;
        public int btnBgRes;
        public int badgeBgRes;
        public int textPrimary;
        public int textSecondary;
        public int textAccent;
        public int badgeTextColor;
        public int btnTextColor;
    }

    public static String getActiveThemeId(Context context) {
        if (context == null) return "light";
        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String themeId = widgetPrefs.getString("app_theme_id", null);
        if (themeId == null || themeId.trim().isEmpty()) {
            SharedPreferences capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            themeId = capPrefs.getString("skweladabaw_theme", null);
            if (themeId == null || themeId.trim().isEmpty()) {
                themeId = capPrefs.getString("app_theme_id", null);
            }
        }
        if (themeId == null || themeId.trim().isEmpty()) {
            SharedPreferences customPrefs = context.getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
            themeId = customPrefs.getString("app_theme_id", null);
        }
        if (themeId == null || themeId.trim().isEmpty()) {
            return "light";
        }
        return themeId.toLowerCase().trim();
    }

    public static WidgetTheme getWidgetTheme(Context context) {
        String id = getActiveThemeId(context);
        WidgetTheme t = new WidgetTheme();
        if ("dark".equals(id) || "bw-dark".equals(id)) {
            t.cardBgRes = R.drawable.widget_card_bg_dark;
            t.itemBgRes = R.drawable.widget_item_bg_dark;
            t.btnBgRes = R.drawable.widget_btn_bg_dark;
            t.badgeBgRes = R.drawable.widget_badge_bg_dark;
            t.textPrimary = 0xFFFFFFFF;
            t.textSecondary = 0xFF8E8E93;
            t.textAccent = 0xFF38BDF8;
            t.badgeTextColor = 0xFF38BDF8;
            t.btnTextColor = 0xFF93C5FD;
        } else if ("oled".equals(id)) {
            t.cardBgRes = R.drawable.widget_card_bg_oled;
            t.itemBgRes = R.drawable.widget_item_bg_oled;
            t.btnBgRes = R.drawable.widget_btn_bg_oled;
            t.badgeBgRes = R.drawable.widget_badge_bg_oled;
            t.textPrimary = 0xFFFFFFFF;
            t.textSecondary = 0xFFA1A1AA;
            t.textAccent = 0xFFFFFFFF;
            t.badgeTextColor = 0xFFFFFFFF;
            t.btnTextColor = 0xFFFFFFFF;
        } else if ("emerald".equals(id)) {
            t.cardBgRes = R.drawable.widget_card_bg_emerald;
            t.itemBgRes = R.drawable.widget_item_bg_emerald;
            t.btnBgRes = R.drawable.widget_btn_bg_emerald;
            t.badgeBgRes = R.drawable.widget_badge_bg_emerald;
            t.textPrimary = 0xFFECFDF5;
            t.textSecondary = 0xFFA7F3D0;
            t.textAccent = 0xFF10B981;
            t.badgeTextColor = 0xFF10B981;
            t.btnTextColor = 0xFF6EE7B7;
        } else if ("cyber".equals(id)) {
            t.cardBgRes = R.drawable.widget_card_bg_cyber;
            t.itemBgRes = R.drawable.widget_item_bg_cyber;
            t.btnBgRes = R.drawable.widget_btn_bg_cyber;
            t.badgeBgRes = R.drawable.widget_badge_bg_cyber;
            t.textPrimary = 0xFFFFFFFF;
            t.textSecondary = 0xFF80DEEA;
            t.textAccent = 0xFF00E5FF;
            t.badgeTextColor = 0xFF00E5FF;
            t.btnTextColor = 0xFF00E5FF;
        } else if ("violet".equals(id)) {
            t.cardBgRes = R.drawable.widget_card_bg_violet;
            t.itemBgRes = R.drawable.widget_item_bg_violet;
            t.btnBgRes = R.drawable.widget_btn_bg_violet;
            t.badgeBgRes = R.drawable.widget_badge_bg_violet;
            t.textPrimary = 0xFF1E1B4B;
            t.textSecondary = 0xFF6D28D9;
            t.textAccent = 0xFF7C3AED;
            t.badgeTextColor = 0xFF7C3AED;
            t.btnTextColor = 0xFF7C3AED;
        } else {
            // Default "light" (Morning Sun Light)
            t.cardBgRes = R.drawable.widget_card_bg_light;
            t.itemBgRes = R.drawable.widget_item_bg_light;
            t.btnBgRes = R.drawable.widget_btn_bg_light;
            t.badgeBgRes = R.drawable.widget_badge_bg_light;
            t.textPrimary = 0xFF000000;
            t.textSecondary = 0xFF6C6C70;
            t.textAccent = 0xFF007AFF;
            t.badgeTextColor = 0xFF007AFF;
            t.btnTextColor = 0xFF007AFF;
        }
        return t;
    }

    public static RemoteViews buildLargeWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_schedule_large);
        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Individual day offset per widget ID
        String offsetKey = "selected_day_offset_" + appWidgetId;
        int dayOffset = widgetPrefs.getInt(offsetKey, 0);

        Calendar now = Calendar.getInstance();
        Calendar targetCal = (Calendar) now.clone();
        targetCal.add(Calendar.DAY_OF_YEAR, dayOffset);
        int targetDayOfWeek = targetCal.get(Calendar.DAY_OF_WEEK);
        String targetDayName = getDayName(targetDayOfWeek);
        boolean isViewingToday = (dayOffset == 0);

        List<ScheduleItem> allParsed = getAllScheduleItems(context);
        List<ScheduleItem> targetDayClasses = new ArrayList<>();
        for (ScheduleItem item : allParsed) {
            if (matchesDay(item.days, targetDayName)) {
                targetDayClasses.add(item);
            }
        }

        Collections.sort(targetDayClasses, new Comparator<ScheduleItem>() {
            @Override
            public int compare(ScheduleItem a, ScheduleItem b) {
                return Integer.compare(a.startMinutes, b.startMinutes);
            }
        });

        String largeDay;
        if (isViewingToday) {
            largeDay = "Today • " + targetDayName;
        } else if (dayOffset == 1) {
            largeDay = "Tomorrow • " + targetDayName;
        } else if (dayOffset == -1) {
            largeDay = "Yesterday • " + targetDayName;
        } else {
            largeDay = targetDayName + " • " + (dayOffset > 0 ? "+" + dayOffset + "d" : dayOffset + "d");
        }
        views.setTextViewText(R.id.widget_large_day, largeDay);

        // Click handlers bound to this specific widget instance
        views.setOnClickPendingIntent(R.id.widget_large_root,
                getPendingIntentForTab(context, "schedule", 1004));

        views.setOnClickPendingIntent(R.id.widget_btn_prev_day,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_NAVIGATE_DAY, appWidgetId, -1, 2001 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_btn_next_day,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_NAVIGATE_DAY, appWidgetId, 1, 2002 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_btn_today,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_TODAY, appWidgetId, 0, 2003 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 2004 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_large_btn_add,
                getPendingIntentForTab(context, "schedule", "schedule_add", 2008));

        views.setOnClickPendingIntent(R.id.widget_large_btn_schedule,
                getPendingIntentForTab(context, "schedule", null, 2005));

        views.setOnClickPendingIntent(R.id.widget_large_btn_transit,
                getPendingIntentForTab(context, "jeep", null, 2006));

        views.setOnClickPendingIntent(R.id.widget_large_btn_tasks,
                getPendingIntentForTab(context, "tasks", null, 2007));

        // Configure scrollable ListView adapter
        Intent serviceIntent = new Intent(context, WidgetScheduleListService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_large_list, serviceIntent);
        views.setEmptyView(R.id.widget_large_list, R.id.widget_large_empty);

        // Click template for scrollable list rows
        Intent clickIntent = new Intent(context, MainActivity.class);
        clickIntent.putExtra("target_tab", "schedule");
        PendingIntent clickPendingIntent = PendingIntent.getActivity(
                context,
                1004,
                clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.widget_large_list, clickPendingIntent);

        // Apply active theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.widget_large_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_large_badge, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_large_badge, theme.badgeTextColor);

        views.setInt(R.id.widget_btn_prev_day, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_btn_prev_day, theme.btnTextColor);
        views.setInt(R.id.widget_btn_next_day, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_btn_next_day, theme.btnTextColor);
        views.setInt(R.id.widget_btn_today, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_btn_today, theme.textAccent);
        views.setInt(R.id.widget_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_btn_refresh, theme.btnTextColor);
        views.setInt(R.id.widget_large_btn_add, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_large_btn_add, theme.textAccent);

        views.setTextColor(R.id.widget_large_day, theme.textPrimary);
        views.setTextColor(R.id.widget_large_empty_title, theme.textPrimary);
        views.setTextColor(R.id.widget_large_empty_sub, theme.textSecondary);

        views.setInt(R.id.widget_large_btn_schedule, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_large_btn_schedule, theme.textAccent);
        views.setInt(R.id.widget_large_btn_transit, "setBackgroundResource", theme.btnBgRes);
        views.setInt(R.id.widget_large_btn_tasks, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_large_btn_tasks, theme.textSecondary);

        return views;
    }

    public static RemoteViews buildMediumWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_schedule_medium);
        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Individual day offset per widget ID
        String offsetKey = "selected_day_offset_" + appWidgetId;
        int dayOffset = widgetPrefs.getInt(offsetKey, 0);

        Calendar now = Calendar.getInstance();
        Calendar targetCal = (Calendar) now.clone();
        targetCal.add(Calendar.DAY_OF_YEAR, dayOffset);
        int targetDayOfWeek = targetCal.get(Calendar.DAY_OF_WEEK);
        String targetDayName = getDayName(targetDayOfWeek);
        boolean isViewingToday = (dayOffset == 0);
        int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        List<ScheduleItem> allParsed = getAllScheduleItems(context);
        List<ScheduleItem> targetDayClasses = new ArrayList<>();
        for (ScheduleItem item : allParsed) {
            if (matchesDay(item.days, targetDayName)) {
                targetDayClasses.add(item);
            }
        }

        Collections.sort(targetDayClasses, new Comparator<ScheduleItem>() {
            @Override
            public int compare(ScheduleItem a, ScheduleItem b) {
                return Integer.compare(a.startMinutes, b.startMinutes);
            }
        });

        views.setOnClickPendingIntent(R.id.widget_medium_root,
                getPendingIntentForTab(context, "schedule", 1003));

        views.setOnClickPendingIntent(R.id.widget_medium_btn_prev,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_NAVIGATE_DAY, appWidgetId, -1, 3001 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_medium_btn_next,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_NAVIGATE_DAY, appWidgetId, 1, 3002 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_medium_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 3003 + (appWidgetId * 10)));

        views.setOnClickPendingIntent(R.id.widget_medium_btn_add,
                getPendingIntentForTab(context, "schedule", "schedule_add", 3004));

        String countText = targetDayClasses.size() + " classes " + (isViewingToday ? "today" : targetDayName);
        views.setTextViewText(R.id.widget_medium_count, countText);

        ScheduleItem currentClass = null;
        ScheduleItem nextClass = null;
        List<ScheduleItem> remainingClasses = new ArrayList<>();

        if (isViewingToday) {
            for (ScheduleItem cls : targetDayClasses) {
                if (currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes) {
                    currentClass = cls;
                } else if (currentMinutes < cls.startMinutes) {
                    if (nextClass == null) {
                        nextClass = cls;
                    } else {
                        remainingClasses.add(cls);
                    }
                }
            }
        } else if (!targetDayClasses.isEmpty()) {
            nextClass = targetDayClasses.get(0);
            for (int i = 1; i < targetDayClasses.size(); i++) {
                remainingClasses.add(targetDayClasses.get(i));
            }
        }

        if (isViewingToday && currentClass != null) {
            views.setTextViewText(R.id.widget_medium_current_subject, currentClass.subjectCode + " • " + currentClass.subjectName);
            views.setTextViewText(R.id.widget_medium_current_meta, format12Hour(currentClass.startTime) + " - " + format12Hour(currentClass.endTime)
                    + " • Room " + (currentClass.room.isEmpty() ? "Campus" : currentClass.room));
            if (nextClass != null) {
                views.setTextViewText(R.id.widget_medium_upcoming, "Next: " + nextClass.subjectCode + " • " + format12Hour(nextClass.startTime));
            } else {
                views.setTextViewText(R.id.widget_medium_upcoming, "Final class for today");
            }
        } else if (nextClass != null) {
            views.setTextViewText(R.id.widget_medium_current_subject, nextClass.subjectCode + " • " + nextClass.subjectName);
            views.setTextViewText(R.id.widget_medium_current_meta, format12Hour(nextClass.startTime) + " - " + format12Hour(nextClass.endTime)
                    + " • Room " + (nextClass.room.isEmpty() ? "Campus" : nextClass.room));
            if (!remainingClasses.isEmpty()) {
                ScheduleItem after = remainingClasses.get(0);
                views.setTextViewText(R.id.widget_medium_upcoming, "Then: " + after.subjectCode + " • " + format12Hour(after.startTime));
            } else {
                views.setTextViewText(R.id.widget_medium_upcoming, isViewingToday ? "Single class remaining today" : "Only class scheduled");
            }
        } else if (!targetDayClasses.isEmpty()) {
            views.setTextViewText(R.id.widget_medium_current_subject, "All done for " + (isViewingToday ? "today" : targetDayName));
            views.setTextViewText(R.id.widget_medium_current_meta, targetDayClasses.size() + " classes completed");
            views.setTextViewText(R.id.widget_medium_upcoming, "Enjoy your free time");
        } else {
            views.setTextViewText(R.id.widget_medium_count, isViewingToday ? "Free Today" : targetDayName + " Off");
            views.setTextViewText(R.id.widget_medium_current_subject, "Bayani: All Clear Today");
            views.setTextViewText(R.id.widget_medium_current_meta, isViewingToday ? "No classes scheduled • Enjoy your day off" : "Free day on " + targetDayName);
            views.setTextViewText(R.id.widget_medium_upcoming, "Bayani Student Companion");
        }

        // Apply active theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.widget_medium_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_medium_badge, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_medium_badge, theme.badgeTextColor);

        views.setInt(R.id.widget_medium_btn_prev, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_medium_btn_prev, theme.btnTextColor);
        views.setInt(R.id.widget_medium_btn_next, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_medium_btn_next, theme.btnTextColor);
        views.setInt(R.id.widget_medium_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_medium_btn_refresh, theme.btnTextColor);
        views.setInt(R.id.widget_medium_btn_add, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_medium_btn_add, theme.textAccent);

        views.setTextColor(R.id.widget_medium_count, theme.textSecondary);
        views.setTextColor(R.id.widget_medium_current_subject, theme.textPrimary);
        views.setTextColor(R.id.widget_medium_current_meta, theme.textSecondary);
        views.setTextColor(R.id.widget_medium_upcoming, theme.textAccent);

        return views;
    }

    public static RemoteViews buildSmallWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_schedule_small);

        views.setOnClickPendingIntent(R.id.widget_small_root,
                getPendingIntentForTab(context, "schedule", 1002));

        views.setOnClickPendingIntent(R.id.widget_small_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 4001));

        Calendar now = Calendar.getInstance();
        int todayDayOfWeek = now.get(Calendar.DAY_OF_WEEK);
        String todayName = getDayName(todayDayOfWeek);
        int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        List<ScheduleItem> allParsed = getAllScheduleItems(context);
        List<ScheduleItem> todayClasses = new ArrayList<>();
        for (ScheduleItem item : allParsed) {
            if (matchesDay(item.days, todayName)) {
                todayClasses.add(item);
            }
        }

        Collections.sort(todayClasses, new Comparator<ScheduleItem>() {
            @Override
            public int compare(ScheduleItem a, ScheduleItem b) {
                return Integer.compare(a.startMinutes, b.startMinutes);
            }
        });

        ScheduleItem currentClass = null;
        ScheduleItem nextClass = null;
        for (ScheduleItem cls : todayClasses) {
            if (currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes) {
                currentClass = cls;
            } else if (currentMinutes < cls.startMinutes) {
                if (nextClass == null) nextClass = cls;
            }
        }

        if (currentClass != null) {
            views.setTextViewText(R.id.widget_small_badge, "ACTIVE NOW");
            views.setTextViewText(R.id.widget_small_time, format12Hour(currentClass.startTime) + " - " + format12Hour(currentClass.endTime));
            views.setTextViewText(R.id.widget_small_subject, currentClass.subjectCode);
            views.setTextViewText(R.id.widget_small_room, "Room " + (currentClass.room.isEmpty() ? "Campus" : currentClass.room));
        } else if (nextClass != null) {
            views.setTextViewText(R.id.widget_small_badge, "NEXT CLASS");
            views.setTextViewText(R.id.widget_small_time, format12Hour(nextClass.startTime));
            views.setTextViewText(R.id.widget_small_subject, nextClass.subjectCode);
            views.setTextViewText(R.id.widget_small_room, "Room " + (nextClass.room.isEmpty() ? "Campus" : nextClass.room));
        } else if (!todayClasses.isEmpty()) {
            views.setTextViewText(R.id.widget_small_badge, "DONE");
            views.setTextViewText(R.id.widget_small_time, "All Done");
            views.setTextViewText(R.id.widget_small_subject, "Classes finished");
            views.setTextViewText(R.id.widget_small_room, "Rest well!");
        } else {
            views.setTextViewText(R.id.widget_small_badge, "BAYANI");
            views.setTextViewText(R.id.widget_small_time, "All Clear");
            views.setTextViewText(R.id.widget_small_subject, "No classes today");
            views.setTextViewText(R.id.widget_small_room, "Tap to view timetable");
        }

        // Apply active theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.widget_small_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_small_badge, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_small_badge, theme.badgeTextColor);

        views.setInt(R.id.widget_small_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_small_btn_refresh, theme.btnTextColor);

        views.setTextColor(R.id.widget_small_time, theme.textAccent);
        views.setTextColor(R.id.widget_small_subject, theme.textPrimary);
        views.setTextColor(R.id.widget_small_room, theme.textSecondary);

        return views;
    }

    public static RemoteViews buildUnifiedWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.skwela_widget_layout);

        views.setOnClickPendingIntent(R.id.skwela_widget_root,
                getPendingIntentForTab(context, "schedule", 1001));

        views.setOnClickPendingIntent(R.id.skwela_widget_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 1006));

        Calendar now = Calendar.getInstance();
        int todayDayOfWeek = now.get(Calendar.DAY_OF_WEEK);
        String todayName = getDayName(todayDayOfWeek);
        int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        List<ScheduleItem> allParsed = getAllScheduleItems(context);
        List<ScheduleItem> todayClasses = new ArrayList<>();
        for (ScheduleItem item : allParsed) {
            if (matchesDay(item.days, todayName)) {
                todayClasses.add(item);
            }
        }

        Collections.sort(todayClasses, new Comparator<ScheduleItem>() {
            @Override
            public int compare(ScheduleItem a, ScheduleItem b) {
                return Integer.compare(a.startMinutes, b.startMinutes);
            }
        });

        ScheduleItem currentClass = null;
        ScheduleItem nextClass = null;
        for (ScheduleItem cls : todayClasses) {
            if (currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes) {
                currentClass = cls;
            } else if (currentMinutes < cls.startMinutes) {
                if (nextClass == null) nextClass = cls;
            }
        }

        views.setTextViewText(R.id.skwela_widget_count, todayClasses.size() + " classes today");

        if (currentClass != null) {
            views.setTextViewText(R.id.widget_title, "CURRENT CLASS");
            views.setTextViewText(R.id.widget_current_class, currentClass.subjectCode + " • " + currentClass.subjectName);
            views.setTextViewText(R.id.skwela_widget_meta, format12Hour(currentClass.startTime) + " - " + format12Hour(currentClass.endTime)
                    + " • Room " + (currentClass.room.isEmpty() ? "Campus" : currentClass.room));
            views.setTextViewText(R.id.widget_next_class, nextClass != null ? "Next: " + nextClass.subjectCode + " • " + format12Hour(nextClass.startTime) : "Last class of the day");
        } else if (nextClass != null) {
            views.setTextViewText(R.id.widget_title, "NEXT CLASS");
            views.setTextViewText(R.id.widget_current_class, nextClass.subjectCode + " • " + nextClass.subjectName);
            views.setTextViewText(R.id.skwela_widget_meta, format12Hour(nextClass.startTime) + " - " + format12Hour(nextClass.endTime)
                    + " • Room " + (nextClass.room.isEmpty() ? "Campus" : nextClass.room));
            views.setTextViewText(R.id.widget_next_class, "Upcoming today");
        } else if (!todayClasses.isEmpty()) {
            views.setTextViewText(R.id.widget_title, "COMPLETED");
            views.setTextViewText(R.id.widget_current_class, "Classes Completed Today");
            views.setTextViewText(R.id.skwela_widget_meta, todayClasses.size() + " classes finished");
            views.setTextViewText(R.id.widget_next_class, "Have a restful evening");
        } else {
            views.setTextViewText(R.id.widget_title, "BAYANI");
            views.setTextViewText(R.id.widget_current_class, "All Clear For Today");
            views.setTextViewText(R.id.skwela_widget_meta, "No classes scheduled today");
            views.setTextViewText(R.id.widget_next_class, "Bayani Student Companion");
        }

        // Apply active theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.skwela_widget_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_title, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_title, theme.badgeTextColor);

        views.setTextColor(R.id.skwela_widget_count, theme.textSecondary);
        views.setInt(R.id.skwela_widget_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.skwela_widget_btn_refresh, theme.btnTextColor);

        views.setTextColor(R.id.widget_current_class, theme.textPrimary);
        views.setTextColor(R.id.skwela_widget_meta, theme.textSecondary);
        views.setTextColor(R.id.widget_next_class, theme.textAccent);

        return views;
    }

    public static RemoteViews buildTasksWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);

        views.setOnClickPendingIntent(R.id.widget_tasks_root,
                getPendingIntentForTab(context, "tasks", 1005));

        views.setOnClickPendingIntent(R.id.widget_tasks_btn_add,
                getPendingIntentForTab(context, "tasks", "tasks_add", 5001));

        views.setOnClickPendingIntent(R.id.widget_tasks_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 5002));

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("widget_tasks_data", null);
        if (raw == null) {
            SharedPreferences customPrefs = context.getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
            raw = customPrefs.getString("widget_tasks_data", null);
        }
        if (raw == null) {
            SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            raw = widgetPrefs.getString("widget_tasks_data", null);
        }

        String count = "0 Pending";
        String task1Item = "• All caught up!";
        String task1Sub = "Zero pending assignments";
        String task2Item = "";
        String task2Sub = "";

        if (raw != null && !raw.trim().isEmpty()) {
            try {
                JSONObject json = new JSONObject(raw);
                count = json.optString("count", "0 Pending");
                task1Item = json.optString("task1Item", "• All caught up!");
                task1Sub = json.optString("task1Sub", "Zero pending assignments");
                task2Item = json.optString("task2Item", "");
                task2Sub = json.optString("task2Sub", "");
            } catch (Exception ignored) {}
        }

        views.setTextViewText(R.id.widget_tasks_count, count);
        views.setTextViewText(R.id.widget_task_item_1, task1Item);
        views.setTextViewText(R.id.widget_task_sub_1, task1Sub);
        views.setTextViewText(R.id.widget_task_item_2, task2Item != null ? task2Item : "");
        views.setTextViewText(R.id.widget_task_sub_2, task2Sub != null ? task2Sub : "");

        // Apply active theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.widget_tasks_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_tasks_badge, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_tasks_badge, theme.badgeTextColor);

        views.setTextColor(R.id.widget_tasks_count, theme.textSecondary);
        views.setInt(R.id.widget_tasks_btn_add, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_tasks_btn_add, theme.textAccent);
        views.setInt(R.id.widget_tasks_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_tasks_btn_refresh, theme.btnTextColor);

        views.setTextColor(R.id.widget_task_item_1, theme.textPrimary);
        views.setTextColor(R.id.widget_task_sub_1, theme.textAccent);
        views.setTextColor(R.id.widget_task_item_2, theme.textPrimary);
        views.setTextColor(R.id.widget_task_sub_2, theme.textSecondary);

        return views;
    }

    public static List<RoutineItem> getAllRoutineItems(Context context) {
        List<RoutineItem> list = new ArrayList<>();
        if (context == null) return list;

        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String allRoutinesJson = widgetPrefs.getString("all_routines_json", null);

        if (allRoutinesJson == null || allRoutinesJson.trim().isEmpty()) {
            SharedPreferences capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            allRoutinesJson = capPrefs.getString("all_routines_json", null);
        }
        if (allRoutinesJson == null || allRoutinesJson.trim().isEmpty()) {
            SharedPreferences customPrefs = context.getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
            allRoutinesJson = customPrefs.getString("all_routines_json", null);
        }

        if (allRoutinesJson == null || allRoutinesJson.trim().isEmpty()) {
            return list;
        }

        try {
            JSONArray arr = new JSONArray(allRoutinesJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                RoutineItem item = new RoutineItem();
                item.id = obj.optString("id", String.valueOf(i));
                item.title = obj.optString("title", "Routine");
                item.time = obj.optString("time", "08:00");
                item.dayOfWeek = obj.optString("dayOfWeek", "Everyday");
                item.enabled = obj.optBoolean("enabled", true);
                item.notes = obj.optString("notes", "");
                item.timeMinutes = parseMinutes(item.time);
                list.add(item);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error parsing all_routines_json", e);
        }
        return list;
    }

    public static List<TaskWidgetItem> getAllTaskItems(Context context) {
        List<TaskWidgetItem> list = new ArrayList<>();
        if (context == null) return list;

        SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String allTasksJson = widgetPrefs.getString("all_tasks_json", null);

        if (allTasksJson == null || allTasksJson.trim().isEmpty()) {
            SharedPreferences capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            allTasksJson = capPrefs.getString("all_tasks_json", null);
        }
        if (allTasksJson == null || allTasksJson.trim().isEmpty()) {
            SharedPreferences customPrefs = context.getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
            allTasksJson = customPrefs.getString("all_tasks_json", null);
        }

        if (allTasksJson == null || allTasksJson.trim().isEmpty()) {
            return list;
        }

        try {
            JSONArray arr = new JSONArray(allTasksJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                TaskWidgetItem item = new TaskWidgetItem();
                item.id = obj.optString("id", String.valueOf(i));
                item.title = obj.optString("title", "Task");
                item.dueDate = obj.optString("dueDate", "");
                item.dueTime = obj.optString("dueTime", "");
                item.priority = obj.optString("priority", "normal");
                item.courseCode = obj.optString("courseCode", "");
                item.completed = obj.optBoolean("completed", false) || obj.optBoolean("is_completed", false);
                item.notes = obj.optString("notes", "");
                list.add(item);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error parsing all_tasks_json", e);
        }
        return list;
    }

    public static RemoteViews buildRoutinesWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_routines);

        views.setOnClickPendingIntent(R.id.widget_routines_root,
                getPendingIntentForTab(context, "schedule", 1006));

        views.setOnClickPendingIntent(R.id.widget_routines_btn_add,
                getPendingIntentForTab(context, "schedule", "routines", 6001));

        views.setOnClickPendingIntent(R.id.widget_routines_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 6002));

        List<RoutineItem> routines = getAllRoutineItems(context);
        int activeCount = 0;
        for (RoutineItem r : routines) {
            if (r.enabled) activeCount++;
        }
        views.setTextViewText(R.id.widget_routines_count, activeCount + " Active");

        // Remote adapter
        Intent serviceIntent = new Intent(context, WidgetRoutinesListService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_routines_list, serviceIntent);
        views.setEmptyView(R.id.widget_routines_list, R.id.widget_routines_empty);

        Intent clickIntent = new Intent(context, MainActivity.class);
        clickIntent.putExtra("target_tab", "schedule");
        PendingIntent clickPendingIntent = PendingIntent.getActivity(
                context,
                1006,
                clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.widget_routines_list, clickPendingIntent);

        // Apply theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.widget_routines_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_routines_badge, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_routines_badge, theme.badgeTextColor);

        views.setTextColor(R.id.widget_routines_count, theme.textSecondary);
        views.setInt(R.id.widget_routines_btn_add, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_routines_btn_add, theme.textAccent);
        views.setInt(R.id.widget_routines_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_routines_btn_refresh, theme.btnTextColor);

        views.setTextColor(R.id.widget_routines_empty_title, theme.textPrimary);
        views.setTextColor(R.id.widget_routines_empty_sub, theme.textSecondary);
        views.setTextColor(R.id.widget_routines_footer_brand, theme.textSecondary);

        return views;
    }

    public static RemoteViews buildTasksLargeWidgetViews(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks_large);

        views.setOnClickPendingIntent(R.id.widget_tasks_large_root,
                getPendingIntentForTab(context, "tasks", 1007));

        views.setOnClickPendingIntent(R.id.widget_tasks_large_btn_add,
                getPendingIntentForTab(context, "tasks", "tasks_add", 7001));

        views.setOnClickPendingIntent(R.id.widget_tasks_large_btn_refresh,
                getPendingIntentForWidgetAction(context, ACTION_WIDGET_REFRESH, appWidgetId, 0, 7002));

        List<TaskWidgetItem> tasks = getAllTaskItems(context);
        int pendingCount = 0;
        for (TaskWidgetItem t : tasks) {
            if (!t.completed) pendingCount++;
        }
        views.setTextViewText(R.id.widget_tasks_large_count, pendingCount + " Pending");

        // Remote adapter
        Intent serviceIntent = new Intent(context, WidgetTasksListService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_tasks_large_list, serviceIntent);
        views.setEmptyView(R.id.widget_tasks_large_list, R.id.widget_tasks_large_empty);

        Intent clickIntent = new Intent(context, MainActivity.class);
        clickIntent.putExtra("target_tab", "tasks");
        PendingIntent clickPendingIntent = PendingIntent.getActivity(
                context,
                1007,
                clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
        views.setPendingIntentTemplate(R.id.widget_tasks_large_list, clickPendingIntent);

        // Apply theme
        WidgetTheme theme = getWidgetTheme(context);
        views.setInt(R.id.widget_tasks_large_root, "setBackgroundResource", theme.cardBgRes);
        views.setInt(R.id.widget_tasks_large_badge, "setBackgroundResource", theme.badgeBgRes);
        views.setTextColor(R.id.widget_tasks_large_badge, theme.badgeTextColor);

        views.setTextColor(R.id.widget_tasks_large_count, theme.textSecondary);
        views.setInt(R.id.widget_tasks_large_btn_add, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_tasks_large_btn_add, theme.textAccent);
        views.setInt(R.id.widget_tasks_large_btn_refresh, "setBackgroundResource", theme.btnBgRes);
        views.setTextColor(R.id.widget_tasks_large_btn_refresh, theme.btnTextColor);

        views.setTextColor(R.id.widget_tasks_large_empty_title, theme.textPrimary);
        views.setTextColor(R.id.widget_tasks_large_empty_sub, theme.textSecondary);
        views.setTextColor(R.id.widget_tasks_large_footer_brand, theme.textSecondary);

        return views;
    }

    public static void updateWidgetInstance(Context context, int appWidgetId) {
        if (context == null || appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            AppWidgetProviderInfo info = manager.getAppWidgetInfo(appWidgetId);
            if (info == null || info.provider == null) {
                updateWidgetProvidersDirectly(context);
                return;
            }
            String clsName = info.provider.getClassName();
            if (clsName.contains("ScheduleLargeWidgetProvider")) {
                ScheduleLargeWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else if (clsName.contains("ScheduleMediumWidgetProvider")) {
                ScheduleMediumWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else if (clsName.contains("ScheduleSmallWidgetProvider")) {
                ScheduleSmallWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else if (clsName.contains("SkwelaWidgetProvider")) {
                SkwelaWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else if (clsName.contains("TasksLargeWidgetProvider")) {
                TasksLargeWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else if (clsName.contains("TasksWidgetProvider")) {
                TasksWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else if (clsName.contains("RoutinesWidgetProvider")) {
                RoutinesWidgetProvider.updateAppWidget(context, manager, appWidgetId);
            } else {
                updateWidgetProvidersDirectly(context);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error updating specific widget instance: " + appWidgetId, e);
        }
    }

    public static void updateWidgetProvidersDirectly(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);

            int[] skwelaIds = manager.getAppWidgetIds(new ComponentName(context, SkwelaWidgetProvider.class));
            if (skwelaIds != null && skwelaIds.length > 0) {
                for (int id : skwelaIds) {
                    SkwelaWidgetProvider.updateAppWidget(context, manager, id);
                }
            }

            int[] smallIds = manager.getAppWidgetIds(new ComponentName(context, ScheduleSmallWidgetProvider.class));
            if (smallIds != null && smallIds.length > 0) {
                for (int id : smallIds) {
                    ScheduleSmallWidgetProvider.updateAppWidget(context, manager, id);
                }
            }

            int[] mediumIds = manager.getAppWidgetIds(new ComponentName(context, ScheduleMediumWidgetProvider.class));
            if (mediumIds != null && mediumIds.length > 0) {
                for (int id : mediumIds) {
                    ScheduleMediumWidgetProvider.updateAppWidget(context, manager, id);
                }
            }

            int[] largeIds = manager.getAppWidgetIds(new ComponentName(context, ScheduleLargeWidgetProvider.class));
            if (largeIds != null && largeIds.length > 0) {
                for (int id : largeIds) {
                    ScheduleLargeWidgetProvider.updateAppWidget(context, manager, id);
                }
            }

            int[] tasksLargeIds = manager.getAppWidgetIds(new ComponentName(context, TasksLargeWidgetProvider.class));
            if (tasksLargeIds != null && tasksLargeIds.length > 0) {
                for (int id : tasksLargeIds) {
                    TasksLargeWidgetProvider.updateAppWidget(context, manager, id);
                }
            }

            int[] tasksIds = manager.getAppWidgetIds(new ComponentName(context, TasksWidgetProvider.class));
            if (tasksIds != null && tasksIds.length > 0) {
                for (int id : tasksIds) {
                    TasksWidgetProvider.updateAppWidget(context, manager, id);
                }
            }

            int[] routinesIds = manager.getAppWidgetIds(new ComponentName(context, RoutinesWidgetProvider.class));
            if (routinesIds != null && routinesIds.length > 0) {
                for (int id : routinesIds) {
                    RoutinesWidgetProvider.updateAppWidget(context, manager, id);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error updating widget providers directly", e);
        }
    }

    public static void scheduleNextTransitionAlarm(Context context, long triggerAtMillis) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, WidgetUpdateReceiver.class);
            intent.setAction(ACTION_SCHEDULE_WIDGET_UPDATE);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    9001,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                }
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
            Log.d(TAG, "Scheduled next widget transition alarm for millis: " + triggerAtMillis);
        } catch (Exception e) {
            Log.w(TAG, "Failed to schedule widget transition alarm", e);
        }
    }

    public static String getDayName(int calendarDayOfWeek) {
        switch (calendarDayOfWeek) {
            case Calendar.SUNDAY: return "Sunday";
            case Calendar.MONDAY: return "Monday";
            case Calendar.TUESDAY: return "Tuesday";
            case Calendar.WEDNESDAY: return "Wednesday";
            case Calendar.THURSDAY: return "Thursday";
            case Calendar.FRIDAY: return "Friday";
            case Calendar.SATURDAY: return "Saturday";
            default: return "Monday";
        }
    }

    public static int getDayOfWeekFromName(String dayName) {
        if (dayName == null) return Calendar.MONDAY;
        String lower = dayName.trim().toLowerCase();
        if (lower.startsWith("sun")) return Calendar.SUNDAY;
        if (lower.startsWith("mon")) return Calendar.MONDAY;
        if (lower.startsWith("tue")) return Calendar.TUESDAY;
        if (lower.startsWith("wed")) return Calendar.WEDNESDAY;
        if (lower.startsWith("thu")) return Calendar.THURSDAY;
        if (lower.startsWith("fri")) return Calendar.FRIDAY;
        if (lower.startsWith("sat")) return Calendar.SATURDAY;
        return Calendar.MONDAY;
    }

    public static boolean matchesDay(List<String> days, String targetDayName) {
        if (days == null || targetDayName == null || days.isEmpty()) return false;
        int targetDayOfWeek = getDayOfWeekFromName(targetDayName);
        for (String rawDay : days) {
            if (rawDay == null || rawDay.trim().isEmpty()) continue;
            if (dayMatchesDayOfWeek(rawDay.trim(), targetDayOfWeek, targetDayName)) {
                return true;
            }
        }
        return false;
    }

    private static boolean dayMatchesDayOfWeek(String raw, int targetDayOfWeek, String targetDayName) {
        String upper = raw.toUpperCase().trim();
        String targetUpper = targetDayName.toUpperCase().trim();
        String targetPrefix3 = targetUpper.substring(0, Math.min(3, targetUpper.length()));

        if (upper.equals(targetUpper) || (upper.length() >= 3 && upper.startsWith(targetPrefix3))) {
            return true;
        }

        // Split tokens separated by comma, slash, dash, semicolon or whitespace
        String clean = upper.replace("-", " ").replace("/", " ").replace(",", " ").replace(";", " ");
        String[] tokens = clean.split("\\s+");

        for (String token : tokens) {
            if (token.isEmpty()) continue;
            if (token.equals(targetUpper) || (token.length() >= 3 && token.startsWith(targetPrefix3))) {
                return true;
            }

            switch (targetDayOfWeek) {
                case Calendar.MONDAY:
                    if (token.equals("M") || token.equals("MO") || token.equals("MON")) return true;
                    if (token.equals("MWF") || token.equals("MW") || token.equals("MF") || token.equals("MTWTHF") || token.equals("MTWHF")) return true;
                    break;

                case Calendar.TUESDAY:
                    if (token.equals("T") || token.equals("TU") || token.equals("TUE")) return true;
                    if (token.equals("TTH") || token.equals("TT") || token.equals("TF") || token.equals("MTWTHF") || token.equals("MTWHF")) return true;
                    break;

                case Calendar.WEDNESDAY:
                    if (token.equals("W") || token.equals("WE") || token.equals("WED")) return true;
                    if (token.equals("MWF") || token.equals("MW") || token.equals("WTH") || token.equals("WS") || token.equals("MTWTHF") || token.equals("MTWHF")) return true;
                    break;

                case Calendar.THURSDAY:
                    if (token.equals("TH") || token.equals("THU") || token.equals("R")) return true;
                    if (token.equals("TTH") || token.equals("THS") || token.equals("MTH") || token.equals("WTH") || token.equals("MTWTHF") || token.equals("MTWHF")) return true;
                    break;

                case Calendar.FRIDAY:
                    if (token.equals("F") || token.equals("FR") || token.equals("FRI")) return true;
                    if (token.equals("MWF") || token.equals("FS") || token.equals("TF") || token.equals("MF") || token.equals("MTWTHF") || token.equals("MTWHF")) return true;
                    break;

                case Calendar.SATURDAY:
                    if (token.equals("S") || token.equals("SA") || token.equals("SAT")) return true;
                    if (token.equals("THS") || token.equals("FS") || token.equals("SS")) return true;
                    break;

                case Calendar.SUNDAY:
                    if (token.equals("SU") || token.equals("SUN")) return true;
                    break;
            }
        }
        return false;
    }

    public static int parseMinutes(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return 0;
        try {
            String trimmed = timeStr.trim().toUpperCase();
            boolean isPm = trimmed.contains("PM");
            boolean isAm = trimmed.contains("AM");

            String cleaned = trimmed.replace("AM", "").replace("PM", "").trim();
            String[] parts = cleaned.split(":");
            if (parts.length < 2) return 0;

            int h = Integer.parseInt(parts[0].trim());
            String minDigits = parts[1].replaceAll("[^0-9]", "");
            int m = minDigits.isEmpty() ? 0 : Integer.parseInt(minDigits);

            if (isPm && h < 12) {
                h += 12;
            } else if (isAm && h == 12) {
                h = 0;
            }
            return h * 60 + m;
        } catch (Exception e) {
            return 0;
        }
    }

    public static String format12Hour(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return "";
        try {
            String trimmed = timeStr.trim().toUpperCase();
            if (trimmed.contains("AM") || trimmed.contains("PM")) {
                return timeStr.trim();
            }
            int totalMins = parseMinutes(timeStr);
            int h = totalMins / 60;
            int m = totalMins % 60;
            String ampm = h >= 12 ? "PM" : "AM";
            h = h % 12;
            if (h == 0) h = 12;
            String hStr = h < 10 ? "0" + h : String.valueOf(h);
            String mStr = m < 10 ? "0" + m : String.valueOf(m);
            return hStr + ":" + mStr + " " + ampm;
        } catch (Exception e) {
            return timeStr;
        }
    }

    private static long getTimestampForMinutesToday(Calendar base, int targetMinutes) {
        Calendar cal = (Calendar) base.clone();
        cal.set(Calendar.HOUR_OF_DAY, targetMinutes / 60);
        cal.set(Calendar.MINUTE, targetMinutes % 60);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private static long getMidnightTomorrowTimestamp(Calendar base) {
        Calendar cal = (Calendar) base.clone();
        cal.add(Calendar.DAY_OF_YEAR, 1);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 10);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }
}
