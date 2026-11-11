package com.kurzyrio.skweladabaw;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 5-Minute Native Android Background Weather Monitoring Receiver
 * Runs reliably every 5 minutes in background to fetch real-time Davao weather
 * and dispatches system notifications for extreme heat or commute rain advisories.
 */
public class WeatherBackgroundReceiver extends BroadcastReceiver {
    private static final String TAG = "WeatherBackgroundRcvr";

    public static final String ACTION_WEATHER_CHECK = "com.kurzyrio.skweladabaw.ACTION_WEATHER_CHECK";
    public static final String CHANNEL_ID = "skweladabaw_weather";
    public static final int NOTIF_HEAT_ID = 95001;
    public static final int NOTIF_RAIN_ID = 95002;
    public static final long INTERVAL_MS = 5 * 60 * 1000L; // 5 minutes
    private static final String WEATHER_URL = "https://skweladabaw.kurzyrio.site/api/weather.php";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "WeatherBackgroundReceiver woke up with action: " + action);

        final PendingResult pendingResult = goAsync();

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        final PowerManager.WakeLock wakeLock = (pm != null)
            ? pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "skweladabaw:weather_bg_wakelock")
            : null;

        if (wakeLock != null) {
            try {
                wakeLock.acquire(45000L); // 45s safety timeout
            } catch (Exception ignored) {}
        }

        // Run fetch and threshold evaluation on background thread
        executor.execute(() -> {
            try {
                Context appContext = context.getApplicationContext();
                fetchAndEvaluateWeather(appContext);

                // Also trigger background widget & ongoing timetable notification synchronization
                try {
                    WidgetScheduleHelper.evaluateAndUpdateAllWidgets(appContext);
                    SharedPreferences ongoingPrefs = appContext.getSharedPreferences("skweladabaw_ongoing_service_prefs", Context.MODE_PRIVATE);
                    if (ongoingPrefs.getBoolean("pref_is_active", false)) {
                        Intent serviceIntent = new Intent(appContext, SkwelaOngoingService.class);
                        serviceIntent.setAction(SkwelaOngoingService.ACTION_UPDATE);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            appContext.startForegroundService(serviceIntent);
                        } else {
                            appContext.startService(serviceIntent);
                        }
                    }
                } catch (Exception ignored) {}
            } catch (Exception e) {
                Log.w(TAG, "Error evaluating background weather", e);
            } finally {
                // Guarantee next alarm in exactly 5 minutes
                scheduleNextWeatherAlarm(context.getApplicationContext(), System.currentTimeMillis() + INTERVAL_MS);
                if (wakeLock != null && wakeLock.isHeld()) {
                    try {
                        wakeLock.release();
                    } catch (Exception ignored) {}
                }
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        });
    }

    /**
     * Schedules the next weather monitoring alarm with battery-aware Android idle support
     */
    public static void scheduleNextWeatherAlarm(Context context, long triggerAtMillis) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, WeatherBackgroundReceiver.class);
            intent.setAction(ACTION_WEATHER_CHECK);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, 7788, intent, flags);

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
            Log.d(TAG, "Next background weather alarm set for: " + new Date(triggerAtMillis));
        } catch (Exception e) {
            Log.w(TAG, "Failed to schedule weather alarm", e);
        }
    }

    private void fetchAndEvaluateWeather(Context context) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(WEATHER_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("User-Agent", "SkwelaDabaw-Android-Service");
            conn.setRequestProperty("Accept", "application/json");

            int responseCode = conn.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "Weather API returned HTTP code: " + responseCode);
                return;
            }

            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) {
                response.append(line);
            }
            in.close();

            String jsonStr = response.toString();
            JSONObject json = new JSONObject(jsonStr);

            JSONObject current = json.optJSONObject("current");
            if (current == null) return;

            double temperature = current.has("temp") ? current.optDouble("temp") : current.optDouble("temperature", 30.0);
            double heatIndex = current.has("heatIndex") ? current.optDouble("heatIndex") : current.optDouble("apparentTemperature", temperature);
            double precipitation = current.optDouble("precipitation", 0.0);
            String condition = current.optString("condition", "Partly Cloudy");

            JSONObject advisory = json.optJSONObject("advisory");
            double peakHeat = heatIndex;
            boolean isRainImminent = false;
            int rainProbability = 0;

            if (advisory != null) {
                if (advisory.has("todayHeatMax")) {
                    peakHeat = Math.max(heatIndex, advisory.optDouble("todayHeatMax"));
                }
                isRainImminent = advisory.optBoolean("isRainImminent", false);
                rainProbability = advisory.optInt("maxUpcomingRainProb", 0);
            }

            // Cache data in SharedPreferences for widgets and Eagle Overlay
            SharedPreferences cachePrefs = context.getSharedPreferences("skweladabaw_weather_cache", Context.MODE_PRIVATE);
            cachePrefs.edit()
                .putString("cached_weather_json", jsonStr)
                .putLong("cached_weather_time", System.currentTimeMillis())
                .putFloat("last_temp", (float) temperature)
                .putFloat("last_heat_index", (float) heatIndex)
                .putString("last_condition", condition)
                .apply();

            // Check if user has weather alerts enabled in Settings
            SharedPreferences widgetPrefs = context.getSharedPreferences("SkwelaWidgetPrefs", Context.MODE_PRIVATE);
            String alertsEnabledStr = widgetPrefs.getString("skweladabaw_weather_alerts_enabled", "true");
            boolean alertsEnabled = !"false".equalsIgnoreCase(alertsEnabledStr);
            if (!alertsEnabled) {
                Log.d(TAG, "Weather alerts disabled by user preference, skipping notification evaluation");
                return;
            }

            // Evaluate Notification Thresholds
            SharedPreferences notifPrefs = context.getSharedPreferences("skwela_weather_alerts_prefs", Context.MODE_PRIVATE);
            Calendar cal = Calendar.getInstance();
            int currentHour = cal.get(Calendar.HOUR_OF_DAY);
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

            ensureNotificationChannel(context);

            // 1. Extreme Heat Alert Evaluation (>= 40.0°C between 9:00 AM and 3:30 PM)
            long lastHeatAlertTime = notifPrefs.getLong("last_heat_alert_ts", 0L);
            String lastHeatDate = notifPrefs.getString("last_heat_alert_date", "");
            boolean heatCooldownExpired = !todayStr.equals(lastHeatDate) || (System.currentTimeMillis() - lastHeatAlertTime > 4 * 3600 * 1000L);

            if (peakHeat >= 40.0 && heatCooldownExpired && currentHour >= 9 && currentHour <= 15) {
                notifPrefs.edit()
                    .putLong("last_heat_alert_ts", System.currentTimeMillis())
                    .putString("last_heat_alert_date", todayStr)
                    .apply();

                int roundedHeat = (int) Math.round(peakHeat);
                sendWeatherNotification(
                    context,
                    NOTIF_HEAT_ID,
                    "☀️ Davao Heat Alert: " + roundedHeat + "°C Heat Index",
                    "Extreme heat advisory in Davao City. Stay hydrated, seek shade, and take extra precaution during campus commutes."
                );
            }

            // 2. Commute Rain Advisory Evaluation (Rain imminent, or rain probability >= 65%, or precip >= 1.0mm)
            // Evaluated during commute/afternoon hours (12:00 PM to 6:30 PM) or when rain is immediately imminent
            long lastRainAlertTime = notifPrefs.getLong("last_rain_alert_ts", 0L);
            String lastRainDate = notifPrefs.getString("last_rain_alert_date", "");
            boolean rainCooldownExpired = !todayStr.equals(lastRainDate) || (System.currentTimeMillis() - lastRainAlertTime > 3 * 3600 * 1000L);

            if ((precipitation >= 1.0 || rainProbability >= 65 || isRainImminent) && rainCooldownExpired && (isRainImminent || (currentHour >= 12 && currentHour <= 18))) {
                notifPrefs.edit()
                    .putLong("last_rain_alert_ts", System.currentTimeMillis())
                    .putString("last_rain_alert_date", todayStr)
                    .apply();

                sendWeatherNotification(
                    context,
                    NOTIF_RAIN_ID,
                    "🌧️ Commute Rain Advisory: Thunderstorms Expected",
                    "Rain detected along Davao commuter routes. Pack an umbrella and expect jeepney congestion along Bajada & Roxas."
                );
            }

        } catch (Exception e) {
            Log.w(TAG, "Failed to fetch and evaluate background weather", e);
        } finally {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Exception ignored) {}
            }
        }
    }

    private void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Davao Weather & Commuter Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Real-time Davao heat index and commute rainfall advisories");
                    channel.enableVibration(true);
                    channel.setShowBadge(true);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    private void sendWeatherNotification(Context context, int notificationId, String title, String body) {
        try {
            Intent intent = new Intent(context, MainActivity.class);
            intent.putExtra("target_tab", "weather");
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getActivity(context, notificationId, intent, flags);

            int iconRes = context.getResources().getIdentifier("ic_stat_icon_config_sample", "drawable", context.getPackageName());
            if (iconRes == 0) {
                iconRes = R.mipmap.ic_launcher;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(iconRes)
                .setColor(0xFF2563EB)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);

            NotificationManagerCompat.from(context).notify(notificationId, builder.build());
            Log.d(TAG, "Dispatched weather notification ID " + notificationId + ": " + title);
        } catch (SecurityException se) {
            Log.w(TAG, "Notification permission not granted", se);
        } catch (Exception e) {
            Log.w(TAG, "Failed to send weather notification", e);
        }
    }
}
