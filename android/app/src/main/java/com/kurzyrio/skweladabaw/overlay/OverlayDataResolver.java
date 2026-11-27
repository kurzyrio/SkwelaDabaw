package com.kurzyrio.skweladabaw.overlay;

import android.content.Context;
import android.content.SharedPreferences;
import com.kurzyrio.skweladabaw.EagleOverlayService;
import com.kurzyrio.skweladabaw.WidgetScheduleHelper;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Computes live class status directly on-device from persisted schedules so the
 * floating overlay remains accurate to the minute even when the app is closed.
 */
public final class OverlayDataResolver {

    public static final int MODE_CLEAR = 0;
    public static final int MODE_UPCOMING = 1;
    public static final int MODE_ONGOING = 2;

    public static final class Snapshot {
        public String weatherLine = "Davao City";
        public String heatIndexPill = "";
        public int classMode = MODE_CLEAR;
        public String classStatusText = "All clear";
        public String classTitle = "No classes right now";
        public String classMeta = "Open schedule to plan your day";
        public boolean showBubbleDot = false;
        public boolean isLiveClass = false;
        public boolean hasTask = false;
        public String taskTitle = "";
        public String taskDue = "";
    }

    public static Snapshot resolve(Context context) {
        Snapshot snap = new Snapshot();
        if (context == null) return snap;

        SharedPreferences prefs = context.getSharedPreferences(
            EagleOverlayService.PREFS_NAME,
            Context.MODE_PRIVATE
        );

        // 1. Weather summary
        String temp = safeTrim(prefs.getString("weather_temp", ""));
        String cond = safeTrim(prefs.getString("weather_condition", ""));
        String heat = safeTrim(prefs.getString("heat_index", ""));

        if (!temp.isEmpty() && !cond.isEmpty()) {
            snap.weatherLine = temp + " · " + cond;
        } else if (!temp.isEmpty()) {
            snap.weatherLine = temp + " · Davao";
        } else {
            snap.weatherLine = "Davao Weather";
        }

        int heatVal = parseLeadingInt(heat);
        if (heatVal >= 33) {
            snap.heatIndexPill = "Feels " + heatVal + "°C";
        }

        // 2. Live class evaluation directly from WidgetScheduleHelper
        List<WidgetScheduleHelper.ScheduleItem> allSchedules = WidgetScheduleHelper.getAllScheduleItems(context);
        if (allSchedules != null && !allSchedules.isEmpty()) {
            resolveFromLiveSchedules(allSchedules, snap);
        } else {
            resolveFromSyncedPrefs(prefs, snap);
        }

        // 3. Pending task peek (single quiet row)
        int pendingTasks = prefs.getInt("pending_tasks_count", 0);
        String nextTaskTitle = safeTrim(prefs.getString("next_task_title", ""));
        String nextTaskDue = safeTrim(prefs.getString("next_task_due", ""));
        if (pendingTasks > 0 && !nextTaskTitle.isEmpty()) {
            snap.hasTask = true;
            snap.taskTitle = nextTaskTitle;
            snap.taskDue = nextTaskDue;
        }

        return snap;
    }

