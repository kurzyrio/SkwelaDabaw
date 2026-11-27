package com.kurzyrio.skweladabaw;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.Outline;
import android.graphics.PixelFormat;
import android.graphics.PorterDuff;
import android.graphics.Rect;
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
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.VelocityTracker;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.WindowMetrics;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import com.kurzyrio.skweladabaw.overlay.BubbleSpringEngine;
import com.kurzyrio.skweladabaw.overlay.OverlayDataResolver;
import com.kurzyrio.skweladabaw.overlay.OverlayThemePalette;

/**
 * Lightweight Messenger-style floating bubble and minimalist quick-glance overlay.
 * Features VSYNC-locked 2D spring physics, velocity fling projection, drag-only
 * magnetic dismiss, idle edge-tucking, orientation re-docking, and Back dismissal.
 */
public class EagleOverlayService extends Service {

    public static final String ACTION_START = "com.kurzyrio.skweladabaw.START_EAGLE_OVERLAY";
    public static final String ACTION_STOP = "com.kurzyrio.skweladabaw.STOP_EAGLE_OVERLAY";
    public static final String ACTION_UPDATE_DATA = "com.kurzyrio.skweladabaw.UPDATE_EAGLE_OVERLAY_DATA";
    public static final String ACTION_RESET_POSITION = "com.kurzyrio.skweladabaw.RESET_EAGLE_OVERLAY_POS";

    public static final String OVERLAY_CHANNEL_ID = "skweladabaw_eagle_overlay";
    public static final int OVERLAY_NOTIFICATION_ID = 88801;

    public static final String PREFS_NAME = "skweladabaw_eagle_overlay_prefs";
    public static final String PREF_IS_ACTIVE = "pref_is_active";
    public static final String PREF_DOCK_LEFT = "pref_dock_left";
    public static final String PREF_Y_RATIO = "pref_y_ratio";

    private static final float SPRING_STIFFNESS_SNAP = 340f;
    private static final float SPRING_DAMPING_SNAP = 0.74f;
    private static final float SPRING_STIFFNESS_DOCK = 420f;
    private static final float SPRING_DAMPING_DOCK = 0.80f;
    private static final long IDLE_TUCK_DELAY_MS = 4000L;
    private static final long LIVE_REFRESH_INTERVAL_MS = 30000L;

    private static volatile boolean sIsRunning = false;

    private WindowManager windowManager;
    private Vibrator vibrator;
    private BubbleSpringEngine bubbleSpring;

    // Three layered overlay windows (bottom -> top): dismiss, sheet, bubble
    private View dismissView;
    private View dismissGradient;
    private View dismissPill;
    private ImageView dismissIcon;

    private SheetHostView sheetHostView;
    private View sheetScrim;
    private View sheetCard;

    private View bubbleView;
    private View bubbleMotionLayer;
    private View bubbleCircle;
    private View bubbleStatusDot;

    private WindowManager.LayoutParams dismissParams;
    private WindowManager.LayoutParams sheetParams;
    private WindowManager.LayoutParams bubbleParams;

    // Cached layout metrics (in physical px)
    private int screenWidth;
    private int screenHeight;
    private int statusBarHeight;
    private int navBarHeight;
    private int bubbleWindowPx;
    private int bubbleVisualPx;
    private int bubbleGutterPx;
    private int touchSlopPx;
    private int maxFlingVelocityPx;

    // State
    private boolean isExpanded = false;
    private boolean isDragging = false;
    private boolean isCapturedByDismiss = false;
    private boolean isIdleTucked = false;
    private boolean isDockedLeft = false;
    private boolean explicitUserStop = false;
    private float savedYRatio = 0.36f;
    private int preExpandX;
    private int preExpandY;
    private long lastStateToggleMs = 0L;

    private OverlayThemePalette activePalette;
    @Nullable
    private Object backInvokedCallbackObj;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable idleTuckRunnable = this::applyIdleEdgeTuck;
    private final Runnable liveRefreshRunnable = new Runnable() {
        @Override
        public void run() {
            if (!sIsRunning) return;
            refreshLiveSnapshot();
            mainHandler.postDelayed(this, LIVE_REFRESH_INTERVAL_MS);
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
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        bubbleSpring = new BubbleSpringEngine();

        ViewConfiguration vc = ViewConfiguration.get(this);
        touchSlopPx = Math.max(dpToPx(6), vc.getScaledTouchSlop());
        maxFlingVelocityPx = vc.getScaledMaximumFlingVelocity();
        bubbleWindowPx = dpToPx(76);
        bubbleVisualPx = dpToPx(56);
        bubbleGutterPx = (bubbleWindowPx - bubbleVisualPx) / 2;

        createNotificationChannel();
        refreshDisplayBounds();
        loadSavedDockPosition();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;

        if (ACTION_STOP.equals(action)) {
            stopByUserChoice();
            return START_NOT_STICKY;
        }

        if (ACTION_UPDATE_DATA.equals(action)) {
            if (sIsRunning && bubbleView != null) {
                activePalette = OverlayThemePalette.resolve(this);
                applyTheme();
                refreshLiveSnapshot();
            }
            return START_STICKY;
        }

        if (ACTION_RESET_POSITION.equals(action)) {
            if (sIsRunning && bubbleView != null) {
                resetToDefaultDock();
            }
            return START_STICKY;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopByUserChoice();
            return START_NOT_STICKY;
        }

        explicitUserStop = false;
        startForegroundNotification();
        sIsRunning = true;
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_IS_ACTIVE, true)
            .apply();

        initOverlayWindows();
        refreshLiveSnapshot();

        mainHandler.removeCallbacks(liveRefreshRunnable);
        mainHandler.postDelayed(liveRefreshRunnable, LIVE_REFRESH_INTERVAL_MS);

        return START_STICKY;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (!sIsRunning || bubbleView == null || windowManager == null) return;

        refreshDisplayBounds();
        if (isExpanded) {
            updateSheetCardGeometry();
            int targetX = getExpandedBubbleX();
            int targetY = getExpandedBubbleY();
            preExpandX = getRestDockX(isDockedLeft);
            preExpandY = getRestYFromRatio(savedYRatio);
            moveBubbleWindow(targetX, targetY);
        } else {
            cancelIdleTuck();
            int targetX = getRestDockX(isDockedLeft);
            int targetY = getRestYFromRatio(savedYRatio);
            bubbleSpring.start(
                bubbleParams.x, bubbleParams.y,
                targetX, targetY,
                0f, 0f,
                SPRING_STIFFNESS_DOCK, SPRING_DAMPING_DOCK,
                (x, y, vx, vy) -> moveBubbleWindow(Math.round(x), Math.round(y)),
                this::scheduleIdleEdgeTuck
            );
        }
    }

