package com.kurzyrio.skweladabaw.overlay;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import com.kurzyrio.skweladabaw.EagleOverlayService;
import com.kurzyrio.skweladabaw.WidgetScheduleHelper;
import org.json.JSONObject;

/**
 * Self-contained color tokens and surface builders for the native floating overlay.
 * Matches all six SkwelaDabaw themes without reusing legacy home-screen widget drawables.
 */
public final class OverlayThemePalette {

    public final boolean isDark;
    public final int surfaceBg;
    public final int surfaceNestedBg;
    public final int surfaceStroke;
    public final int bubbleBg;
    public final int bubbleRim;
    public final int textPrimary;
    public final int textSecondary;
    public final int accent;
    public final int accentSoftBg;
    public final int statusLive;
    public final int statusLiveSoftBg;
    public final int statusWarm;
    public final int statusWarmSoftBg;
    public final int rippleColor;
    public final int scrimColor;

    private OverlayThemePalette(
        boolean isDark,
        int surfaceBg,
        int surfaceNestedBg,
        int surfaceStroke,
        int bubbleBg,
        int bubbleRim,
        int textPrimary,
        int textSecondary,
        int accent,
        int rippleColor
    ) {
        this.isDark = isDark;
        this.surfaceBg = surfaceBg;
        this.surfaceNestedBg = surfaceNestedBg;
        this.surfaceStroke = surfaceStroke;
        this.bubbleBg = bubbleBg;
        this.bubbleRim = bubbleRim;
        this.textPrimary = textPrimary;
        this.textSecondary = textSecondary;
        this.accent = accent;
        this.accentSoftBg = withAlpha(accent, isDark ? 0x26 : 0x1A);
        this.statusLive = 0xFF30D158;
        this.statusLiveSoftBg = isDark ? 0x2630D158 : 0x1A30D158;
        this.statusWarm = isDark ? 0xFFFBBF24 : 0xFFD97706;
        this.statusWarmSoftBg = isDark ? 0x24F59E0B : 0x1AF59E0B;
        this.rippleColor = rippleColor;
        this.scrimColor = isDark ? 0x66000000 : 0x45000000;
    }

