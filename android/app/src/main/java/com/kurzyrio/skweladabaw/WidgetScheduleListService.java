package com.kurzyrio.skweladabaw;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class WidgetScheduleListService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetScheduleListFactory(this.getApplicationContext(), intent);
    }

    static class WidgetScheduleListFactory implements RemoteViewsService.RemoteViewsFactory {
        private final Context mContext;
        private final int mAppWidgetId;
        private List<WidgetScheduleHelper.ScheduleItem> mItems = new ArrayList<>();

        public WidgetScheduleListFactory(Context context, Intent intent) {
            this.mContext = context;
            this.mAppWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        @Override
        public void onCreate() {
            loadScheduleData();
        }

        @Override
        public void onDataSetChanged() {
            loadScheduleData();
        }

        private void loadScheduleData() {
            SharedPreferences prefs = mContext.getSharedPreferences(WidgetScheduleHelper.PREFS_NAME, Context.MODE_PRIVATE);
            int dayOffset = prefs.getInt("selected_day_offset_" + mAppWidgetId, 0);

            Calendar now = Calendar.getInstance();
            Calendar targetCal = (Calendar) now.clone();
            targetCal.add(Calendar.DAY_OF_YEAR, dayOffset);
            int targetDayOfWeek = targetCal.get(Calendar.DAY_OF_WEEK);
            String targetDayName = WidgetScheduleHelper.getDayName(targetDayOfWeek);

            List<WidgetScheduleHelper.ScheduleItem> allParsed = WidgetScheduleHelper.getAllScheduleItems(mContext);
            List<WidgetScheduleHelper.ScheduleItem> targetDayClasses = new ArrayList<>();

            for (WidgetScheduleHelper.ScheduleItem item : allParsed) {
                if (WidgetScheduleHelper.matchesDay(item.days, targetDayName)) {
                    targetDayClasses.add(item);
                }
            }

            Collections.sort(targetDayClasses, new Comparator<WidgetScheduleHelper.ScheduleItem>() {
                @Override
                public int compare(WidgetScheduleHelper.ScheduleItem a, WidgetScheduleHelper.ScheduleItem b) {
                    return Integer.compare(a.startMinutes, b.startMinutes);
                }
            });

            mItems = targetDayClasses;
        }

        @Override
        public void onDestroy() {
            mItems.clear();
        }

        @Override
        public int getCount() {
            return mItems.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= mItems.size()) return null;

            WidgetScheduleHelper.ScheduleItem item = mItems.get(position);
            RemoteViews row = new RemoteViews(mContext.getPackageName(), R.layout.widget_schedule_list_item);

            WidgetScheduleHelper.WidgetTheme theme = WidgetScheduleHelper.getWidgetTheme(mContext);
            row.setInt(R.id.widget_item_root, "setBackgroundResource", theme.itemBgRes);

            String timeStr = WidgetScheduleHelper.format12Hour(item.startTime) + " - " + WidgetScheduleHelper.format12Hour(item.endTime);
            row.setTextViewText(R.id.widget_item_time, timeStr);
            row.setTextColor(R.id.widget_item_time, theme.textAccent);

            String titleStr = (item.subjectCode != null && !item.subjectCode.isEmpty() ? item.subjectCode + " • " : "") + item.subjectName;
            row.setTextViewText(R.id.widget_item_title, titleStr);
            row.setTextColor(R.id.widget_item_title, theme.textPrimary);

            String roomStr = "Room " + (item.room == null || item.room.isEmpty() ? "Campus" : item.room)
                    + (item.building == null || item.building.isEmpty() ? "" : " • " + item.building);
            row.setTextViewText(R.id.widget_item_room, roomStr);
            row.setTextColor(R.id.widget_item_room, theme.textSecondary);

            // Fill-in intent for item click
            Intent fillInIntent = new Intent();
            fillInIntent.putExtra("target_tab", "schedule");
            row.setOnClickFillInIntent(R.id.widget_item_root, fillInIntent);

            return row;
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
