package com.rpgtodo.app.alarm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

/**
 * Notification channel setup.
 *
 * <p>Android requires channels to be user-visible settings, so reminders and alarms get separate
 * channels: a normal reminder channel that respects the user's notification volume, and an alarm
 * channel that routes through {@code USAGE_ALARM} so it is audible at alarm volume and can bypass
 * Do Not Disturb (subject to the user's DND settings).
 */
public final class AlarmChannels {

    public static final String CHANNEL_REMINDER = "rpg_todo_reminders";
    public static final String CHANNEL_REMINDER_SILENT = "rpg_todo_reminders_silent";
    public static final String CHANNEL_ALARM = "rpg_todo_alarms";
    public static final String CHANNEL_ALARM_SILENT = "rpg_todo_alarms_silent";

    private AlarmChannels() {}

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        Uri alarmSound = defaultUri(Settings.System.DEFAULT_ALARM_ALERT_URI, Settings.System.DEFAULT_NOTIFICATION_URI);
        Uri notificationSound = defaultUri(Settings.System.DEFAULT_NOTIFICATION_URI, Settings.System.DEFAULT_ALARM_ALERT_URI);

        NotificationChannel reminders = new NotificationChannel(
            CHANNEL_REMINDER,
            context.getString(R.string.channel_reminders_name),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        reminders.setDescription(context.getString(R.string.channel_reminders_description));
        reminders.setSound(notificationSound, audioAttributes(android.media.AudioAttributes.USAGE_NOTIFICATION));
        reminders.enableVibration(false);
        reminders.setShowBadge(true);
        manager.createNotificationChannel(reminders);

        NotificationChannel remindersSilent = new NotificationChannel(
            CHANNEL_REMINDER_SILENT,
            context.getString(R.string.channel_reminders_silent_name),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        remindersSilent.setDescription(context.getString(R.string.channel_reminders_silent_description));
        remindersSilent.setSound(null, null);
        remindersSilent.enableVibration(false);
        manager.createNotificationChannel(remindersSilent);

        NotificationChannel alarms = new NotificationChannel(
            CHANNEL_ALARM,
            context.getString(R.string.channel_alarms_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        alarms.setDescription(context.getString(R.string.channel_alarms_description));
        alarms.setSound(alarmSound, audioAttributes(AudioAttributes.USAGE_ALARM));
        alarms.enableVibration(true);
        alarms.setVibrationPattern(new long[] { 0L, 500L, 250L, 500L, 250L, 500L });
        alarms.setBypassDnd(true);
        alarms.setShowBadge(true);
        alarms.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(alarms);

        NotificationChannel alarmsSilent = new NotificationChannel(
            CHANNEL_ALARM_SILENT,
            context.getString(R.string.channel_alarms_silent_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        alarmsSilent.setDescription(context.getString(R.string.channel_alarms_silent_description));
        alarmsSilent.setSound(null, null);
        alarmsSilent.enableVibration(false);
        alarmsSilent.setBypassDnd(true);
        manager.createNotificationChannel(alarmsSilent);
    }

    public static String channelFor(AlarmRule rule) {
        boolean silent = AlarmRule.SOUND_SILENT.equals(rule.alarmSound);
        if (rule.isAlarm()) {
            return silent ? CHANNEL_ALARM_SILENT : CHANNEL_ALARM;
        }
        return silent ? CHANNEL_REMINDER_SILENT : CHANNEL_REMINDER;
    }

    private static Uri defaultUri(Uri preferred, Uri fallback) {
        return preferred != null ? preferred : fallback;
    }

    private static AudioAttributes audioAttributes(int usage) {
        return new AudioAttributes.Builder()
            .setUsage(usage)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
    }
}