    private static int parseColorSafe(String hex, int fallback) {
        if (hex == null) return fallback;
        String trimmed = hex.trim();
        if (trimmed.isEmpty() || !trimmed.startsWith("#")) return fallback;
        try {
            return Color.parseColor(trimmed);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    public static OverlayThemePalette resolve(Context context) {
        String themeId = null;
        String colorsJson = null;
        if (context != null) {
            SharedPreferences overlayPrefs = context.getSharedPreferences(
                EagleOverlayService.PREFS_NAME,
                Context.MODE_PRIVATE
            );
            themeId = overlayPrefs.getString("theme_id", null);
            colorsJson = overlayPrefs.getString("theme_colors_json", null);
            if (themeId == null || themeId.trim().isEmpty()) {
                themeId = WidgetScheduleHelper.getActiveThemeId(context);
            }
            if (colorsJson == null || colorsJson.trim().isEmpty()) {
                SharedPreferences widgetPrefs = context.getSharedPreferences("SkwelaWidgetPrefs", Context.MODE_PRIVATE);
                colorsJson = widgetPrefs.getString("theme_colors_json", null);
            }
        }
        String id = themeId != null ? themeId.trim().toLowerCase() : "light";

        switch (id) {
            case "oled":
                return new OverlayThemePalette(
                    true,
                    0xFF0A0A0A,
                    0xFF161616,
                    0xFF262626,
                    0xFF0E0E10,
                    0x44FFFFFF,
                    0xFFFFFFFF,
                    0xFFA1A1AA,
                    0xFFFFFFFF,
                    0x28FFFFFF
                );

            case "dark":
            case "bw-dark":
                return new OverlayThemePalette(
                    true,
                    0xFF1A1A1C,
                    0xFF262629,
                    0xFF333338,
                    0xFF1C1C1E,
                    0x38FFFFFF,
                    0xFFFFFFFF,
                    0xFF98989F,
                    0xFF30D158,
                    0x28FFFFFF
                );

            case "emerald":
                return new OverlayThemePalette(
                    true,
                    0xFF0A2215,
                    0xFF133522,
                    0xFF1D5235,
                    0xFF0B2919,
                    0x4D10B981,
                    0xFFECFDF5,
                    0xFFA7F3D0,
                    0xFF10B981,
                    0x2A10B981
                );

            case "cyber":
                return new OverlayThemePalette(
                    true,
                    0xFF0D111A,
                    0xFF161E2E,
                    0xFF24324D,
                    0xFF101726,
                    0x5500E5FF,
                    0xFFFFFFFF,
                    0xFF80DEEA,
                    0xFF00E5FF,
                    0x2A00E5FF
                );

            case "violet":
                return new OverlayThemePalette(
                    false,
                    0xFFFFFFFF,
                    0xFFF3F0FF,
                    0xFFE5DEFF,
                    0xFFFFFFFF,
                    0x387C3AED,
                    0xFF1E1B4B,
                    0xFF6D28D9,
                    0xFF7C3AED,
                    0x227C3AED
                );

            case "light":
            case "bw-light":
                return new OverlayThemePalette(
                    false,
                    0xFFFFFFFF,
                    0xFFF2F2F7,
                    0xFFE5E5EA,
                    0xFFFFFFFF,
                    0x24000000,
                    0xFF111114,
                    0xFF6C6C70,
                    0xFF007AFF,
                    0x1A000000
                );

            default:
                if (colorsJson != null && !colorsJson.trim().isEmpty()) {
                    try {
                        JSONObject obj = new JSONObject(colorsJson);
                        boolean isDark = obj.optBoolean("isDark", true);
                        int surfaceBg = parseColorSafe(obj.optString("cardBg", null), isDark ? 0xFF1A1A1C : 0xFFFFFFFF);
                        int surfaceNestedBg = parseColorSafe(obj.optString("itemBg", null), isDark ? 0xFF262629 : 0xFFF2F2F7);
                        int surfaceStroke = parseColorSafe(obj.optString("stroke", null), isDark ? 0xFF333338 : 0xFFE5E5EA);
                        int bubbleBg = parseColorSafe(obj.optString("bubbleBg", null), surfaceBg);
                        int accent = parseColorSafe(obj.optString("accent", null), isDark ? 0xFF38BDF8 : 0xFF007AFF);
                        int bubbleRimRaw = parseColorSafe(obj.optString("bubbleRim", null), accent);
                        int bubbleRim = withAlpha(bubbleRimRaw, isDark ? 0x55 : 0x38);
                        int textPrimary = parseColorSafe(obj.optString("textPrimary", null), isDark ? 0xFFFFFFFF : 0xFF111114);
                        int textSecondary = parseColorSafe(obj.optString("textSecondary", null), isDark ? 0xFF98989F : 0xFF6C6C70);
                        int rippleColor = withAlpha(accent, isDark ? 0x2A : 0x20);
                        return new OverlayThemePalette(
                            isDark,
                            surfaceBg,
                            surfaceNestedBg,
                            surfaceStroke,
                            bubbleBg,
                            bubbleRim,
                            textPrimary,
                            textSecondary,
                            accent,
                            rippleColor
                        );
                    } catch (Exception ignored) {}
                }
                return new OverlayThemePalette(
                    false,
                    0xFFFFFFFF,
                    0xFFF2F2F7,
                    0xFFE5E5EA,
                    0xFFFFFFFF,
                    0x24000000,
                    0xFF111114,
                    0xFF6C6C70,
                    0xFF007AFF,
                    0x1A000000
                );
        }
    }

    public static int withAlpha(int color, int alpha) {
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    public static GradientDrawable roundedSurface(int bgColor, int strokeColor, int strokePx, float radiusPx) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.RECTANGLE);
        d.setColor(bgColor);
        d.setCornerRadius(radiusPx);
        if (strokePx > 0 && strokeColor != 0) {
            d.setStroke(strokePx, strokeColor);
        }
        return d;
    }

    public static Drawable rippleSurface(int bgColor, int strokeColor, int strokePx, float radiusPx, int rippleColor) {
        GradientDrawable content = roundedSurface(bgColor, strokeColor, strokePx, radiusPx);
        GradientDrawable mask = roundedSurface(0xFFFFFFFF, 0, 0, radiusPx);
        return new RippleDrawable(ColorStateList.valueOf(rippleColor), content, mask);
    }

    public static Drawable circleRipple(int bgColor, int rippleColor) {
        GradientDrawable content = circleSurface(bgColor, 0, 0);
        GradientDrawable mask = circleSurface(0xFFFFFFFF, 0, 0);
        return new RippleDrawable(ColorStateList.valueOf(rippleColor), content, mask);
    }

    public static GradientDrawable circleSurface(int bgColor, int strokeColor, int strokePx) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(bgColor);
        if (strokePx > 0 && strokeColor != 0) {
            d.setStroke(strokePx, strokeColor);
        }
        return d;
    }

    public static GradientDrawable bottomScrimGradient() {
        return new GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            new int[] { 0x00000000, 0x33000000, 0x73000000 }
        );
    }
}
