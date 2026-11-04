package com.kurzyrio.skweladabaw;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class WidgetTasksListService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WidgetTasksListFactory(this.getApplicationContext(), intent);
    }

    static class WidgetTasksListFactory implements RemoteViewsService.RemoteViewsFactory {
        private final Context mContext;
        private final int mAppWidgetId;
        private List<WidgetScheduleHelper.TaskWidgetItem> mItems = new ArrayList<>();

        public WidgetTasksListFactory(Context context, Intent intent) {
            this.mContext = context;
            this.mAppWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        @Override
        public void onCreate() {
            loadTasksData();
        }

        @Override
        public void onDataSetChanged() {
            loadTasksData();
        }

        private void loadTasksData() {
            mItems.clear();
            List<WidgetScheduleHelper.TaskWidgetItem> all = WidgetScheduleHelper.getAllTaskItems(mContext);
            List<WidgetScheduleHelper.TaskWidgetItem> pending = new ArrayList<>();

            for (WidgetScheduleHelper.TaskWidgetItem t : all) {
                if (!t.completed) {
                    pending.add(t);
                }
            }

            Collections.sort(pending, new Comparator<WidgetScheduleHelper.TaskWidgetItem>() {
                @Override
                public int compare(WidgetScheduleHelper.TaskWidgetItem a, WidgetScheduleHelper.TaskWidgetItem b) {
                    String dateA = a.dueDate != null ? a.dueDate : "9999";
                    String dateB = b.dueDate != null ? b.dueDate : "9999";
                    return dateA.compareTo(dateB);
                }
            });

            mItems = pending;
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

            WidgetScheduleHelper.TaskWidgetItem item = mItems.get(position);
            RemoteViews row = new RemoteViews(mContext.getPackageName(), R.layout.widget_tasks_list_item);

            WidgetScheduleHelper.WidgetTheme theme = WidgetScheduleHelper.getWidgetTheme(mContext);
            row.setInt(R.id.widget_task_item_root, "setBackgroundResource", theme.itemBgRes);

            String priorityStr = (item.priority != null ? item.priority.toUpperCase() : "NORMAL") +
                    (item.dueDate != null && !item.dueDate.isEmpty() ? " • Due " + item.dueDate : "");
            row.setTextViewText(R.id.widget_task_item_priority, priorityStr);
            row.setTextColor(R.id.widget_task_item_priority, theme.textAccent);

            row.setTextViewText(R.id.widget_task_item_title, item.title != null ? item.title : "Untitled Task");
            row.setTextColor(R.id.widget_task_item_title, theme.textPrimary);

            String courseStr = (item.courseCode != null && !item.courseCode.isEmpty() ? item.courseCode : "Academic Task") +
                    (item.notes != null && !item.notes.isEmpty() ? " • " + item.notes : "");
            row.setTextViewText(R.id.widget_task_item_course, courseStr);
            row.setTextColor(R.id.widget_task_item_course, theme.textSecondary);

            Intent fillInIntent = new Intent();
            fillInIntent.putExtra("target_tab", "tasks");
            row.setOnClickFillInIntent(R.id.widget_task_item_root, fillInIntent);

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
