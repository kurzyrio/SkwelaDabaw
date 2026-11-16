package com.kurzyrio.skweladabaw;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Periodic WorkManager task for Davao weather threshold evaluation and widget refresh.
 * Enforces network connectivity constraints without wake-lock loops or background FGS starts.
 */
public class WeatherSyncWorker extends Worker {
    private static final String TAG = "WeatherSyncWorker";

    public WeatherSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context appContext = getApplicationContext();
        try {
            if (!WeatherBackgroundReceiver.areWeatherAlertsEnabled(appContext)) {
                WeatherBackgroundReceiver.cancelWeatherWork(appContext);
                return Result.success();
            }

            boolean ok = WeatherBackgroundReceiver.evaluateWeatherAndNotify(appContext);

            try {
                WidgetScheduleHelper.evaluateAndUpdateAllWidgets(appContext);
                SkwelaOngoingService.refreshNotificationFromBackground(appContext);
            } catch (Exception ignored) {}

            return ok ? Result.success() : Result.retry();
        } catch (Exception e) {
            Log.w(TAG, "Error executing periodic weather work", e);
            return Result.retry();
        }
    }
}
