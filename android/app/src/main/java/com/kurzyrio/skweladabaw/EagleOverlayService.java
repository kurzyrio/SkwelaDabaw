package com.kurzyrio.skweladabaw;

import android.animation.ValueAnimator;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.TextView;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class EagleOverlayService extends Service {

    public static final String ACTION_START = "com.kurzyrio.skweladabaw.START_EAGLE_OVERLAY";
    public static final String ACTION_STOP = "com.kurzyrio.skweladabaw.STOP_EAGLE_OVERLAY";
    public static final String ACTION_UPDATE_DATA = "com.kurzyrio.skweladabaw.UPDATE_EAGLE_OVERLAY_DATA";

    public static final String OVERLAY_CHANNEL_ID = "skweladabaw_eagle_overlay";
    public static final int OVERLAY_NOTIFICATION_ID = 88801;

    public static final String PREFS_NAME = "skweladabaw_eagle_overlay_prefs";
    public static final String PREF_IS_ACTIVE = "pref_is_active";

    private static volatile boolean sIsRunning = false;

    private WindowManager windowManager;
    private View bubbleView;
    private View dismissView;
    private View cardView;

    private WindowManager.LayoutParams bubbleParams;
    private WindowManager.LayoutParams dismissParams;
    private WindowManager.LayoutParams cardParams;

    private boolean isCardExpanded = false;
    private boolean isNearDismiss = false;
    private long lastCollapseTime = 0;
    private boolean isTasksTabSelected = false;
    private Vibrator vibrator;

    private final Handler autoUpdateHandler = new Handler(Looper.getMainLooper());
    private final Runnable autoUpdateRunnable = new Runnable() {
        @Override
        public void run() {
            if (sIsRunning) {
                if (isCardExpanded && cardView != null) {
                    updateCardContent();
                }
                autoUpdateHandler.postDelayed(this, 30000);
            }
        }
    };

    public static boolean isRunning() {
        return sIsRunning;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        createNotificationChannel();
        autoUpdateHandler.postDelayed(autoUpdateRunnable, 30000);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_UPDATE_DATA.equals(action)) {
                if (isCardExpanded && cardView != null) {
                    updateCardContent();
                }
                return START_STICKY;
            }
        }

        // Validate overlay permission on Android M+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForegroundNotification();
        sIsRunning = true;
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_IS_ACTIVE, true)
            .apply();

        initOverlayViews();

        autoUpdateHandler.removeCallbacks(autoUpdateRunnable);
        autoUpdateHandler.postDelayed(autoUpdateRunnable, 30000);

        return START_STICKY;
    }

    private void startForegroundNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingOpen = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Intent stopIntent = new Intent(this, EagleOverlayService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent pendingStop = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, OVERLAY_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_eagle_buddy)
            .setContentTitle("SkwelaDabaw Eagle Companion")
            .setContentText("Floating overlay is active • Tap to open app")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingOpen)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Close Overlay", pendingStop);

        Notification notification = builder.build();

        try {
            if (Build.VERSION.SDK_INT >= 34) {
                try {
                    startForeground(OVERLAY_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
                } catch (Exception typeErr) {
                    startForeground(OVERLAY_NOTIFICATION_ID, notification);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(OVERLAY_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_NONE);
            } else {
                startForeground(OVERLAY_NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(OVERLAY_NOTIFICATION_ID, notification);
            }
        }
    }

    private void initOverlayViews() {
        if (bubbleView != null && bubbleView.isAttachedToWindow()) {
            return;
        }

        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        LayoutInflater inflater = LayoutInflater.from(this);

        // 1. Bubble Layout Params & View
        bubbleParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = dpToPx(12);
        bubbleParams.y = dpToPx(160);

        bubbleView = inflater.inflate(R.layout.eagle_overlay_bubble, null);

        // 2. Dismiss Target Layout Params & View (FLAG_NOT_TOUCHABLE ensures it never blocks touches)
        dismissParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        dismissParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        dismissParams.y = dpToPx(75);

        dismissView = inflater.inflate(R.layout.eagle_overlay_dismiss, null);
        dismissView.setVisibility(View.GONE);

        // 3. Quick Info Card Layout Params & View
        cardParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        );
        cardParams.gravity = Gravity.TOP | Gravity.START;

        cardView = inflater.inflate(R.layout.eagle_overlay_card, null);
        setupCardListeners();
        applyThemeToOverlay();

        // Attach bubble and dismiss targets to WindowManager
        try {
            windowManager.addView(dismissView, dismissParams);
            windowManager.addView(bubbleView, bubbleParams);
        } catch (Exception e) {
            e.printStackTrace();
        }

        setupBubbleTouchListener();
    }

    private void setupBubbleTouchListener() {
        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private long touchStartTime;
            private boolean isDragMoved = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = bubbleParams.x;
                        initialY = bubbleParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        isDragMoved = false;
                        isNearDismiss = false;

                        showDismissTarget();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float deltaX = event.getRawX() - initialTouchX;
                        float deltaY = event.getRawY() - initialTouchY;

                        if (Math.hypot(deltaX, deltaY) > dpToPx(8)) {
                            isDragMoved = true;
                        }

                        bubbleParams.x = initialX + (int) deltaX;
                        bubbleParams.y = initialY + (int) deltaY;

                        try {
                            if (bubbleView != null && bubbleView.isAttachedToWindow()) {
                                windowManager.updateViewLayout(bubbleView, bubbleParams);
                            }
                        } catch (Exception ignored) {}

                        checkDismissProximity(event.getRawX(), event.getRawY());
                        return true;

                    case MotionEvent.ACTION_UP:
                        hideDismissTarget();

                        if (isNearDismiss) {
                            vibrate(60);
                            animateBubbleIntoDismissAndStop();
                            return true;
                        }

                        long touchDuration = System.currentTimeMillis() - touchStartTime;
                        float totalDistance = (float) Math.hypot(event.getRawX() - initialTouchX, event.getRawY() - initialTouchY);

                        if (!isDragMoved || (totalDistance < dpToPx(10) && touchDuration < 300)) {
                            if (System.currentTimeMillis() - lastCollapseTime > 250) {
                                toggleCardView();
                            }
                        } else {
                            snapBubbleToEdge();
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void showDismissTarget() {
        if (dismissView != null) {
            dismissView.setVisibility(View.VISIBLE);
            dismissView.setAlpha(0f);
            dismissView.setScaleX(0.7f);
            dismissView.setScaleY(0.7f);
            dismissView.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(180).start();
        }
    }

    private void hideDismissTarget() {
        if (dismissView != null) {
            dismissView.animate().alpha(0f).scaleX(0.7f).scaleY(0.7f).setDuration(180).withEndAction(() -> {
                if (dismissView != null) {
                    dismissView.setVisibility(View.GONE);
                    dismissView.setScaleX(1.0f);
                    dismissView.setScaleY(1.0f);
                }
            }).start();
        }
    }

    private void checkDismissProximity(float rawX, float rawY) {
        if (dismissView == null || dismissView.getVisibility() != View.VISIBLE) return;

        int[] dismissLoc = new int[2];
        dismissView.getLocationOnScreen(dismissLoc);
        float dismissCenterX = dismissLoc[0] + dismissView.getWidth() / 2.0f;
        float dismissCenterY = dismissLoc[1] + dismissView.getHeight() / 2.0f;

        float dist = (float) Math.hypot(rawX - dismissCenterX, rawY - dismissCenterY);
        boolean near = dist < dpToPx(110);

        if (near && !isNearDismiss) {
            isNearDismiss = true;
            vibrate(40);
            dismissView.animate().scaleX(1.35f).scaleY(1.35f).setDuration(150).start();
        } else if (!near && isNearDismiss) {
            isNearDismiss = false;
            dismissView.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start();
        }
    }

    private void animateBubbleIntoDismissAndStop() {
        if (bubbleView != null) {
            bubbleView.animate()
                .scaleX(0.1f)
                .scaleY(0.1f)
                .alpha(0f)
                .setDuration(220)
                .withEndAction(this::stopSelf)
                .start();
        } else {
            stopSelf();
        }
    }

    private void snapBubbleToEdge() {
        DisplayMetrics metrics = getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int screenHeight = metrics.heightPixels;
        int bubbleWidth = bubbleView.getWidth() > 0 ? bubbleView.getWidth() : dpToPx(58);
        int bubbleHeight = bubbleView.getHeight() > 0 ? bubbleView.getHeight() : dpToPx(58);

        int margin = dpToPx(8);
        int bubbleCenterX = bubbleParams.x + bubbleWidth / 2;
        int targetX = (bubbleCenterX < screenWidth / 2) ? margin : (screenWidth - bubbleWidth - margin);

        // Clamp Y position within visible screen bounds
        int minY = dpToPx(36);
        int maxY = screenHeight - bubbleHeight - dpToPx(64);
        if (bubbleParams.y < minY) bubbleParams.y = minY;
        if (bubbleParams.y > maxY) bubbleParams.y = maxY;

        ValueAnimator animator = ValueAnimator.ofInt(bubbleParams.x, targetX);
        animator.setDuration(250);
        animator.setInterpolator(new DecelerateInterpolator(1.5f));
        animator.addUpdateListener(animation -> {
            bubbleParams.x = (Integer) animation.getAnimatedValue();
            try {
                if (bubbleView != null && bubbleView.isAttachedToWindow()) {
                    windowManager.updateViewLayout(bubbleView, bubbleParams);
                }
            } catch (Exception ignored) {}
        });
        animator.start();
    }

    private void toggleCardView() {
        if (isCardExpanded) {
            collapseCardView();
        } else {
            expandCardView();
        }
    }

    private void expandCardView() {
        if (cardView == null) return;
        if (System.currentTimeMillis() - lastCollapseTime < 250) return;

        updateCardContent();

        DisplayMetrics metrics = getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int screenHeight = metrics.heightPixels;
        int cardWidth = Math.min(dpToPx(336), screenWidth - dpToPx(20));

        int bubbleWidth = bubbleView != null && bubbleView.getWidth() > 0 ? bubbleView.getWidth() : dpToPx(58);
        int bubbleHeight = bubbleView != null && bubbleView.getHeight() > 0 ? bubbleView.getHeight() : dpToPx(58);
        int bubbleCenterX = bubbleParams.x + bubbleWidth / 2;

        // Position horizontally tracking the bubble position
        int targetX;
        if (bubbleCenterX < screenWidth / 2) {
            // Bubble on left half -> align card to left near bubble
            targetX = Math.max(dpToPx(10), bubbleParams.x);
        } else {
            // Bubble on right half -> align card to right near bubble
            targetX = Math.min(screenWidth - cardWidth - dpToPx(10), bubbleParams.x + bubbleWidth - cardWidth);
        }
        cardParams.x = Math.max(dpToPx(10), Math.min(targetX, screenWidth - cardWidth - dpToPx(10)));
        cardParams.width = cardWidth;

        // Position vertically near the bubble
        int estimatedCardHeight = dpToPx(330);
        if (bubbleParams.y + bubbleHeight + estimatedCardHeight + dpToPx(16) <= screenHeight) {
            cardParams.y = bubbleParams.y + bubbleHeight + dpToPx(8);
        } else if (bubbleParams.y - estimatedCardHeight - dpToPx(8) >= dpToPx(32)) {
            cardParams.y = bubbleParams.y - estimatedCardHeight - dpToPx(8);
        } else {
            cardParams.y = Math.max(dpToPx(36), (screenHeight - estimatedCardHeight) / 2);
        }

        try {
            cardView.animate().cancel();
            cardView.setVisibility(View.VISIBLE);
            cardView.setAlpha(0f);
            cardView.setScaleX(0.88f);
            cardView.setScaleY(0.88f);

            if (!cardView.isAttachedToWindow()) {
                windowManager.addView(cardView, cardParams);
            } else {
                windowManager.updateViewLayout(cardView, cardParams);
            }

            cardView.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(190)
                .setInterpolator(new DecelerateInterpolator(1.5f))
                .start();
            isCardExpanded = true;
        } catch (Exception ignored) {}
    }

    private void collapseCardView() {
        if (!isCardExpanded || cardView == null) return;
        isCardExpanded = false;
        lastCollapseTime = System.currentTimeMillis();

        try {
            cardView.animate().cancel();
            cardView.animate()
                .alpha(0f)
                .scaleX(0.88f)
                .scaleY(0.88f)
                .setDuration(150)
                .withEndAction(() -> {
                    try {
                        if (cardView != null && cardView.isAttachedToWindow()) {
                            windowManager.removeView(cardView);
                        }
                    } catch (Exception ignored) {}
                })
                .start();
        } catch (Exception e) {
            try {
                if (cardView != null && cardView.isAttachedToWindow()) {
                    windowManager.removeView(cardView);
                }
            } catch (Exception ignored) {}
        }
    }

    private void setupCardListeners() {
        // Outside touch dismissal
        cardView.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_OUTSIDE) {
                collapseCardView();
                return true;
            }
            return false;
        });

        // Close button
        TextView btnClose = cardView.findViewById(R.id.card_btn_close);
        if (btnClose != null) {
            btnClose.setOnClickListener(v -> collapseCardView());
        }

        // Interactive Refresh Button
        TextView btnRefresh = cardView.findViewById(R.id.card_btn_refresh);
        if (btnRefresh != null) {
            btnRefresh.setOnClickListener(v -> {
                vibrate(25);
                btnRefresh.animate().rotationBy(360f).setDuration(400).start();
                updateCardContent();
            });
        }

        // Interactive Tab: Classes
        TextView tabClasses = cardView.findViewById(R.id.card_tab_classes);
        TextView tabTasks = cardView.findViewById(R.id.card_tab_tasks);
        View sectionClasses = cardView.findViewById(R.id.card_classes_section);
        View sectionTasks = cardView.findViewById(R.id.card_tasks_section);

        if (tabClasses != null && tabTasks != null) {
            tabClasses.setOnClickListener(v -> {
                isTasksTabSelected = false;
                if (sectionClasses != null) sectionClasses.setVisibility(View.VISIBLE);
                if (sectionTasks != null) sectionTasks.setVisibility(View.GONE);
                applyThemeToOverlay();
            });

            tabTasks.setOnClickListener(v -> {
                isTasksTabSelected = true;
                if (sectionClasses != null) sectionClasses.setVisibility(View.GONE);
                if (sectionTasks != null) sectionTasks.setVisibility(View.VISIBLE);
                applyThemeToOverlay();
            });
        }

        // Clickable Weather Card -> Launches Weather Screen
        View weatherContainer = cardView.findViewById(R.id.card_weather_container);
        if (weatherContainer != null) {
            weatherContainer.setOnClickListener(v -> {
                collapseCardView();
                startApp("weather", null);
            });
        }

        // Clickable Classes Card -> Launches Schedule Screen
        if (sectionClasses != null) {
            sectionClasses.setOnClickListener(v -> {
                collapseCardView();
                startApp("schedule", null);
            });
        }

        // Clickable Tasks Card -> Launches Tasks Screen
        if (sectionTasks != null) {
            sectionTasks.setOnClickListener(v -> {
                collapseCardView();
                startApp("tasks", null);
            });
        }

        // Open App Button
        Button btnOpenApp = cardView.findViewById(R.id.card_btn_open_app);
        if (btnOpenApp != null) {
            btnOpenApp.setOnClickListener(v -> {
                collapseCardView();
                startApp(null, null);
            });
        }

        // Quick Navigation: Timetable
        TextView actionTimetable = cardView.findViewById(R.id.card_action_timetable);
        if (actionTimetable != null) {
            actionTimetable.setOnClickListener(v -> {
                collapseCardView();
                startApp("schedule", null);
            });
        }

        // Quick Navigation: DC Bus
        TextView actionBus = cardView.findViewById(R.id.card_action_bus);
        if (actionBus != null) {
            actionBus.setOnClickListener(v -> {
                collapseCardView();
                startApp("dcbus", null);
            });
        }

        // Quick Navigation: Tasks
        TextView actionTasks = cardView.findViewById(R.id.card_action_tasks);
        if (actionTasks != null) {
            actionTasks.setOnClickListener(v -> {
                collapseCardView();
                startApp("tasks", null);
            });
        }
    }

    private void updateCardContent() {
        if (cardView == null) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String weatherTemp = prefs.getString("weather_temp", "31°C");
        String weatherCond = prefs.getString("weather_condition", "Davao City • Partly Cloudy");
        String heatIndex = prefs.getString("heat_index", "Heat: 36°C");

        String currentClass = prefs.getString("current_class", null);
        String currentRoom = prefs.getString("current_room", null);
        String currentTime = prefs.getString("current_time", null);

        String nextClass = prefs.getString("next_class", null);
        String nextRoom = prefs.getString("next_room", null);
        String nextTime = prefs.getString("next_time", null);

        int pendingTasks = prefs.getInt("pending_tasks_count", 0);
        String nextTaskTitle = prefs.getString("next_task_title", null);
        String nextTaskDue = prefs.getString("next_task_due", null);

        // Update Weather
        TextView tvTemp = cardView.findViewById(R.id.card_weather_temp);
        TextView tvCond = cardView.findViewById(R.id.card_weather_cond);
        TextView tvBadge = cardView.findViewById(R.id.card_weather_badge);

        if (tvTemp != null) tvTemp.setText(weatherTemp);
        if (tvCond != null) tvCond.setText(weatherCond);
        if (tvBadge != null) {
            if (heatIndex != null && !heatIndex.isEmpty()) {
                tvBadge.setVisibility(View.VISIBLE);
                tvBadge.setText(heatIndex.startsWith("Heat:") ? heatIndex : "Heat: " + heatIndex);
            } else {
                tvBadge.setVisibility(View.GONE);
            }
        }

        // Update Class Information
        TextView tvStatusLabel = cardView.findViewById(R.id.card_class_status_label);
        TextView tvSubject = cardView.findViewById(R.id.card_class_subject);
        TextView tvMeta = cardView.findViewById(R.id.card_class_meta);

        if (currentClass != null && !currentClass.trim().isEmpty()) {
            if (tvStatusLabel != null) {
                tvStatusLabel.setText("CURRENT ONGOING CLASS");
                tvStatusLabel.setTextColor(0xFF30D158);
            }
            if (tvSubject != null) tvSubject.setText(currentClass);
            String meta = (currentTime != null ? currentTime : "") +
                ((currentRoom != null && !currentRoom.isEmpty()) ? " • " + currentRoom : "");
            if (tvMeta != null) tvMeta.setText(meta.isEmpty() ? "In Session" : meta);
        } else if (nextClass != null && !nextClass.trim().isEmpty()) {
            if (tvStatusLabel != null) {
                tvStatusLabel.setText("UPCOMING NEXT CLASS");
                tvStatusLabel.setTextColor(0xFF38BDF8);
            }
            if (tvSubject != null) tvSubject.setText(nextClass);
            String meta = (nextTime != null ? nextTime : "") +
                ((nextRoom != null && !nextRoom.isEmpty()) ? " • " + nextRoom : "");
            if (tvMeta != null) tvMeta.setText(meta.isEmpty() ? "Coming up" : meta);
        } else {
            if (tvStatusLabel != null) {
                tvStatusLabel.setText("CLASS TIMETABLE");
                tvStatusLabel.setTextColor(0xFF94A3B8);
            }
            if (tvSubject != null) tvSubject.setText("No Classes Today");
            if (tvMeta != null) tvMeta.setText("Tap to view full week schedule");
        }

        // Update Tasks Information
        TextView tabTasks = cardView.findViewById(R.id.card_tab_tasks);
        TextView tvTaskStatus = cardView.findViewById(R.id.card_task_status_label);
        TextView tvTaskTitle = cardView.findViewById(R.id.card_task_title);
        TextView tvTaskMeta = cardView.findViewById(R.id.card_task_meta);

        if (tabTasks != null) {
            tabTasks.setText(pendingTasks > 0 ? "Tasks (" + pendingTasks + ")" : "Tasks");
        }
        if (tvTaskStatus != null) {
            tvTaskStatus.setText(pendingTasks > 0 
                ? (pendingTasks + " DEADLINE" + (pendingTasks > 1 ? "S PENDING" : " PENDING")) 
                : "ALL DEADLINES COMPLETED");
            tvTaskStatus.setTextColor(pendingTasks > 0 ? 0xFFF59E0B : 0xFF30D158);
        }
        if (tvTaskTitle != null) {
            tvTaskTitle.setText(nextTaskTitle != null && !nextTaskTitle.isEmpty() ? nextTaskTitle : "All caught up!");
        }
        if (tvTaskMeta != null) {
            tvTaskMeta.setText(nextTaskDue != null && !nextTaskDue.isEmpty() ? "Due: " + nextTaskDue : "Tap to manage homework and projects");
        }

        // Restore active tab view state
        View sectionClasses = cardView.findViewById(R.id.card_classes_section);
        View sectionTasks = cardView.findViewById(R.id.card_tasks_section);
        TextView tabClasses = cardView.findViewById(R.id.card_tab_classes);

        // Apply active app theme to overlay
        applyThemeToOverlay();
    }

    private void applyThemeToOverlay() {
        if (cardView == null) return;
        try {
            WidgetScheduleHelper.WidgetTheme theme = WidgetScheduleHelper.getWidgetTheme(this);
            String themeId = WidgetScheduleHelper.getActiveThemeId(this);

            // 1. Root Card Background
            View cardRoot = cardView.findViewById(R.id.card_root);
            if (cardRoot != null) {
                cardRoot.setBackgroundResource(theme.cardBgRes);
            }

            // 2. Header
            TextView tvHeaderTitle = cardView.findViewById(R.id.card_header_title);
            if (tvHeaderTitle != null) tvHeaderTitle.setTextColor(theme.textPrimary);
            TextView tvHeaderSub = cardView.findViewById(R.id.card_header_subtitle);
            if (tvHeaderSub != null) tvHeaderSub.setTextColor(theme.textSecondary);
            TextView btnRefresh = cardView.findViewById(R.id.card_btn_refresh);
            if (btnRefresh != null) btnRefresh.setTextColor(theme.textAccent);
            TextView btnClose = cardView.findViewById(R.id.card_btn_close);
            if (btnClose != null) btnClose.setTextColor(theme.textSecondary);

            // 3. Weather Container
            View weatherContainer = cardView.findViewById(R.id.card_weather_container);
            if (weatherContainer != null) {
                weatherContainer.setBackgroundResource(theme.itemBgRes);
            }
            TextView tvTemp = cardView.findViewById(R.id.card_weather_temp);
            if (tvTemp != null) tvTemp.setTextColor(theme.textAccent);
            TextView tvCond = cardView.findViewById(R.id.card_weather_cond);
            if (tvCond != null) tvCond.setTextColor(theme.textPrimary);
            TextView tvWeatherSub = cardView.findViewById(R.id.card_weather_subtext);
            if (tvWeatherSub != null) tvWeatherSub.setTextColor(theme.textSecondary);

            // 4. Tab Switcher
            TextView tabClasses = cardView.findViewById(R.id.card_tab_classes);
            TextView tabTasks = cardView.findViewById(R.id.card_tab_tasks);
            if (tabClasses != null && tabTasks != null) {
                if (isTasksTabSelected) {
                    tabTasks.setBackgroundResource(theme.btnBgRes);
                    tabTasks.setTextColor(theme.textAccent);
                    tabClasses.setBackgroundResource(theme.badgeBgRes);
                    tabClasses.setTextColor(theme.textSecondary);
                } else {
                    tabClasses.setBackgroundResource(theme.btnBgRes);
                    tabClasses.setTextColor(theme.textAccent);
                    tabTasks.setBackgroundResource(theme.badgeBgRes);
                    tabTasks.setTextColor(theme.textSecondary);
                }
            }

            // 5. Classes Section
            View sectionClasses = cardView.findViewById(R.id.card_classes_section);
            if (sectionClasses != null) {
                sectionClasses.setBackgroundResource(theme.itemBgRes);
            }
            TextView tvSubject = cardView.findViewById(R.id.card_class_subject);
            if (tvSubject != null) tvSubject.setTextColor(theme.textPrimary);
            TextView tvMeta = cardView.findViewById(R.id.card_class_meta);
            if (tvMeta != null) tvMeta.setTextColor(theme.textSecondary);

            // 6. Tasks Section
            View sectionTasks = cardView.findViewById(R.id.card_tasks_section);
            if (sectionTasks != null) {
                sectionTasks.setBackgroundResource(theme.itemBgRes);
            }
            TextView tvTaskTitle = cardView.findViewById(R.id.card_task_title);
            if (tvTaskTitle != null) tvTaskTitle.setTextColor(theme.textPrimary);
            TextView tvTaskMeta = cardView.findViewById(R.id.card_task_meta);
            if (tvTaskMeta != null) tvTaskMeta.setTextColor(theme.textSecondary);

            // 7. Open App Button
            Button btnOpenApp = cardView.findViewById(R.id.card_btn_open_app);
            if (btnOpenApp != null) {
                btnOpenApp.setBackgroundResource(theme.btnBgRes);
                btnOpenApp.setTextColor(theme.btnTextColor);
            }

            // 8. Navigation Action Chips
            TextView btnTimetable = cardView.findViewById(R.id.card_action_timetable);
            if (btnTimetable != null) {
                btnTimetable.setBackgroundResource(theme.btnBgRes);
                btnTimetable.setTextColor(theme.btnTextColor);
            }
            TextView btnBus = cardView.findViewById(R.id.card_action_bus);
            if (btnBus != null) {
                btnBus.setBackgroundResource(theme.btnBgRes);
                btnBus.setTextColor(theme.textAccent);
            }
            TextView btnTasksAction = cardView.findViewById(R.id.card_action_tasks);
            if (btnTasksAction != null) {
                btnTasksAction.setBackgroundResource(theme.btnBgRes);
                btnTasksAction.setTextColor(theme.textAccent);
            }

            // 9. Floating Mascot Bubble theme background & stroke
            if (bubbleView != null) {
                View bubbleRoot = bubbleView.findViewById(R.id.bubble_root);
                if (bubbleRoot != null) {
                    android.graphics.drawable.GradientDrawable gd = new android.graphics.drawable.GradientDrawable();
                    gd.setShape(android.graphics.drawable.GradientDrawable.OVAL);
                    int bubbleBgColor;
                    if ("light".equals(themeId)) {
                        bubbleBgColor = 0xFFFFFFFF;
                    } else if ("oled".equals(themeId)) {
                        bubbleBgColor = 0xFF000000;
                    } else if ("emerald".equals(themeId)) {
                        bubbleBgColor = 0xFF064E3B;
                    } else if ("violet".equals(themeId)) {
                        bubbleBgColor = 0xFF2E1065;
                    } else {
                        bubbleBgColor = 0xFF18181B;
                    }
                    gd.setColor(bubbleBgColor);
                    gd.setStroke(dpToPx(2), theme.textAccent);
                    bubbleRoot.setBackground(gd);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void startApp(@Nullable String targetTab, @Nullable String targetAction) {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (targetTab != null) {
                intent.putExtra("target_tab", targetTab);
            }
            if (targetAction != null) {
                intent.putExtra("target_action", targetAction);
            }
            startActivity(intent);
        } catch (Exception e) {
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (targetTab != null) launchIntent.putExtra("target_tab", targetTab);
                startActivity(launchIntent);
            }
        }
    }

    private void vibrate(long ms) {
        try {
            if (vibrator == null) {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(ms);
                }
            }
        } catch (Exception ignored) {}
    }

    private DisplayMetrics getDisplayMetrics() {
        DisplayMetrics metrics = new DisplayMetrics();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                android.view.WindowMetrics wm = windowManager.getCurrentWindowMetrics();
                android.graphics.Rect bounds = wm.getBounds();
                metrics.widthPixels = bounds.width();
                metrics.heightPixels = bounds.height();
                metrics.density = getResources().getDisplayMetrics().density;
                return metrics;
            } catch (Exception ignored) {}
        }
        windowManager.getDefaultDisplay().getMetrics(metrics);
        return metrics;
    }

    private int dpToPx(int dp) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            getResources().getDisplayMetrics()
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(OVERLAY_CHANNEL_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                        OVERLAY_CHANNEL_ID,
                        "Eagle Companion Overlay",
                        NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("System-wide floating student companion status");
                    channel.setShowBadge(false);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            if (prefs.getBoolean(PREF_IS_ACTIVE, false)) {
                Intent restartServiceIntent = new Intent(getApplicationContext(), EagleOverlayService.class);
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

    @Override
    public void onDestroy() {
        autoUpdateHandler.removeCallbacksAndMessages(null);
        sIsRunning = false;
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(PREF_IS_ACTIVE, false).apply();

        collapseCardView();

        if (windowManager != null) {
            if (cardView != null && cardView.isAttachedToWindow()) {
                try { windowManager.removeView(cardView); } catch (Exception ignored) {}
            }
            if (bubbleView != null && bubbleView.isAttachedToWindow()) {
                try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            }
            if (dismissView != null && dismissView.isAttachedToWindow()) {
                try { windowManager.removeView(dismissView); } catch (Exception ignored) {}
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(OVERLAY_NOTIFICATION_ID);
        }

        super.onDestroy();
    }
}
