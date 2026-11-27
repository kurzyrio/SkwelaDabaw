package com.kurzyrio.skweladabaw.overlay;

import android.view.Choreographer;
import androidx.annotation.Nullable;

/**
 * Lightweight VSYNC-locked 2D damped harmonic spring solver driven directly by
 * Android's Choreographer. Zero allocations per frame and automatically adapts
 * to 60Hz, 90Hz, 120Hz, and 144Hz displays.
 */
public final class BubbleSpringEngine {

    public interface FrameListener {
        void onFrame(float x, float y, float vx, float vy);
    }

    private final Choreographer choreographer;
    private boolean running = false;
    private long lastFrameNanos = 0L;

    private float x;
    private float y;
    private float vx;
    private float vy;
    private float targetX;
    private float targetY;

    private float stiffness = 340f;
    private float dampingRatio = 0.74f;

    @Nullable
    private FrameListener frameListener;
    @Nullable
    private Runnable endListener;

    private final Choreographer.FrameCallback frameCallback = new Choreographer.FrameCallback() {
        @Override
        public void doFrame(long frameTimeNanos) {
            if (!running) return;

            float dt;
            if (lastFrameNanos == 0L) {
                dt = 0.016f;
            } else {
                dt = (frameTimeNanos - lastFrameNanos) * 1e-9f;
                if (dt <= 0f) dt = 0.008f;
                if (dt > 0.032f) dt = 0.032f;
            }
            lastFrameNanos = frameTimeNanos;

            // Substep when frame delta exceeds 16ms for crisp stability across refresh rates
            int substeps = dt > 0.016f ? 2 : 1;
            float step = dt / substeps;
            float damping = 2f * dampingRatio * (float) Math.sqrt(stiffness);

            for (int i = 0; i < substeps; i++) {
                float ax = stiffness * (targetX - x) - damping * vx;
                float ay = stiffness * (targetY - y) - damping * vy;
                vx += ax * step;
                vy += ay * step;
                x += vx * step;
                y += vy * step;
            }

            boolean settled =
                Math.abs(targetX - x) < 0.55f &&
                Math.abs(targetY - y) < 0.55f &&
                Math.abs(vx) < 7.5f &&
                Math.abs(vy) < 7.5f;

            if (settled) {
                x = targetX;
                y = targetY;
                vx = 0f;
                vy = 0f;
                running = false;
                if (frameListener != null) {
                    frameListener.onFrame(x, y, 0f, 0f);
                }
                Runnable onEnd = endListener;
                endListener = null;
                if (onEnd != null) {
                    onEnd.run();
                }
                return;
            }

            if (frameListener != null) {
                frameListener.onFrame(x, y, vx, vy);
            }
            if (running) {
                choreographer.postFrameCallback(this);
            }
        }
    };

    public BubbleSpringEngine() {
        this.choreographer = Choreographer.getInstance();
    }

    public void start(
        float fromX,
        float fromY,
        float toX,
        float toY,
        float velocityX,
        float velocityY,
        float stiffness,
        float dampingRatio,
        @Nullable FrameListener onFrame,
        @Nullable Runnable onEnd
    ) {
        cancel();
        this.x = fromX;
        this.y = fromY;
        this.targetX = toX;
        this.targetY = toY;
        this.vx = velocityX;
        this.vy = velocityY;
        this.stiffness = stiffness;
        this.dampingRatio = dampingRatio;
        this.frameListener = onFrame;
        this.endListener = onEnd;
        this.lastFrameNanos = 0L;
        this.running = true;
        choreographer.postFrameCallback(frameCallback);
    }

    public void updateTarget(float toX, float toY) {
        this.targetX = toX;
        this.targetY = toY;
    }

    public float getX() {
        return x;
    }

    public float getY() {
        return y;
    }

    public boolean isRunning() {
        return running;
    }

    public void cancel() {
        if (running) {
            running = false;
            choreographer.removeFrameCallback(frameCallback);
        }
        endListener = null;
        lastFrameNanos = 0L;
    }
}
