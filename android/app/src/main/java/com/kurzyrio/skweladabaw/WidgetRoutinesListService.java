package com.kurzyrio.skweladabaw;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class WidgetRoutinesListService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetRoutinesListFactory(this.getApplicationContext(), intent);
    }

    static class WidgetRoutinesListFactory implements RemoteViewsService.RemoteViewsFactory {
        private final Context mContext;
        private final int mAppWidgetId;
        private List<WidgetScheduleHelper.RoutineItem> mItems = new ArrayList<>();

        public WidgetRoutinesListFactory(Context context, Intent intent) {
            this.mContext = context;
            this.mAppWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        @Override
        public void onCreate() {
            loadRoutinesData();
        }

        @Override
        public void onDataSetChanged() {
            loadRoutinesData();
        }

        private void loadRoutinesData() {
            mItems.clear();
            Calendar now = Calendar.getInstance();
            int todayDayOfWeek = now.get(Calendar.DAY_OF_WEEK);
            String todayName = WidgetScheduleHelper.getDayName(todayDayOfWeek);

            List<WidgetScheduleHelper.RoutineItem> all = WidgetScheduleHelper.getAllRoutineItems(mContext);
            List<WidgetScheduleHelper.RoutineItem> filtered = new ArrayList<>();

            for (WidgetScheduleHelper.RoutineItem r : all) {
                if (r.enabled && (todayName.equalsIgnoreCase(r.dayOfWeek) || "Everyday".equalsIgnoreCase(r.dayOfWeek) || "Daily".equalsIgnoreCase(r.dayOfWeek))) {
                    filtered.add(r);
                }
            }

            // If no routines for today, show all enabled routines so widget isn't empty
            if (filtered.isEmpty()) {
                for (WidgetScheduleHelper.RoutineItem r : all) {
                    if (r.enabled) {
                        filtered.add(r);
                    }
                }
            }

            Collections.sort(filtered, new Comparator<WidgetScheduleHelper.RoutineItem>() {
                @Override
                public int compare(WidgetScheduleHelper.RoutineItem a, WidgetScheduleHelper.RoutineItem b) {
                    return Integer.compare(a.timeMinutes, b.timeMinutes);
                }
            });

            mItems = filtered;
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

            WidgetScheduleHelper.RoutineItem item = mItems.get(position);
            RemoteViews row = new RemoteViews(mContext.getPackageName(), R.layout.widget_routines_list_item);

            WidgetScheduleHelper.WidgetTheme theme = WidgetScheduleHelper.getWidgetTheme(mContext);
            row.setInt(R.id.widget_routine_item_root, "setBackgroundResource", theme.itemBgRes);

            String timeStr = WidgetScheduleHelper.format12Hour(item.time);
            row.setTextViewText(R.id.widget_routine_item_time, timeStr);
            row.setTextColor(R.id.widget_routine_item_time, theme.textAccent);

            row.setTextViewText(R.id.widget_routine_item_title, item.title);
            row.setTextColor(R.id.widget_routine_item_title, theme.textPrimary);

            String statusStr = item.dayOfWeek + (item.notes != null && !item.notes.isEmpty() ? " • " + item.notes : " • Routine Alert");
            row.setTextViewText(R.id.widget_routine_item_status, statusStr);
            row.setTextColor(R.id.widget_routine_item_status, theme.textSecondary);

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra("target_tab", "schedule");
            row.setOnClickFillInIntent(R.id.widget_routine_item_root, fillInIntent);

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
