package com.kurzyrio.skweladabaw;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.widget.RemoteViews;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class SkwelaOngoingService extends Service {

    public static final String ACTION_START = "com.kurzyrio.skweladabaw.START_ONGOING_SERVICE";
    public static final String ACTION_UPDATE = "com.kurzyrio.skweladabaw.UPDATE_ONGOING_SERVICE";
    public static final String ACTION_STOP = "com.kurzyrio.skweladabaw.STOP_ONGOING_SERVICE";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";
    public static final String EXTRA_SUBTEXT = "extra_subtext";
    public static final String EXTRA_CURRENT_CLASS = "extra_current_class";
    public static final String EXTRA_CURRENT_ROOM = "extra_current_room";
    public static final String EXTRA_CURRENT_TIME = "extra_current_time";
    public static final String EXTRA_NEXT_CLASS = "extra_next_class";
    public static final String EXTRA_NEXT_ROOM = "extra_next_room";
    public static final String EXTRA_NEXT_TIME = "extra_next_time";
    public static final String EXTRA_STATUS_STATE = "extra_status_state";
    public static final String EXTRA_THEME_KEY = "extra_theme_key";
    public static final String EXTRA_THEME_BG = "extra_theme_bg";
    public static final String EXTRA_THEME_ACCENT = "extra_theme_accent";
    public static final String EXTRA_THEME_BORDER = "extra_theme_border";
    public static final String EXTRA_THEME_TEXT = "extra_theme_text";

    public static final String ONGOING_CHANNEL_ID = "skweladabaw_ongoing_class";
    public static final int ONGOING_NOTIFICATION_ID = 88800;

    private static final String PREFS_NAME = "skweladabaw_ongoing_service_prefs";
    private static final String PREF_IS_ACTIVE = "pref_is_active";
    private static final String PREF_CURRENT_CLASS = "pref_current_class";
    private static final String PREF_CURRENT_ROOM = "pref_current_room";
    private static final String PREF_CURRENT_TIME = "pref_current_time";
    private static final String PREF_NEXT_CLASS = "pref_next_class";
    private static final String PREF_NEXT_ROOM = "pref_next_room";
    private static final String PREF_NEXT_TIME = "pref_next_time";
    private static final String PREF_STATUS_STATE = "pref_status_state";
    private static final String PREF_THEME_KEY = "pref_theme_key";
    private static final String PREF_THEME_BG = "pref_theme_bg";
    private static final String PREF_THEME_ACCENT = "pref_theme_accent";
    private static final String PREF_THEME_BORDER = "pref_theme_border";
    private static final String PREF_THEME_TEXT = "pref_theme_text";

    private static volatile SkwelaOngoingService sInstance = null;

    private BroadcastReceiver timeTickReceiver = null;
    private Bitmap cachedEagleIcon = null;
    private String lastCachedSchedulesJson = null;
    private List<WidgetScheduleHelper.ScheduleItem> cachedParsedSchedules = new ArrayList<>();
    private String lastNotificationSignature = null;

    public static void refreshNotificationFromBackground(Context context) {
        SkwelaOngoingService instance = sInstance;
        if (instance != null) {
            instance.updateNotificationFromLocalSchedule();
        }
    }

    private void registerTimeTickReceiver() {
        if (timeTickReceiver == null) {
            timeTickReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    String action = intent.getAction();
                    if (Intent.ACTION_TIME_TICK.equals(action) ||
                        Intent.ACTION_TIME_CHANGED.equals(action) ||
                        Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
                        "com.kurzyrio.skweladabaw.ACTION_SCHEDULE_WIDGET_UPDATE".equals(action)) {
                        updateNotificationFromLocalSchedule();
                    }
                }
            };
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_TIME_TICK);
            filter.addAction(Intent.ACTION_TIME_CHANGED);
            filter.addAction(Intent.ACTION_TIMEZONE_CHANGED);
            filter.addAction("com.kurzyrio.skweladabaw.ACTION_SCHEDULE_WIDGET_UPDATE");
            try {
                ContextCompat.registerReceiver(this, timeTickReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
            } catch (Exception ignored) {}
        }
    }

    private void unregisterTimeTickReceiver() {
        if (timeTickReceiver != null) {
            try {
                unregisterReceiver(timeTickReceiver);
            } catch (Exception ignored) {}
            timeTickReceiver = null;
        }
    }

    public void updateNotificationFromLocalSchedule() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (!prefs.getBoolean(PREF_IS_ACTIVE, false)) {
                return;
            }
            refreshScheduleFromStorage(prefs);

            String sig = String.valueOf(prefs.getString(PREF_CURRENT_CLASS, "")) + "|" +
                String.valueOf(prefs.getString(PREF_CURRENT_ROOM, "")) + "|" +
                String.valueOf(prefs.getString(PREF_CURRENT_TIME, "")) + "|" +
                String.valueOf(prefs.getString(PREF_NEXT_CLASS, "")) + "|" +
                String.valueOf(prefs.getString(PREF_NEXT_ROOM, "")) + "|" +
                String.valueOf(prefs.getString(PREF_NEXT_TIME, "")) + "|" +
                String.valueOf(prefs.getString(PREF_STATUS_STATE, "")) + "|" +
                String.valueOf(prefs.getString(PREF_THEME_KEY, "midnight"));

            if (sig.equals(lastNotificationSignature)) {
                return;
            }
            lastNotificationSignature = sig;

            Notification notification = buildRemoteViewsNotification(null, prefs, true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(ONGOING_NOTIFICATION_ID, notification);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
        createNotificationChannel();
        purgeLegacyReminderAlerts();
        registerTimeTickReceiver();
    }

    private void purgeLegacyReminderAlerts() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    android.service.notification.StatusBarNotification[] active = nm.getActiveNotifications();
                    if (active != null) {
                        for (android.service.notification.StatusBarNotification sbn : active) {
                            if (sbn != null && sbn.getId() >= 120000 && sbn.getId() < 130000) {
                                nm.cancel(sbn.getId());
                            }
                        }
                    }
                } else {
                    for (int i = 120000; i <= 121500; i++) {
                        nm.cancel(i);
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        sInstance = null;
        lastNotificationSignature = null;
        lastCachedSchedulesJson = null;
        cachedParsedSchedules.clear();
        cachedEagleIcon = null;
        unregisterTimeTickReceiver();
        super.onDestroy();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        registerTimeTickReceiver();

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                unregisterTimeTickReceiver();
                prefs.edit().putBoolean(PREF_IS_ACTIVE, false).apply();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(ONGOING_NOTIFICATION_ID);
                }
                stopSelf();
                return START_NOT_STICKY;
            }

            // Persist parameters for sticky restoration
            SharedPreferences.Editor editor = prefs.edit()
                .putBoolean(PREF_IS_ACTIVE, true)
                .putString(PREF_CURRENT_CLASS, intent.getStringExtra(EXTRA_CURRENT_CLASS))
                .putString(PREF_CURRENT_ROOM, intent.getStringExtra(EXTRA_CURRENT_ROOM))
                .putString(PREF_CURRENT_TIME, intent.getStringExtra(EXTRA_CURRENT_TIME))
                .putString(PREF_NEXT_CLASS, intent.getStringExtra(EXTRA_NEXT_CLASS))
                .putString(PREF_NEXT_ROOM, intent.getStringExtra(EXTRA_NEXT_ROOM))
                .putString(PREF_NEXT_TIME, intent.getStringExtra(EXTRA_NEXT_TIME))
                .putString(PREF_STATUS_STATE, intent.getStringExtra(EXTRA_STATUS_STATE));

            if (intent.hasExtra(EXTRA_THEME_KEY)) {
                editor.putString(PREF_THEME_KEY, intent.getStringExtra(EXTRA_THEME_KEY));
            }
            if (intent.hasExtra(EXTRA_THEME_BG)) {
                editor.putString(PREF_THEME_BG, intent.getStringExtra(EXTRA_THEME_BG));
            }
            if (intent.hasExtra(EXTRA_THEME_ACCENT)) {
                editor.putString(PREF_THEME_ACCENT, intent.getStringExtra(EXTRA_THEME_ACCENT));
            }
            if (intent.hasExtra(EXTRA_THEME_BORDER)) {
                editor.putString(PREF_THEME_BORDER, intent.getStringExtra(EXTRA_THEME_BORDER));
            }
            if (intent.hasExtra(EXTRA_THEME_TEXT)) {
                editor.putString(PREF_THEME_TEXT, intent.getStringExtra(EXTRA_THEME_TEXT));
            }
            editor.apply();
        }

        // Check if service should be active
        boolean isActive = prefs.getBoolean(PREF_IS_ACTIVE, true);
        if (!isActive && intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        // Force notification update when service receives an explicit command
        lastNotificationSignature = null;
        Notification notification = buildRemoteViewsNotification(intent, prefs, false);

        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(ONGOING_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(ONGOING_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_NONE);
            } else {
                startForeground(ONGOING_NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(ONGOING_NOTIFICATION_ID, notification);
            }
        }

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Respect user dismissal and avoid API 31+ background FGS restriction crashes
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (prefs.getBoolean(PREF_IS_ACTIVE, false) && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                Intent restartServiceIntent = new Intent(getApplicationContext(), SkwelaOngoingService.class);
                restartServiceIntent.setAction(ACTION_START);
                restartServiceIntent.setPackage(getPackageName());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(restartServiceIntent);
                } else {
                    startService(restartServiceIntent);
                }
            }
        } catch (Exception ignored) {}
        super.onTaskRemoved(rootIntent);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(ONGOING_CHANNEL_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                        ONGOING_CHANNEL_ID,
                        "Persistent Class Status Bar",
                        NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("Ongoing student schedule showing current and next lectures");
                    channel.setShowBadge(false);
                    channel.enableVibration(false);
                    channel.setSound(null, null);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    private Notification buildRemoteViewsNotification(Intent intent, SharedPreferences prefs, boolean skipStorageRefresh) {
        String currentClass;
        String currentRoom;
        String currentTime;
        String nextClass;
        String nextRoom;
        String nextTime;
        String statusState;

        if (intent != null && intent.hasExtra(EXTRA_CURRENT_CLASS)) {
            currentClass = intent.getStringExtra(EXTRA_CURRENT_CLASS);
            currentRoom = intent.getStringExtra(EXTRA_CURRENT_ROOM);
            currentTime = intent.getStringExtra(EXTRA_CURRENT_TIME);
            nextClass = intent.getStringExtra(EXTRA_NEXT_CLASS);
            nextRoom = intent.getStringExtra(EXTRA_NEXT_ROOM);
            nextTime = intent.getStringExtra(EXTRA_NEXT_TIME);
            statusState = intent.getStringExtra(EXTRA_STATUS_STATE);
        } else {
            if (!skipStorageRefresh) {
                refreshScheduleFromStorage(prefs);
            }
            currentClass = prefs.getString(PREF_CURRENT_CLASS, "");
            currentRoom = prefs.getString(PREF_CURRENT_ROOM, "");
            currentTime = prefs.getString(PREF_CURRENT_TIME, "");
            nextClass = prefs.getString(PREF_NEXT_CLASS, "");
            nextRoom = prefs.getString(PREF_NEXT_ROOM, "");
            nextTime = prefs.getString(PREF_NEXT_TIME, "");
            statusState = prefs.getString(PREF_STATUS_STATE, "");
        }

        String currentBadgeText;
        String currentSubjectText;
        String currentMetaText;

        String nextBadgeText;
        String nextDetailsText;
        String nextSubjectText;
        String nextMetaText;
        String statusPillText;
        String nextTimeLabelText;

        boolean hasCurrent = currentClass != null && !currentClass.trim().isEmpty();
        boolean hasNext = nextClass != null && !nextClass.trim().isEmpty();

        if (hasCurrent) {
            currentBadgeText = "CURRENT CLASS";
            currentSubjectText = currentClass.trim();
            statusPillText = "IN SESSION";

            StringBuilder metaBuilder = new StringBuilder();
            if (currentRoom != null && !currentRoom.trim().isEmpty()) {
                metaBuilder.append(currentRoom.trim());
            } else {
                metaBuilder.append("Campus Room");
            }
            if (currentTime != null && !currentTime.trim().isEmpty()) {
                metaBuilder.append(" • ").append(currentTime.trim());
            }
            currentMetaText = metaBuilder.toString();

            if (hasNext) {
                nextBadgeText = "NEXT CLASS";
                nextTimeLabelText = nextTime != null && !nextTime.trim().isEmpty() ? "Starts at " + nextTime.trim() : "Upcoming Lecture";
                nextSubjectText = nextClass.trim();

                StringBuilder nextDetailsBuilder = new StringBuilder(nextClass.trim());
                if (nextRoom != null && !nextRoom.trim().isEmpty()) {
                    nextDetailsBuilder.append(" • ").append(nextRoom.trim());
                }
                if (nextTime != null && !nextTime.trim().isEmpty()) {
                    nextDetailsBuilder.append(" • ").append(nextTime.trim());
                }
                nextDetailsText = nextDetailsBuilder.toString();

                StringBuilder nextMetaBuilder = new StringBuilder();
                if (nextRoom != null && !nextRoom.trim().isEmpty()) {
                    nextMetaBuilder.append(nextRoom.trim());
                } else {
                    nextMetaBuilder.append("Campus Room");
                }
                if (nextTime != null && !nextTime.trim().isEmpty()) {
                    nextMetaBuilder.append(" • ").append(nextTime.trim());
                }
                nextMetaText = nextMetaBuilder.toString();
            } else {
                nextBadgeText = "STATUS";
                nextTimeLabelText = "Final Lecture";
                nextDetailsText = "Final class for today • Have a safe trip home";
                nextSubjectText = "Final Class for Today";
                nextMetaText = "No more lectures scheduled • Have a safe trip home";
            }
        } else if (hasNext) {
            currentBadgeText = "NEXT CLASS";
            currentSubjectText = nextClass.trim();
            statusPillText = "UPCOMING";

            StringBuilder metaBuilder = new StringBuilder();
            if (nextRoom != null && !nextRoom.trim().isEmpty()) {
                metaBuilder.append(nextRoom.trim());
            } else {
                metaBuilder.append("Campus Room");
            }
            if (nextTime != null && !nextTime.trim().isEmpty()) {
                metaBuilder.append(" • Starts at ").append(nextTime.trim());
            }
            currentMetaText = metaBuilder.toString();

            nextBadgeText = "STATUS";
            nextTimeLabelText = "Study Break";
            nextDetailsText = "No class currently in session • Break time";
            nextSubjectText = "Upcoming Lecture Today";
            nextMetaText = "Prepare materials for " + nextClass.trim();
        } else if ("done".equalsIgnoreCase(statusState)) {
            currentBadgeText = "COMPLETED";
            currentSubjectText = "All Classes Completed";
            currentMetaText = "All scheduled lectures finished for today";
            statusPillText = "ALL DONE";

            nextBadgeText = "STATUS";
            nextTimeLabelText = "Dismissed";
            nextDetailsText = "No remaining classes today • Have a safe trip home";
            nextSubjectText = "Done for the Day";
            nextMetaText = "Have a restful evening and safe commute";
        } else {
            currentBadgeText = "DAY OFF";
            currentSubjectText = "No Classes Scheduled Today";
            currentMetaText = "Free timetable schedule for today";
            statusPillText = "DAY OFF";

            nextBadgeText = "CALENDAR";
            nextTimeLabelText = "Timetable";
            nextDetailsText = "Check timetable for upcoming week lectures";
            nextSubjectText = "Enjoy Your Free Time";
            nextMetaText = "Review upcoming class schedules and notes";
        }

        int iconRes = getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", getPackageName());
        if (iconRes == 0) {
            iconRes = R.mipmap.ic_launcher;
        }

        // Resolve active theme from intent extras or saved SharedPreferences
        String themeKey = intent != null && intent.getStringExtra(EXTRA_THEME_KEY) != null
            ? intent.getStringExtra(EXTRA_THEME_KEY)
            : prefs.getString(PREF_THEME_KEY, "midnight");

        int cardBgRes = R.drawable.notification_card_bg_midnight;
        int pillBgRes = R.drawable.notification_current_pill_bg_midnight;
        int nextContainerBgRes = R.drawable.notification_next_container_bg_midnight;
        boolean isLight = false;
        boolean isMatchApp = "match_app".equalsIgnoreCase(themeKey);
        int customBgColor = 0xFF141416;
        int customAccentColor = 0xFF3B82F6;
        int customTextColor = 0xFFFFFFFF;

        if ("emerald".equalsIgnoreCase(themeKey)) {
            cardBgRes = R.drawable.notification_card_bg_emerald;
            pillBgRes = R.drawable.notification_current_pill_bg_emerald;
            nextContainerBgRes = R.drawable.notification_next_container_bg_emerald;
        } else if ("ocean".equalsIgnoreCase(themeKey)) {
            cardBgRes = R.drawable.notification_card_bg_ocean;
            pillBgRes = R.drawable.notification_current_pill_bg_ocean;
            nextContainerBgRes = R.drawable.notification_next_container_bg_ocean;
        } else if ("sunset".equalsIgnoreCase(themeKey)) {
            cardBgRes = R.drawable.notification_card_bg_sunset;
            pillBgRes = R.drawable.notification_current_pill_bg_sunset;
            nextContainerBgRes = R.drawable.notification_next_container_bg_sunset;
        } else if ("nordic".equalsIgnoreCase(themeKey)) {
            cardBgRes = R.drawable.notification_card_bg_nordic;
            pillBgRes = R.drawable.notification_current_pill_bg_nordic;
            nextContainerBgRes = R.drawable.notification_next_container_bg_nordic;
            isLight = true;
        } else if (isMatchApp) {
            String bgHex = intent != null && intent.getStringExtra(EXTRA_THEME_BG) != null
                ? intent.getStringExtra(EXTRA_THEME_BG)
                : prefs.getString(PREF_THEME_BG, "#141416");
            String accHex = intent != null && intent.getStringExtra(EXTRA_THEME_ACCENT) != null
                ? intent.getStringExtra(EXTRA_THEME_ACCENT)
                : prefs.getString(PREF_THEME_ACCENT, "#3B82F6");
            String txtHex = intent != null && intent.getStringExtra(EXTRA_THEME_TEXT) != null
                ? intent.getStringExtra(EXTRA_THEME_TEXT)
                : prefs.getString(PREF_THEME_TEXT, "#FFFFFF");

            customBgColor = WidgetScheduleHelper.parseHexColorSafe(bgHex, 0xFF141416);
            customAccentColor = WidgetScheduleHelper.parseHexColorSafe(accHex, 0xFF3B82F6);
            customTextColor = WidgetScheduleHelper.parseHexColorSafe(txtHex, 0xFFFFFFFF);
            double bgLum = (0.299 * Color.red(customBgColor) + 0.587 * Color.green(customBgColor) + 0.114 * Color.blue(customBgColor)) / 255.0;
            isLight = bgLum > 0.55;
            if (isLight) {
                cardBgRes = R.drawable.notification_card_bg_nordic;
                pillBgRes = R.drawable.notification_current_pill_bg_nordic;
                nextContainerBgRes = R.drawable.notification_next_container_bg_nordic;
            }
        }

        int primaryTextColor = isMatchApp ? customTextColor : (isLight ? Color.parseColor("#000000") : Color.parseColor("#FFFFFF"));
        int metaTextColor = isLight ? Color.parseColor("#52525B") : Color.parseColor("#A1A1AA");
        double accLum = (0.299 * Color.red(customAccentColor) + 0.587 * Color.green(customAccentColor) + 0.114 * Color.blue(customAccentColor)) / 255.0;
        int pillTextColor = isMatchApp ? (accLum > 0.62 ? Color.parseColor("#000000") : Color.parseColor("#FFFFFF")) : Color.parseColor("#FFFFFF");
        int brandTextColor = Color.parseColor("#71717A");
        int nextDetailsColor = isLight ? Color.parseColor("#18181B") : Color.parseColor("#D4D4D8");

        // Inflate custom RemoteViews layouts without duplicate app icon/name
        RemoteViews compactView = new RemoteViews(getPackageName(), R.layout.notification_class_compact);
        WidgetScheduleHelper.applyThemedBackground(compactView, R.id.notif_root, cardBgRes, R.drawable.widget_card_bg_tintable, isMatchApp, customBgColor);
        WidgetScheduleHelper.applyThemedBackground(compactView, R.id.notif_current_badge, pillBgRes, R.drawable.widget_badge_bg_tintable, isMatchApp, customAccentColor);
        compactView.setInt(R.id.notif_next_container, "setBackgroundResource", nextContainerBgRes);
        compactView.setTextViewText(R.id.notif_current_badge, currentBadgeText);
        compactView.setTextColor(R.id.notif_current_badge, pillTextColor);
        compactView.setTextViewText(R.id.notif_current_subject, currentSubjectText);
        compactView.setTextColor(R.id.notif_current_subject, primaryTextColor);
        compactView.setTextViewText(R.id.notif_current_meta, currentMetaText);
        compactView.setTextColor(R.id.notif_current_meta, metaTextColor);
        compactView.setTextViewText(R.id.notif_next_badge, nextBadgeText);
        compactView.setTextViewText(R.id.notif_next_details, nextDetailsText);
        compactView.setTextColor(R.id.notif_next_details, nextDetailsColor);

        RemoteViews expandedView = new RemoteViews(getPackageName(), R.layout.notification_class_expanded);
        WidgetScheduleHelper.applyThemedBackground(expandedView, R.id.notif_expanded_root, cardBgRes, R.drawable.widget_card_bg_tintable, isMatchApp, customBgColor);
        WidgetScheduleHelper.applyThemedBackground(expandedView, R.id.notif_expanded_status_badge, pillBgRes, R.drawable.widget_badge_bg_tintable, isMatchApp, customAccentColor);
        expandedView.setTextViewText(R.id.notif_expanded_status_badge, statusPillText);
        expandedView.setTextColor(R.id.notif_expanded_status_badge, pillTextColor);
        expandedView.setTextViewText(R.id.notif_expanded_current_label, currentBadgeText);
        expandedView.setTextViewText(R.id.notif_expanded_current_subject, currentSubjectText);
        expandedView.setTextColor(R.id.notif_expanded_current_subject, primaryTextColor);
        expandedView.setTextViewText(R.id.notif_expanded_current_meta, currentMetaText);
        expandedView.setTextColor(R.id.notif_expanded_current_meta, metaTextColor);
        expandedView.setTextViewText(R.id.notif_expanded_next_badge, nextBadgeText);
        expandedView.setTextViewText(R.id.notif_expanded_next_time_label, nextTimeLabelText);
        expandedView.setTextViewText(R.id.notif_expanded_next_subject, nextSubjectText);
        expandedView.setTextColor(R.id.notif_expanded_next_subject, primaryTextColor);
        expandedView.setTextViewText(R.id.notif_expanded_next_meta, nextMetaText);
        expandedView.setTextColor(R.id.notif_expanded_next_meta, metaTextColor);

        // Bind 4 Quick Action Chips (Timetable, DC Bus, Tasks, Lounge)
        PendingIntent schedIntent = createTabPendingIntent("schedule", 1001);
        PendingIntent busIntent = createTabPendingIntent("dcbus", 1002);
        PendingIntent tasksIntent = createTabPendingIntent("tasks", 1003);
        PendingIntent chatIntent = createTabPendingIntent("chat", 1004);

        compactView.setOnClickPendingIntent(R.id.notif_action_schedule, schedIntent);
        compactView.setOnClickPendingIntent(R.id.notif_action_bus, busIntent);
        compactView.setOnClickPendingIntent(R.id.notif_action_tasks, tasksIntent);
        compactView.setOnClickPendingIntent(R.id.notif_action_chat, chatIntent);

        expandedView.setOnClickPendingIntent(R.id.notif_expanded_action_schedule, schedIntent);
        expandedView.setOnClickPendingIntent(R.id.notif_expanded_action_bus, busIntent);
        expandedView.setOnClickPendingIntent(R.id.notif_expanded_action_tasks, tasksIntent);
        expandedView.setOnClickPendingIntent(R.id.notif_expanded_action_chat, chatIntent);

        // Intent to launch application on card click
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = launchIntent != null
            ? PendingIntent.getActivity(this, ONGOING_NOTIFICATION_ID, launchIntent, flags)
            : null;

        // Stop service cleanly if user dismisses the ongoing notification on supported Android versions
        Intent deleteIntent = new Intent(this, SkwelaOngoingService.class);
        deleteIntent.setAction(ACTION_STOP);
        PendingIntent deletePendingIntent = PendingIntent.getService(
            this,
            999,
            deleteIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, ONGOING_CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setCustomContentView(compactView)
            .setCustomBigContentView(expandedView)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setContentIntent(pendingIntent)
            .setDeleteIntent(deletePendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        try {
            if (cachedEagleIcon == null) {
                cachedEagleIcon = BitmapFactory.decodeResource(getResources(), R.drawable.ic_eagle_buddy);
            }
            if (cachedEagleIcon != null) {
                builder.setLargeIcon(cachedEagleIcon);
            }
        } catch (Exception ignored) {}

        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_ONGOING_EVENT;
        return notification;
    }

    private PendingIntent createTabPendingIntent(String tabName, int requestCode) {
        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (intent == null) {
            intent = new Intent(this, MainActivity.class);
        }
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("target_tab", tabName);
        intent.setData(android.net.Uri.parse("skweladabaw://navigate/" + tabName));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(this, requestCode, intent, flags);
    }

    private void refreshScheduleFromStorage(SharedPreferences prefs) {
        try {
            SharedPreferences widgetPrefs = getSharedPreferences(WidgetScheduleHelper.PREFS_NAME, Context.MODE_PRIVATE);
            String allSchedulesJson = widgetPrefs.getString("all_schedules_json", null);
            if (allSchedulesJson == null || allSchedulesJson.trim().isEmpty()) {
                SharedPreferences capPrefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                allSchedulesJson = capPrefs.getString("all_schedules_json", null);
            }
            if (allSchedulesJson == null || allSchedulesJson.trim().isEmpty()) {
                SharedPreferences customPrefs = getSharedPreferences("SkwelaDabawWidgets", Context.MODE_PRIVATE);
                allSchedulesJson = customPrefs.getString("all_schedules_json", null);
            }
            if (allSchedulesJson == null || allSchedulesJson.trim().isEmpty()) {
                prefs.edit()
                    .putString(PREF_CURRENT_CLASS, "")
                    .putString(PREF_CURRENT_ROOM, "")
                    .putString(PREF_CURRENT_TIME, "")
                    .putString(PREF_NEXT_CLASS, "")
                    .putString(PREF_NEXT_ROOM, "")
                    .putString(PREF_NEXT_TIME, "")
                    .putString(PREF_STATUS_STATE, "empty")
                    .apply();
                return;
            }

            Calendar now = Calendar.getInstance();
            String todayName = WidgetScheduleHelper.getDayName(now.get(Calendar.DAY_OF_WEEK));
            int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

            if (lastCachedSchedulesJson == null || !allSchedulesJson.equals(lastCachedSchedulesJson)) {
                JSONArray arr = new JSONArray(allSchedulesJson);
                List<WidgetScheduleHelper.ScheduleItem> parsed = new ArrayList<>(arr.length());
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    WidgetScheduleHelper.ScheduleItem item = new WidgetScheduleHelper.ScheduleItem();
                    item.subjectCode = obj.optString("subjectCode", "");
                    item.subjectName = obj.optString("subjectName", "");
                    item.room = obj.optString("room", "");
                    item.building = obj.optString("building", "");
                    item.startTime = obj.optString("startTime", "");
                    item.endTime = obj.optString("endTime", "");
                    item.startMinutes = WidgetScheduleHelper.parseMinutes(item.startTime);
                    item.endMinutes = WidgetScheduleHelper.parseMinutes(item.endTime);
                    item.reminderMinutes = obj.optInt("reminderMinutes", obj.optInt("reminder_minutes", 10));

                    JSONArray daysArr = obj.optJSONArray("days");
                    if (daysArr != null) {
                        for (int d = 0; d < daysArr.length(); d++) {
                            item.days.add(daysArr.optString(d));
                        }
                    } else {
                        String daysStr = obj.optString("days", "");
                        if (!daysStr.isEmpty()) {
                            String[] parts = daysStr.split(",");
                            for (String p : parts) item.days.add(p.trim());
                        }
                    }
                    parsed.add(item);
                }
                cachedParsedSchedules = parsed;
                lastCachedSchedulesJson = allSchedulesJson;
            }

            List<WidgetScheduleHelper.ScheduleItem> todayClasses = new ArrayList<>();
            for (WidgetScheduleHelper.ScheduleItem item : cachedParsedSchedules) {
                if (WidgetScheduleHelper.matchesDay(item.days, todayName)) {
                    todayClasses.add(item);
                }
            }

            Collections.sort(todayClasses, new Comparator<WidgetScheduleHelper.ScheduleItem>() {
                @Override
                public int compare(WidgetScheduleHelper.ScheduleItem a, WidgetScheduleHelper.ScheduleItem b) {
                    return Integer.compare(a.startMinutes, b.startMinutes);
                }
            });

            WidgetScheduleHelper.ScheduleItem curr = null;
            WidgetScheduleHelper.ScheduleItem next = null;

            for (WidgetScheduleHelper.ScheduleItem cls : todayClasses) {
                if (currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes) {
                    curr = cls;
                } else if (currentMinutes < cls.startMinutes) {
                    if (next == null) {
                        next = cls;
                    }
                }
            }

            SharedPreferences.Editor editor = prefs.edit();
            if (curr != null) {
                String sub = !curr.subjectCode.isEmpty() ? curr.subjectCode + " • " + curr.subjectName : curr.subjectName;
                editor.putString(PREF_CURRENT_CLASS, sub);
                editor.putString(PREF_CURRENT_ROOM, curr.room);
                editor.putString(PREF_CURRENT_TIME, WidgetScheduleHelper.format12Hour(curr.startTime) + " - " + WidgetScheduleHelper.format12Hour(curr.endTime));
            } else {
                editor.putString(PREF_CURRENT_CLASS, "");
                editor.putString(PREF_CURRENT_ROOM, "");
                editor.putString(PREF_CURRENT_TIME, "");
            }

            if (next != null) {
                String sub = !next.subjectCode.isEmpty() ? next.subjectCode + " • " + next.subjectName : next.subjectName;
                editor.putString(PREF_NEXT_CLASS, sub);
                editor.putString(PREF_NEXT_ROOM, next.room);
                editor.putString(PREF_NEXT_TIME, WidgetScheduleHelper.format12Hour(next.startTime));
                editor.putString(PREF_STATUS_STATE, "");
            } else {
                editor.putString(PREF_NEXT_CLASS, "");
                editor.putString(PREF_NEXT_ROOM, "");
                editor.putString(PREF_NEXT_TIME, "");
                if (!todayClasses.isEmpty() && curr == null) {
                    editor.putString(PREF_STATUS_STATE, "done");
                } else {
                    editor.putString(PREF_STATUS_STATE, "");
                }
            }
            editor.apply();
        } catch (Exception ignored) {}
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