    private static void resolveFromLiveSchedules(
        List<WidgetScheduleHelper.ScheduleItem> allSchedules,
        Snapshot snap
    ) {
        Calendar now = Calendar.getInstance();
        String todayName = WidgetScheduleHelper.getDayName(now.get(Calendar.DAY_OF_WEEK));
        int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        List<WidgetScheduleHelper.ScheduleItem> todayClasses = new ArrayList<>();
        for (WidgetScheduleHelper.ScheduleItem item : allSchedules) {
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

        WidgetScheduleHelper.ScheduleItem ongoing = null;
        WidgetScheduleHelper.ScheduleItem upcoming = null;

        for (WidgetScheduleHelper.ScheduleItem cls : todayClasses) {
            if (currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes) {
                ongoing = cls;
                break;
            }
            if (cls.startMinutes > currentMinutes && upcoming == null) {
                upcoming = cls;
            }
        }

        if (ongoing != null) {
            int minsLeft = Math.max(1, ongoing.endMinutes - currentMinutes);
            snap.classMode = MODE_ONGOING;
            snap.isLiveClass = true;
            snap.showBubbleDot = true;
            snap.classStatusText = "Now · " + formatDuration(minsLeft) + " left";
            snap.classTitle = formatSubject(ongoing.subjectCode, ongoing.subjectName);
            snap.classMeta = formatClassMeta(ongoing.startTime, ongoing.endTime, ongoing.room);
        } else if (upcoming != null) {
            int minsUntil = Math.max(1, upcoming.startMinutes - currentMinutes);
            snap.classMode = MODE_UPCOMING;
            snap.isLiveClass = false;
            snap.showBubbleDot = minsUntil <= 60;
            snap.classStatusText = "Up next · in " + formatDuration(minsUntil);
            snap.classTitle = formatSubject(upcoming.subjectCode, upcoming.subjectName);
            snap.classMeta = formatClassMeta(upcoming.startTime, upcoming.endTime, upcoming.room);
        } else if (!todayClasses.isEmpty()) {
            snap.classMode = MODE_CLEAR;
            snap.classStatusText = "Done for today";
            snap.classTitle = "All classes finished";
            snap.classMeta = todayClasses.size() + (todayClasses.size() == 1 ? " class completed" : " classes completed");
        } else {
            snap.classMode = MODE_CLEAR;
            snap.classStatusText = "Free day";
            snap.classTitle = "No classes today";
            snap.classMeta = todayName;
        }
    }

    private static void resolveFromSyncedPrefs(SharedPreferences prefs, Snapshot snap) {
        String currentClass = safeTrim(prefs.getString("current_class", ""));
        String currentRoom = safeTrim(prefs.getString("current_room", ""));
        String currentTime = safeTrim(prefs.getString("current_time", ""));

        String nextClass = safeTrim(prefs.getString("next_class", ""));
        String nextRoom = safeTrim(prefs.getString("next_room", ""));
        String nextTime = safeTrim(prefs.getString("next_time", ""));

        if (!currentClass.isEmpty()) {
            snap.classMode = MODE_ONGOING;
            snap.isLiveClass = true;
            snap.showBubbleDot = true;
            snap.classStatusText = "In session";
            snap.classTitle = currentClass;
            snap.classMeta = joinNonEmpty(" · ", currentTime, currentRoom);
        } else if (!nextClass.isEmpty()) {
            snap.classMode = MODE_UPCOMING;
            snap.showBubbleDot = true;
            snap.classStatusText = "Up next";
            snap.classTitle = nextClass;
            snap.classMeta = joinNonEmpty(" · ", nextTime, nextRoom);
        }
    }

    private static String formatSubject(String code, String name) {
        String c = safeTrim(code);
        String n = safeTrim(name);
        if (!c.isEmpty() && !n.isEmpty()) {
            if (n.equalsIgnoreCase(c)) return c;
            return c + " · " + n;
        }
        return !c.isEmpty() ? c : (!n.isEmpty() ? n : "Class");
    }

    private static String formatClassMeta(String start, String end, String room) {
        String s = WidgetScheduleHelper.format12Hour(start);
        String e = WidgetScheduleHelper.format12Hour(end);
        String timeRange = (!s.isEmpty() && !e.isEmpty()) ? (s + " – " + e) : (!s.isEmpty() ? s : "");
        String rm = safeTrim(room);
        String roomLabel = rm.isEmpty() ? "" : (rm.toLowerCase().startsWith("rm") || rm.toLowerCase().startsWith("room") ? rm : "Rm " + rm);
        return joinNonEmpty(" · ", timeRange, roomLabel);
    }

    private static String formatDuration(int minutes) {
        if (minutes < 60) {
            return minutes + "m";
        }
        int h = minutes / 60;
        int m = minutes % 60;
        return m == 0 ? (h + "h") : (h + "h " + m + "m");
    }

    private static String joinNonEmpty(String sep, String a, String b) {
        boolean hasA = a != null && !a.trim().isEmpty();
        boolean hasB = b != null && !b.trim().isEmpty();
        if (hasA && hasB) return a.trim() + sep + b.trim();
        if (hasA) return a.trim();
        if (hasB) return b.trim();
        return "";
    }

    private static int parseLeadingInt(String raw) {
        if (raw == null || raw.isEmpty()) return -1;
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char ch = raw.charAt(i);
            if (Character.isDigit(ch)) {
                digits.append(ch);
            } else if (digits.length() > 0) {
                break;
            }
        }
        if (digits.length() == 0) return -1;
        try {
            return Integer.parseInt(digits.toString());
        } catch (Exception e) {
            return -1;
        }
    }

    private static String safeTrim(String s) {
        return s == null ? "" : s.trim();
    }
}