    private void initOverlayWindows() {
        if (bubbleView != null && bubbleView.isAttachedToWindow()) {
            activePalette = OverlayThemePalette.resolve(this);
            applyTheme();
            return;
        }

        detachAllWindows();
        refreshDisplayBounds();
        loadSavedDockPosition();
        activePalette = OverlayThemePalette.resolve(this);

        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        LayoutInflater inflater = LayoutInflater.from(this);

        // 1. Bottom Layer: Magnetic Dismiss Zone (non-touchable, hidden until drag starts)
        dismissParams = createBaseOverlayParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            dpToPx(168),
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        dismissParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        dismissView = inflater.inflate(R.layout.overlay_dismiss_zone, null);
        dismissGradient = dismissView.findViewById(R.id.ov_dismiss_gradient);
        dismissPill = dismissView.findViewById(R.id.ov_dismiss_pill);
        dismissIcon = dismissView.findViewById(R.id.ov_dismiss_icon);
        dismissGradient.setBackground(OverlayThemePalette.bottomScrimGradient());
        dismissView.setVisibility(View.GONE);

        // 2. Middle Layer: Expanded Minimalist Sheet + Scrim (GONE + non-touchable when collapsed)
        sheetParams = createBaseOverlayParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        );
        sheetParams.gravity = Gravity.TOP | Gravity.START;

        sheetHostView = new SheetHostView(this);
        inflater.inflate(R.layout.overlay_sheet, sheetHostView, true);
        sheetScrim = sheetHostView.findViewById(R.id.ov_sheet_scrim);
        sheetCard = sheetHostView.findViewById(R.id.ov_sheet_card);
        sheetHostView.setVisibility(View.GONE);
        setupSheetInteractions();

        // 3. Top Layer: Messenger-Style Circular Bubble (always sits cleanly above scrim & sheet)
        bubbleParams = createBaseOverlayParams(
            bubbleWindowPx,
            bubbleWindowPx,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        );
        bubbleParams.gravity = Gravity.TOP | Gravity.START;
        bubbleParams.x = getRestDockX(isDockedLeft);
        bubbleParams.y = getRestYFromRatio(savedYRatio);

        bubbleView = inflater.inflate(R.layout.overlay_bubble_head, null);
        bubbleMotionLayer = bubbleView.findViewById(R.id.ov_bubble_motion_layer);
        bubbleCircle = bubbleView.findViewById(R.id.ov_bubble_circle);
        bubbleStatusDot = bubbleView.findViewById(R.id.ov_bubble_status_dot);

        // Crisp circular clip for the avatar head
        bubbleCircle.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                outline.setOval(0, 0, view.getWidth(), view.getHeight());
            }
        });
        bubbleCircle.setClipToOutline(true);

        applyTheme();
        setupBubbleTouchPhysics();

        try {
            windowManager.addView(dismissView, dismissParams);
            windowManager.addView(sheetHostView, sheetParams);
            windowManager.addView(bubbleView, bubbleParams);
        } catch (Exception e) {
            e.printStackTrace();
            return;
        }

        // Play crisp spring entrance pop-in
        bubbleMotionLayer.setScaleX(0.4f);
        bubbleMotionLayer.setScaleY(0.4f);
        bubbleMotionLayer.setAlpha(0f);
        bubbleMotionLayer.animate()
            .scaleX(1f)
            .scaleY(1f)
            .alpha(1f)
            .setDuration(260)
            .setInterpolator(new OvershootInterpolator(1.4f))
            .withEndAction(this::scheduleIdleEdgeTuck)
            .start();
    }

    private WindowManager.LayoutParams createBaseOverlayParams(int w, int h, int type, int flags) {
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            w, h, type, flags, PixelFormat.TRANSLUCENT
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        return lp;
    }

    private void setupBubbleTouchPhysics() {
        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            private float downRawX;
            private float downRawY;
            private int startWinX;
            private int startWinY;
            private float lastRawX;
            private long lastMoveTimeMs;
            private VelocityTracker velocityTracker;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                int action = event.getActionMasked();

                switch (action) {
                    case MotionEvent.ACTION_DOWN:
                        bubbleSpring.cancel();
                        cancelIdleTuck();
                        wakeBubbleVisuals(0.91f);

                        downRawX = event.getRawX();
                        downRawY = event.getRawY();
                        lastRawX = downRawX;
                        lastMoveTimeMs = event.getEventTime();
                        startWinX = bubbleParams.x;
                        startWinY = bubbleParams.y;
                        isDragging = false;
                        isCapturedByDismiss = false;

                        if (velocityTracker != null) {
                            velocityTracker.recycle();
                        }
                        velocityTracker = VelocityTracker.obtain();
                        trackRawMotion(velocityTracker, event);
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        if (velocityTracker != null) {
                            trackRawMotion(velocityTracker, event);
                        }

                        // While expanded, keep bubble anchored cleanly; tap collapses it
                        if (isExpanded) {
                            return true;
                        }

                        float rawX = event.getRawX();
                        float rawY = event.getRawY();
                        float dx = rawX - downRawX;
                        float dy = rawY - downRawY;

                        if (!isDragging && Math.hypot(dx, dy) > touchSlopPx) {
                            isDragging = true;
                            bubbleMotionLayer.animate()
                                .scaleX(1.06f)
                                .scaleY(1.06f)
                                .setDuration(110)
                                .setInterpolator(new DecelerateInterpolator())
                                .start();
                            showDismissZone();
                        }

                        if (!isDragging) {
                            return true;
                        }

                        int desiredX = Math.round(startWinX + dx);
                        int desiredY = Math.round(startWinY + dy);

                        // Subtle drag velocity tilt (Messenger tactile weight)
                        long dtMs = Math.max(1L, event.getEventTime() - lastMoveTimeMs);
                        float instVx = (rawX - lastRawX) / dtMs * 1000f;
                        lastRawX = rawX;
                        lastMoveTimeMs = event.getEventTime();

                        handleDragWithMagneticDismiss(rawX, rawY, desiredX, desiredY, instVx);
                        return true;

                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        float vx = 0f;
                        float vy = 0f;
                        if (velocityTracker != null) {
                            trackRawMotion(velocityTracker, event);
                            velocityTracker.computeCurrentVelocity(1000, maxFlingVelocityPx);
                            vx = velocityTracker.getXVelocity();
                            vy = velocityTracker.getYVelocity();
                            velocityTracker.recycle();
                            velocityTracker = null;
                        }

                        if (isExpanded) {
                            bubbleMotionLayer.animate().scaleX(1f).scaleY(1f).rotation(0f).setDuration(140).start();
                            if (action == MotionEvent.ACTION_UP) {
                                collapseSheet();
                            }
                            return true;
                        }

                        if (isDragging) {
                            boolean dismissNow = isCapturedByDismiss && action == MotionEvent.ACTION_UP;
                            isDragging = false;
                            isCapturedByDismiss = false;

                            if (dismissNow) {
                                performMagneticDismissShutdown();
                            } else {
                                hideDismissZone();
                                bubbleMotionLayer.animate()
                                    .scaleX(1f)
                                    .scaleY(1f)
                                    .rotation(0f)
                                    .setDuration(180)
                                    .setInterpolator(new OvershootInterpolator(1.2f))
                                    .start();
                                launchFlingSnapToEdge(vx, vy);
                            }
                        } else {
                            bubbleMotionLayer.animate()
                                .scaleX(1f)
                                .scaleY(1f)
                                .rotation(0f)
                                .setDuration(150)
                                .setInterpolator(new OvershootInterpolator(1.2f))
                                .start();
                            if (action == MotionEvent.ACTION_UP) {
                                toggleExpanded();
                            } else {
                                scheduleIdleEdgeTuck();
                            }
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void trackRawMotion(VelocityTracker tracker, MotionEvent event) {
        MotionEvent rawCopy = MotionEvent.obtain(event);
        rawCopy.setLocation(event.getRawX(), event.getRawY());
        tracker.addMovement(rawCopy);
        rawCopy.recycle();
    }

    private void handleDragWithMagneticDismiss(
        float rawX,
        float rawY,
        int desiredX,
        int desiredY,
        float instantVx
    ) {
        float dismissCenterX = screenWidth / 2f;
        float dismissCenterY = screenHeight - dpToPx(68) - (navBarHeight * 0.35f);
        float dist = (float) Math.hypot(rawX - dismissCenterX, rawY - dismissCenterY);

        float captureRadius = isCapturedByDismiss ? dpToPx(98) : dpToPx(84);
        float attractRadius = dpToPx(190);

        if (dist < captureRadius) {
            if (!isCapturedByDismiss) {
                isCapturedByDismiss = true;
                triggerCrispHaptic();
                updateDismissPillVisual(true);
                bubbleMotionLayer.animate()
                    .scaleX(0.84f)
                    .scaleY(0.84f)
                    .rotation(0f)
                    .setDuration(130)
                    .setInterpolator(new DecelerateInterpolator())
                    .start();
            }

            // Dismiss pill subtly yields toward the finger while bubble locks onto pill center
            float pullX = (rawX - dismissCenterX) * 0.16f;
            float pullY = (rawY - dismissCenterY) * 0.16f;
            dismissPill.setTranslationX(pullX);
            dismissPill.setTranslationY(pullY);

            int lockedWinX = Math.round(dismissCenterX + pullX - bubbleWindowPx / 2f);
            int lockedWinY = Math.round(dismissCenterY + pullY - bubbleWindowPx / 2f);
            moveBubbleWindow(lockedWinX, lockedWinY);
        } else {
            if (isCapturedByDismiss) {
                isCapturedByDismiss = false;
                updateDismissPillVisual(false);
                bubbleMotionLayer.animate()
                    .scaleX(1.06f)
                    .scaleY(1.06f)
                    .setDuration(130)
                    .start();
            }

            if (dist < attractRadius) {
                float factor = (1f - dist / attractRadius) * 0.08f;
                dismissPill.setTranslationX((rawX - dismissCenterX) * factor);
                dismissPill.setTranslationY((rawY - dismissCenterY) * factor);
            } else {
                dismissPill.setTranslationX(0f);
                dismissPill.setTranslationY(0f);
            }

            float targetTilt = Math.max(-8f, Math.min(8f, instantVx / 260f));
            bubbleMotionLayer.setRotation(bubbleMotionLayer.getRotation() * 0.65f + targetTilt * 0.35f);
            moveBubbleWindow(desiredX, desiredY);
        }
    }

    private void launchFlingSnapToEdge(float vx, float vy) {
        float currentCenterX = bubbleParams.x + bubbleWindowPx / 2f;
        float projectedCenterX = currentCenterX + vx * 0.16f;
        isDockedLeft = projectedCenterX < (screenWidth / 2f);

        int targetX = getRestDockX(isDockedLeft);
        int minY = getMinSafeY();
        int maxY = getMaxSafeY();
        float projectedY = bubbleParams.y + vy * 0.12f;
        int targetY = Math.round(Math.max(minY, Math.min(maxY, projectedY)));

        savedYRatio = computeYRatio(targetY);
        persistDockPosition();

        float clampedVx = Math.max(-3600f, Math.min(3600f, vx));
        float clampedVy = Math.max(-2800f, Math.min(2800f, vy));

        bubbleSpring.start(
            bubbleParams.x, bubbleParams.y,
            targetX, targetY,
            clampedVx, clampedVy,
            SPRING_STIFFNESS_SNAP, SPRING_DAMPING_SNAP,
            (x, y, curVx, curVy) -> moveBubbleWindow(Math.round(x), Math.round(y)),
            this::scheduleIdleEdgeTuck
        );
    }

    private void resetToDefaultDock() {
        if (isExpanded) {
            collapseSheet();
        }
        isDockedLeft = false;
        savedYRatio = 0.36f;
        persistDockPosition();
        cancelIdleTuck();
        wakeBubbleVisuals(1f);

        int targetX = getRestDockX(false);
        int targetY = getRestYFromRatio(savedYRatio);
        bubbleSpring.start(
            bubbleParams.x, bubbleParams.y,
            targetX, targetY,
            0f, 0f,
            SPRING_STIFFNESS_SNAP, SPRING_DAMPING_SNAP,
            (x, y, vx, vy) -> moveBubbleWindow(Math.round(x), Math.round(y)),
            this::scheduleIdleEdgeTuck
        );
    }

    private void showDismissZone() {
        if (dismissView == null) return;
        dismissView.animate().cancel();
        dismissPill.animate().cancel();
        dismissPill.setTranslationX(0f);
        dismissPill.setTranslationY(dpToPx(64));
        dismissPill.setScaleX(0.72f);
        dismissPill.setScaleY(0.72f);
        updateDismissPillVisual(false);

        dismissView.setAlpha(0f);
        dismissView.setVisibility(View.VISIBLE);
        dismissView.animate()
            .alpha(1f)
            .setDuration(160)
            .setInterpolator(new DecelerateInterpolator())
            .start();
        dismissPill.animate()
            .translationY(0f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(220)
            .setInterpolator(new OvershootInterpolator(1.25f))
            .start();
    }

    private void hideDismissZone() {
        if (dismissView == null || dismissView.getVisibility() != View.VISIBLE) return;
        dismissPill.animate()
            .translationX(0f)
            .translationY(dpToPx(64))
            .scaleX(0.72f)
            .scaleY(0.72f)
            .setDuration(150)
            .setInterpolator(new DecelerateInterpolator())
            .start();
        dismissView.animate()
            .alpha(0f)
            .setDuration(160)
            .withEndAction(() -> {
                if (dismissView != null) {
                    dismissView.setVisibility(View.GONE);
                }
            })
            .start();
    }

    private void updateDismissPillVisual(boolean active) {
        if (dismissPill == null || dismissIcon == null) return;
        if (active) {
            dismissPill.setBackground(OverlayThemePalette.circleSurface(0xFFEF4444, 0x55FFFFFF, dpToPx(1)));
            dismissIcon.setColorFilter(0xFFFFFFFF, PorterDuff.Mode.SRC_IN);
            dismissPill.animate()
                .scaleX(1.14f)
                .scaleY(1.14f)
                .setDuration(130)
                .setInterpolator(new OvershootInterpolator(1.4f))
                .start();
        } else {
            dismissPill.setBackground(OverlayThemePalette.circleSurface(0xE01C1C1E, 0x33FFFFFF, dpToPx(1)));
            dismissIcon.setColorFilter(0xFFF4F4F5, PorterDuff.Mode.SRC_IN);
            dismissPill.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(130)
                .start();
        }
    }

    private void performMagneticDismissShutdown() {
        triggerCrispHaptic();
        cancelIdleTuck();
        bubbleSpring.cancel();

        bubbleMotionLayer.animate()
            .scaleX(0.18f)
            .scaleY(0.18f)
            .alpha(0f)
            .translationY(dpToPx(36))
            .setDuration(180)
            .setInterpolator(new DecelerateInterpolator())
            .withEndAction(this::stopByUserChoice)
            .start();
        hideDismissZone();
    }

    private void toggleExpanded() {
        long now = System.currentTimeMillis();
        if (now - lastStateToggleMs < 180) return;
        lastStateToggleMs = now;

        if (isExpanded) {
            collapseSheet();
        } else {
            expandSheet();
        }
    }

    private void expandSheet() {
        if (isExpanded || sheetHostView == null || bubbleView == null) return;
        isExpanded = true;
        cancelIdleTuck();
        wakeBubbleVisuals(1f);

        activePalette = OverlayThemePalette.resolve(this);
        applyTheme();
        refreshLiveSnapshot();

        preExpandX = bubbleParams.x;
        preExpandY = bubbleParams.y;

        // Enable focus & touch on the sheet scrim layer (sitting right below the bubble)
        sheetParams.flags = WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
        try {
            if (sheetHostView.isAttachedToWindow()) {
                windowManager.updateViewLayout(sheetHostView, sheetParams);
            }
        } catch (Exception ignored) {}

        updateSheetCardGeometry();
        sheetHostView.setVisibility(View.VISIBLE);
        sheetHostView.setFocusableInTouchMode(true);
        sheetHostView.requestFocus();
        registerPredictiveBack();

        // Fade in soft scrim
        sheetScrim.animate().cancel();
        sheetScrim.setAlpha(0f);
        sheetScrim.animate()
            .alpha(1f)
            .setDuration(190)
            .setInterpolator(new DecelerateInterpolator())
            .start();

        // Unfold airy sheet directly below the docked top-right bubble
        sheetCard.animate().cancel();
        sheetCard.setAlpha(0f);
        sheetCard.setScaleX(0.92f);
        sheetCard.setScaleY(0.92f);
        sheetCard.setTranslationY(-dpToPx(14));
        sheetCard.post(() -> {
            if (sheetCard != null) {
                sheetCard.setPivotX(Math.max(0f, sheetCard.getWidth() - dpToPx(28)));
                sheetCard.setPivotY(0f);
            }
        });
        sheetCard.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .translationY(0f)
            .setDuration(240)
            .setInterpolator(new OvershootInterpolator(0.85f))
            .start();

        // Spring the bubble cleanly up to the Messenger top-right anchor
        bubbleSpring.start(
            bubbleParams.x, bubbleParams.y,
            getExpandedBubbleX(), getExpandedBubbleY(),
            0f, 0f,
            SPRING_STIFFNESS_DOCK, SPRING_DAMPING_DOCK,
            (x, y, vx, vy) -> moveBubbleWindow(Math.round(x), Math.round(y)),
            null
        );
    }

    private void collapseSheet() {
        if (!isExpanded || sheetHostView == null) return;
        isExpanded = false;
        lastStateToggleMs = System.currentTimeMillis();
        unregisterPredictiveBack();

        // Collapse sheet gently back toward the bubble
        sheetCard.animate().cancel();
        sheetCard.animate()
            .alpha(0f)
            .scaleX(0.92f)
            .scaleY(0.92f)
            .translationY(-dpToPx(12))
            .setDuration(155)
            .setInterpolator(new DecelerateInterpolator())
            .start();

        sheetScrim.animate().cancel();
        sheetScrim.animate()
            .alpha(0f)
            .setDuration(165)
            .withEndAction(() -> {
                if (sheetHostView != null && !isExpanded) {
                    sheetHostView.setVisibility(View.GONE);
                    sheetParams.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
                    try {
                        if (sheetHostView.isAttachedToWindow()) {
                            windowManager.updateViewLayout(sheetHostView, sheetParams);
                        }
                    } catch (Exception ignored) {}
                }
            })
            .start();

        // Spring the bubble right back to its resting edge position
        int targetX = getRestDockX(isDockedLeft);
        int targetY = Math.max(getMinSafeY(), Math.min(getMaxSafeY(), preExpandY));
        bubbleSpring.start(
            bubbleParams.x, bubbleParams.y,
            targetX, targetY,
            0f, 0f,
            SPRING_STIFFNESS_DOCK, SPRING_DAMPING_DOCK,
            (x, y, vx, vy) -> moveBubbleWindow(Math.round(x), Math.round(y)),
            this::scheduleIdleEdgeTuck
        );
    }

    private void setupSheetInteractions() {
        // Tap scrim to close
        sheetScrim.setOnClickListener(v -> collapseSheet());

        // Swipe up on the sheet to dismiss effortlessly
        sheetCard.setOnTouchListener(new View.OnTouchListener() {
            private float startY;
            private boolean swiping;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        startY = event.getRawY();
                        swiping = false;
                        return false;
                    case MotionEvent.ACTION_MOVE:
                        float dy = event.getRawY() - startY;
                        if (!swiping && dy < -touchSlopPx * 1.4f) {
                            swiping = true;
                        }
                        if (swiping) {
                            sheetCard.setTranslationY(Math.min(0f, dy * 0.75f));
                            return true;
                        }
                        return false;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        if (swiping) {
                            float totalDy = event.getRawY() - startY;
                            swiping = false;
                            if (totalDy < -dpToPx(44)) {
                                collapseSheet();
                            } else {
                                sheetCard.animate()
                                    .translationY(0f)
                                    .setDuration(180)
                                    .setInterpolator(new OvershootInterpolator(1f))
                                    .start();
                            }
                            return true;
                        }
                        return false;
                }
                return false;
            }
        });

        View btnClose = sheetHostView.findViewById(R.id.ov_sheet_close);
        if (btnClose != null) {
            btnClose.setOnClickListener(v -> collapseSheet());
        }

        bindTabLaunch(R.id.ov_weather_pill, "weather");
        bindTabLaunch(R.id.ov_class_block, "schedule");
        bindTabLaunch(R.id.ov_task_row, "tasks");
        bindTabLaunch(R.id.ov_nav_schedule, "schedule");
        bindTabLaunch(R.id.ov_nav_jeep, "jeep");
        bindTabLaunch(R.id.ov_nav_bus, "dcbus");
        bindTabLaunch(R.id.ov_nav_tasks, "tasks");
    }

    private void bindTabLaunch(int viewId, final String tab) {
        View v = sheetHostView.findViewById(viewId);
        if (v != null) {
            v.setOnClickListener(clicked -> {
                collapseSheet();
                launchAppTab(tab);
            });
        }
    }

    private void updateSheetCardGeometry() {
        if (sheetCard == null) return;
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) sheetCard.getLayoutParams();
        int maxSheetWidth = dpToPx(380);
        int availWidth = Math.max(dpToPx(260), screenWidth - dpToPx(32));
        lp.width = Math.min(maxSheetWidth, availWidth);
        lp.topMargin = statusBarHeight + dpToPx(10) + bubbleVisualPx + dpToPx(12);
        sheetCard.setLayoutParams(lp);
    }

    private void refreshLiveSnapshot() {
        OverlayDataResolver.Snapshot snap = OverlayDataResolver.resolve(this);
        if (activePalette == null) {
            activePalette = OverlayThemePalette.resolve(this);
        }

        // Update subtle live status dot on the bubble
        if (bubbleStatusDot != null) {
            if (snap.showBubbleDot) {
                int dotColor = snap.isLiveClass ? activePalette.statusLive : activePalette.accent;
                bubbleStatusDot.setBackground(
                    OverlayThemePalette.circleSurface(dotColor, activePalette.bubbleBg, dpToPx(2))
                );
                bubbleStatusDot.setVisibility(View.VISIBLE);
            } else {
                bubbleStatusDot.setVisibility(View.GONE);
            }
        }

        if (sheetHostView == null) return;

        // Weather pill
        TextView tvWeather = sheetHostView.findViewById(R.id.ov_weather_text);
        TextView tvHeat = sheetHostView.findViewById(R.id.ov_weather_heat);
        if (tvWeather != null) tvWeather.setText(snap.weatherLine);
        if (tvHeat != null) {
            if (!snap.heatIndexPill.isEmpty()) {
                tvHeat.setText(snap.heatIndexPill);
                tvHeat.setVisibility(View.VISIBLE);
            } else {
                tvHeat.setVisibility(View.GONE);
            }
        }

        // Hero Class block
        View dotView = sheetHostView.findViewById(R.id.ov_class_dot);
        TextView tvStatus = sheetHostView.findViewById(R.id.ov_class_status);
        TextView tvTitle = sheetHostView.findViewById(R.id.ov_class_title);
        TextView tvMeta = sheetHostView.findViewById(R.id.ov_class_meta);

        int statusColor;
        if (snap.classMode == OverlayDataResolver.MODE_ONGOING) {
            statusColor = activePalette.statusLive;
        } else if (snap.classMode == OverlayDataResolver.MODE_UPCOMING) {
            statusColor = activePalette.accent;
        } else {
            statusColor = activePalette.textSecondary;
        }

        if (dotView != null) {
            dotView.setBackground(OverlayThemePalette.circleSurface(statusColor, 0, 0));
        }
        if (tvStatus != null) {
            tvStatus.setText(snap.classStatusText);
            tvStatus.setTextColor(statusColor);
        }
        if (tvTitle != null) {
            tvTitle.setText(snap.classTitle);
        }
        if (tvMeta != null) {
            if (snap.classMeta != null && !snap.classMeta.isEmpty()) {
                tvMeta.setText(snap.classMeta);
                tvMeta.setVisibility(View.VISIBLE);
            } else {
                tvMeta.setVisibility(View.GONE);
            }
        }

        // Optional single-line task peek
        View taskRow = sheetHostView.findViewById(R.id.ov_task_row);
        TextView tvTaskTitle = sheetHostView.findViewById(R.id.ov_task_title);
        TextView tvTaskDue = sheetHostView.findViewById(R.id.ov_task_due);
        if (taskRow != null) {
            if (snap.hasTask) {
                taskRow.setVisibility(View.VISIBLE);
                if (tvTaskTitle != null) tvTaskTitle.setText(snap.taskTitle);
                if (tvTaskDue != null) {
                    if (!snap.taskDue.isEmpty()) {
                        tvTaskDue.setText(snap.taskDue);
                        tvTaskDue.setVisibility(View.VISIBLE);
                    } else {
                        tvTaskDue.setVisibility(View.GONE);
                    }
                }
            } else {
                taskRow.setVisibility(View.GONE);
            }
        }
    }

    private void applyTheme() {
        if (activePalette == null) {
            activePalette = OverlayThemePalette.resolve(this);
        }
        OverlayThemePalette p = activePalette;

        // 1. Bubble circle surface (delicate hairline rim, zero harsh neon border)
        if (bubbleCircle != null) {
            bubbleCircle.setBackground(OverlayThemePalette.circleSurface(p.bubbleBg, p.bubbleRim, dpToPx(1)));
        }

        if (sheetHostView == null) return;

        // 2. Scrim & main sheet card
        sheetScrim.setBackgroundColor(p.scrimColor);
        sheetCard.setBackground(
            OverlayThemePalette.roundedSurface(p.surfaceBg, p.surfaceStroke, dpToPx(1), dpToPx(24))
        );

        // 3. Weather pill & close button
        View weatherPill = sheetHostView.findViewById(R.id.ov_weather_pill);
        if (weatherPill != null) {
            weatherPill.setBackground(
                OverlayThemePalette.rippleSurface(p.surfaceNestedBg, 0, 0, dpToPx(999), p.rippleColor)
            );
        }
        tintImage(R.id.ov_weather_icon, p.accent);
        setTextColor(R.id.ov_weather_text, p.textPrimary);

        TextView tvHeat = sheetHostView.findViewById(R.id.ov_weather_heat);
        if (tvHeat != null) {
            tvHeat.setBackground(OverlayThemePalette.roundedSurface(p.statusWarmSoftBg, 0, 0, dpToPx(999)));
            tvHeat.setTextColor(p.statusWarm);
        }

        View btnClose = sheetHostView.findViewById(R.id.ov_sheet_close);
        if (btnClose != null) {
            btnClose.setBackground(OverlayThemePalette.circleRipple(p.surfaceNestedBg, p.rippleColor));
            tintImage(R.id.ov_sheet_close, p.textSecondary);
        }

        // 4. Hero class focus block
        View classBlock = sheetHostView.findViewById(R.id.ov_class_block);
        if (classBlock != null) {
            classBlock.setBackground(
                OverlayThemePalette.rippleSurface(p.surfaceNestedBg, 0, 0, dpToPx(18), p.rippleColor)
            );
        }
        setTextColor(R.id.ov_class_title, p.textPrimary);
        setTextColor(R.id.ov_class_meta, p.textSecondary);

        // 5. Optional task row
        View taskRow = sheetHostView.findViewById(R.id.ov_task_row);
        if (taskRow != null) {
            taskRow.setBackground(
                OverlayThemePalette.rippleSurface(p.surfaceNestedBg, 0, 0, dpToPx(14), p.rippleColor)
            );
        }
        tintImage(R.id.ov_task_icon, p.statusLive);
        setTextColor(R.id.ov_task_title, p.textPrimary);
        setTextColor(R.id.ov_task_due, p.textSecondary);

        // 6. 4-shortcut quick-jump dock
        int[] navContainers = {
            R.id.ov_nav_schedule, R.id.ov_nav_jeep, R.id.ov_nav_bus, R.id.ov_nav_tasks
        };
        int[] navIcons = {
            R.id.ov_nav_schedule_icon, R.id.ov_nav_jeep_icon, R.id.ov_nav_bus_icon, R.id.ov_nav_tasks_icon
        };
        int[] navLabels = {
            R.id.ov_nav_schedule_label, R.id.ov_nav_jeep_label, R.id.ov_nav_bus_label, R.id.ov_nav_tasks_label
        };

        for (int i = 0; i < navContainers.length; i++) {
            View container = sheetHostView.findViewById(navContainers[i]);
            if (container != null) {
                container.setBackground(
                    OverlayThemePalette.rippleSurface(p.surfaceNestedBg, 0, 0, dpToPx(16), p.rippleColor)
                );
            }
            tintImage(navIcons[i], p.accent);
            setTextColor(navLabels[i], p.textPrimary);
        }
    }

    private void scheduleIdleEdgeTuck() {
        mainHandler.removeCallbacks(idleTuckRunnable);
        if (!isExpanded && !isDragging) {
            mainHandler.postDelayed(idleTuckRunnable, IDLE_TUCK_DELAY_MS);
        }
    }

    private void cancelIdleTuck() {
        mainHandler.removeCallbacks(idleTuckRunnable);
        isIdleTucked = false;
    }

    private void applyIdleEdgeTuck() {
        if (!sIsRunning || isExpanded || isDragging || bubbleMotionLayer == null) return;
        isIdleTucked = true;
        float tuckOffset = isDockedLeft ? -dpToPx(9) : dpToPx(9);
        bubbleMotionLayer.animate()
            .translationX(tuckOffset)
            .alpha(0.68f)
            .setDuration(320)
            .setInterpolator(new DecelerateInterpolator())
            .start();
    }

    private void wakeBubbleVisuals(float targetScale) {
        if (bubbleMotionLayer == null) return;
        bubbleMotionLayer.animate().cancel();
        bubbleMotionLayer.animate()
            .translationX(0f)
            .translationY(0f)
            .alpha(1f)
            .scaleX(targetScale)
            .scaleY(targetScale)
            .setDuration(110)
            .setInterpolator(new DecelerateInterpolator())
            .start();
    }

    private void moveBubbleWindow(int x, int y) {
        if (bubbleParams == null || bubbleView == null || windowManager == null) return;
        if (bubbleParams.x == x && bubbleParams.y == y) return;
        bubbleParams.x = x;
        bubbleParams.y = y;
        try {
            if (bubbleView.isAttachedToWindow()) {
                windowManager.updateViewLayout(bubbleView, bubbleParams);
            }
        } catch (Exception ignored) {}
    }

    private int getRestDockX(boolean left) {
        int edgeMargin = dpToPx(8);
        return left
            ? (edgeMargin - bubbleGutterPx)
            : (screenWidth - edgeMargin - bubbleVisualPx - bubbleGutterPx);
    }

    private int getExpandedBubbleX() {
        return screenWidth - dpToPx(16) - bubbleVisualPx - bubbleGutterPx;
    }

    private int getExpandedBubbleY() {
        return statusBarHeight + dpToPx(10) - bubbleGutterPx;
    }

    private int getMinSafeY() {
        return statusBarHeight + dpToPx(10) - bubbleGutterPx;
    }

    private int getMaxSafeY() {
        return Math.max(getMinSafeY() + dpToPx(40), screenHeight - navBarHeight - bubbleVisualPx - dpToPx(24) - bubbleGutterPx);
    }

    private int getRestYFromRatio(float ratio) {
        int minY = getMinSafeY();
        int maxY = getMaxSafeY();
        float clamped = Math.max(0f, Math.min(1f, ratio));
        return Math.round(minY + (maxY - minY) * clamped);
    }

    private float computeYRatio(int y) {
        int minY = getMinSafeY();
        int maxY = getMaxSafeY();
        if (maxY <= minY) return 0.36f;
        return Math.max(0f, Math.min(1f, (float) (y - minY) / (float) (maxY - minY)));
    }

    private void loadSavedDockPosition() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        isDockedLeft = prefs.getBoolean(PREF_DOCK_LEFT, false);
        savedYRatio = prefs.getFloat(PREF_Y_RATIO, 0.36f);
    }

    private void persistDockPosition() {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_DOCK_LEFT, isDockedLeft)
            .putFloat(PREF_Y_RATIO, savedYRatio)
            .apply();
    }

    private void refreshDisplayBounds() {
        if (windowManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                WindowMetrics metrics = windowManager.getCurrentWindowMetrics();
                Rect bounds = metrics.getBounds();
                screenWidth = bounds.width();
                screenHeight = bounds.height();

                WindowInsets insets = metrics.getWindowInsets();
                android.graphics.Insets sysBars = insets.getInsetsIgnoringVisibility(
                    WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout()
                );
                android.graphics.Insets navBars = insets.getInsetsIgnoringVisibility(
                    WindowInsets.Type.navigationBars()
                );
                statusBarHeight = Math.max(sysBars.top, dpToPx(24));
                navBarHeight = navBars.bottom;
                return;
            } catch (Exception ignored) {}
        }

        DisplayMetrics dm = new DisplayMetrics();
        windowManager.getDefaultDisplay().getRealMetrics(dm);
        screenWidth = dm.widthPixels;
        screenHeight = dm.heightPixels;
        statusBarHeight = getSystemDimen("status_bar_height", dpToPx(24));
        navBarHeight = getSystemDimen("navigation_bar_height", dpToPx(36));
    }

    private int getSystemDimen(String name, int fallbackPx) {
        int id = getResources().getIdentifier(name, "dimen", "android");
        return id > 0 ? getResources().getDimensionPixelSize(id) : fallbackPx;
    }

    private void tintImage(int viewId, int color) {
        if (sheetHostView == null) return;
        ImageView iv = sheetHostView.findViewById(viewId);
        if (iv != null) {
            iv.setColorFilter(color, PorterDuff.Mode.SRC_IN);
        }
    }

    private void setTextColor(int viewId, int color) {
        if (sheetHostView == null) return;
        TextView tv = sheetHostView.findViewById(viewId);
        if (tv != null) {
            tv.setTextColor(color);
        }
    }

    private void launchAppTab(@Nullable String targetTab) {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (targetTab != null) {
                intent.putExtra("target_tab", targetTab);
            }
            startActivity(intent);
        } catch (Exception e) {
            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (targetTab != null) launch.putExtra("target_tab", targetTab);
                startActivity(launch);
            }
        }
    }

    private void triggerCrispHaptic() {
        try {
            if (vibrator == null || !vibrator.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(18, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(18);
            }
        } catch (Exception ignored) {}
    }

    private void registerPredictiveBack() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && sheetHostView != null) {
            try {
                OnBackInvokedDispatcher dispatcher = sheetHostView.findOnBackInvokedDispatcher();
                if (dispatcher != null && backInvokedCallbackObj == null) {
                    OnBackInvokedCallback cb = this::collapseSheet;
                    backInvokedCallbackObj = cb;
                    dispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, cb);
                }
            } catch (Exception ignored) {}
        }
    }

    private void unregisterPredictiveBack() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && sheetHostView != null && backInvokedCallbackObj != null) {
            try {
                OnBackInvokedDispatcher dispatcher = sheetHostView.findOnBackInvokedDispatcher();
                if (dispatcher != null) {
                    dispatcher.unregisterOnBackInvokedCallback((OnBackInvokedCallback) backInvokedCallbackObj);
                }
            } catch (Exception ignored) {}
            backInvokedCallbackObj = null;
        }
    }

    private void stopByUserChoice() {
        explicitUserStop = true;
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_IS_ACTIVE, false)
            .apply();
        stopSelf();
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

        Notification notification = new NotificationCompat.Builder(this, OVERLAY_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_eagle_buddy)
            .setContentTitle("SkwelaDabaw Bubble Active")
            .setContentText("Tap to open app or drag bubble to dismiss")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingOpen)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Turn Off", pendingStop)
            .build();

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

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(OVERLAY_CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    OVERLAY_CHANNEL_ID,
                    "Floating Bubble",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Keeps your optional SkwelaDabaw floating bubble responsive");
                channel.setShowBadge(false);
                nm.createNotificationChannel(channel);
            }
        }
    }

    private int dpToPx(int dp) {
        return Math.round(
            TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics())
        );
    }

    private void detachAllWindows() {
        unregisterPredictiveBack();
        if (bubbleSpring != null) {
            bubbleSpring.cancel();
        }
        cancelViewAnim(bubbleMotionLayer);
        cancelViewAnim(sheetCard);
        cancelViewAnim(sheetScrim);
        cancelViewAnim(dismissPill);
        cancelViewAnim(dismissView);

        if (windowManager != null) {
            safeRemoveView(bubbleView);
            safeRemoveView(sheetHostView);
            safeRemoveView(dismissView);
        }
        bubbleView = null;
        bubbleMotionLayer = null;
        bubbleCircle = null;
        bubbleStatusDot = null;
        sheetHostView = null;
        sheetScrim = null;
        sheetCard = null;
        dismissView = null;
        dismissGradient = null;
        dismissPill = null;
        dismissIcon = null;
    }

    private void cancelViewAnim(@Nullable View view) {
        if (view != null) {
            view.animate().cancel();
        }
    }

    private void safeRemoveView(@Nullable View view) {
        if (view != null && view.isAttachedToWindow()) {
            try {
                windowManager.removeViewImmediate(view);
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        sIsRunning = false;
        isExpanded = false;
        isDragging = false;
        isCapturedByDismiss = false;

        // Only clear PREF_IS_ACTIVE when the user explicitly stopped/dismissed the bubble
        if (explicitUserStop) {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(PREF_IS_ACTIVE, false)
                .apply();
        }

        detachAllWindows();

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

    /**
     * Root container for the expanded sheet scrim that cleanly intercepts
     * Android's hardware Back button on pre-API 33 devices.
     */
    private final class SheetHostView extends FrameLayout {
        SheetHostView(Context context) {
            super(context);
            setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ));
        }

        @Override
        public boolean dispatchKeyEvent(KeyEvent event) {
            if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                if (isExpanded) {
                    collapseSheet();
                    return true;
                }
            }
            return super.dispatchKeyEvent(event);
        }
    }
}
