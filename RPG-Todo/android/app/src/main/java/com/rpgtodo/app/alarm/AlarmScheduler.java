package com.rpgtodo.app.alarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;
import java.util.Map;

/**
 * AlarmManager wrapper.
 *
 * <p>Two scheduling strategies are used:
 *
 * <ul>
 *   <li><b>Alarm-style reminders</b> use {@link AlarmManager#setAlarmClock}, which the system
 *       treats as a real alarm: exact, exempt from Doze deferral, shown with the alarm icon in the
 *       status bar, and routed at alarm volume. It requires no runtime permission.
 *   <li><b>Normal reminders</b> use {@code setExactAndAllowWhileIdle} when the user has granted the
 *       exact-alarm capability, and degrade to {@code setAndAllowWhileIdle} (inexact but still
 *       Doze-aware) when they have not.
 * </ul>
 *
 * <p>Exactly one alarm is armed per task. When it fires, {@link AlarmReceiver} posts the
 * notification and immediately arms the following occurrence, so the schedule keeps advancing
 * without the app ever being opened.
 */
public final class AlarmScheduler {

    /** Missed occurrences within this window still fire (late) after a reboot or long sleep. */
    public static final long GRACE_MILLIS = 12L * 60L * 60L * 1000L;

    private static final int REQUEST_OFFSET = 1000;

    private AlarmScheduler() {}

    public static AlarmManager alarmManager(Context context) {
        return (AlarmManager) context.getApplicationContext().getSystemService(Context.ALARM_SERVICE);
    }

    /** True when the OS will let this app schedule exact (non-deferred) alarms. */
    public static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        AlarmManager manager = alarmManager(context);
        return manager != null && manager.canScheduleExactAlarms();
    }

    /**
     * Arms the next occurrence of {@code rule} at or after {@code fromDateKey}.
     *
     * @return true when an alarm was armed; false when the rule has no future occurrence.
     */
    public static synchronized boolean arm(Context context, AlarmRule rule, String fromDateKey) {
        AlarmManager manager = alarmManager(context);
        if (manager == null) {
            return false;
        }

        long now = System.currentTimeMillis();
        String occurrenceKey = rule.nextOccurrenceDate(fromDateKey, now);
        if (occurrenceKey.isEmpty()) {
            return false;
        }

        long fireAt = rule.fireInstantFor(occurrenceKey);
        if (fireAt <= now) {
            // Occurrence time already passed while the device was off or the app was not running.
            if (now - fireAt > GRACE_MILLIS) {
                return false;
            }
            fireAt = now + 2000L;
        }

        rule.occurrenceKey = occurrenceKey;
        rule.fireAt = fireAt;
        rule.notificationId = AlarmIds.occurrence(rule.taskId, occurrenceKey);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_FIRE);
        intent.setData(android.net.Uri.parse("rpg-todo://alarm/" + rule.taskId));
        intent.putExtra(AlarmReceiver.EXTRA_TASK_ID, rule.taskId);
        intent.putExtra(AlarmReceiver.EXTRA_OCCURRENCE_KEY, occurrenceKey);
        intent.putExtra(AlarmReceiver.EXTRA_NOTIFICATION_ID, rule.notificationId);
        intent.putExtra(AlarmReceiver.EXTRA_IS_SNOOZE, false);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode(rule.taskId, occurrenceKey),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (rule.isAlarm()) {
            manager.setAlarmClock(
                new AlarmManager.AlarmClockInfo(fireAt, AlarmNotifications.openTaskPendingIntent(context, rule.taskId))
            , pendingIntent);
        } else if (canScheduleExact(context)) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pendingIntent);
        } else {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pendingIntent);
        }
        return true;
    }

    /** Arms a one-off snooze for an already-fired occurrence without touching the recurrence. */
    public static synchronized void armSnooze(Context context, AlarmRule rule, int minutes) {
        AlarmManager manager = alarmManager(context);
        if (manager == null) {
            return;
        }
        long fireAt = System.currentTimeMillis() + (long) minutes * 60L * 1000L;
        int notificationId = AlarmIds.snooze(rule.taskId, rule.occurrenceKey, minutes);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_FIRE);
        intent.setData(android.net.Uri.parse("rpg-todo://snooze/" + rule.taskId + "/" + minutes));
        intent.putExtra(AlarmReceiver.EXTRA_TASK_ID, rule.taskId);
        intent.putExtra(AlarmReceiver.EXTRA_OCCURRENCE_KEY, rule.occurrenceKey);
        intent.putExtra(AlarmReceiver.EXTRA_NOTIFICATION_ID, notificationId);
        intent.putExtra(AlarmReceiver.EXTRA_IS_SNOOZE, true);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode(rule.taskId, rule.occurrenceKey + ":snooze:" + minutes),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pendingIntent);
    }

    public static synchronized void cancel(Context context, AlarmRule rule) {
        AlarmManager manager = alarmManager(context);
        if (manager == null) {
            return;
        }

        PendingIntent occurrence = PendingIntent.getBroadcast(
            context,
            requestCode(rule.taskId, rule.occurrenceKey),
            new Intent(context, AlarmReceiver.class)
                .setAction(AlarmReceiver.ACTION_FIRE)
                .setData(android.net.Uri.parse("rpg-todo://alarm/" + rule.taskId)),
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (occurrence != null) {
            manager.cancel(occurrence);
            occurrence.cancel();
        }

        // A snoozed copy of this occurrence may still be armed.
        cancelSnoozes(context, rule);

        if (rule.notificationId != 0) {
            AlarmIds.cancel(context, rule.notificationId);
        }
        AlarmIds.cancel(context, AlarmIds.snooze(rule.taskId, rule.occurrenceKey, rule.snoozeMinutes));
    }

    /** Cancels every armed snooze copy of the current occurrence so only the latest one rings. */
    public static synchronized void cancelSnoozes(Context context, AlarmRule rule) {
        if (rule == null || rule.occurrenceKey.isEmpty()) {
            return;
        }
        AlarmManager manager = alarmManager(context);
        if (manager == null) {
            return;
        }
        for (int minutes : new int[] { 5, 10, 15 }) {
            PendingIntent snoozed = PendingIntent.getBroadcast(
                context,
                requestCode(rule.taskId, rule.occurrenceKey + ":snooze:" + minutes),
                new Intent(context, AlarmReceiver.class)
                    .setAction(AlarmReceiver.ACTION_FIRE)
                    .setData(android.net.Uri.parse("rpg-todo://snooze/" + rule.taskId + "/" + minutes)),
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (snoozed != null) {
                manager.cancel(snoozed);
                snoozed.cancel();
            }
        }
    }

    /** Cancels the armed alarm and any posted notification for a task, then drops the rule. */
    public static synchronized void cancelTask(Context context, String taskId) {
        AlarmRule rule = AlarmStore.getRule(context, taskId);
        if (rule != null) {
            cancel(context, rule);
            AlarmStore.removeRule(context, taskId);
            return;
        }
        // Rule already gone (e.g. cleared): still cancel notifications for known ids.
        AlarmIds.cancel(context, AlarmIds.occurrence(taskId, AlarmRule.todayKey()));
    }

    public static synchronized void cancelAll(Context context) {
        for (Map.Entry<String, AlarmRule> entry : AlarmStore.loadRules(context).entrySet()) {
            cancel(context, entry.getValue());
        }
        AlarmStore.clearRules(context);
    }

    /**
     * Rebuilds every armed alarm. Used after boot, app update, and time-zone / clock changes, where
     * AlarmManager entries are dropped or anchored to the wrong UTC offset.
     */
    public static synchronized int rescheduleAll(Context context) {
        int armed = 0;
        Map<String, AlarmRule> rules = AlarmStore.loadRules(context);
        for (AlarmRule rule : rules.values()) {
            if (!rule.enabled) {
                AlarmScheduler.cancel(context, rule);
                continue;
            }
            // Recompute from the armed occurrence so a pending reminder survives with the same
            // date, while a missed one rolls forward to the next matching day.
            String from = rule.occurrenceKey.isEmpty() ? rule.startDate : rule.occurrenceKey;
            boolean ok = arm(context, rule, from);
            if (ok) {
                armed++;
            } else {
                AlarmStore.removeRule(context, rule.taskId);
            }
        }
        return armed;
    }

    private static int requestCode(String taskId, String occurrenceKey) {
        return REQUEST_OFFSET + (AlarmIds.occurrence(taskId, occurrenceKey) % 100000);
    }

    /** Local "HH:mm" label for a rule's reminder wall-clock time. */
    public static String formatTime(AlarmRule rule) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, rule.hour);
        calendar.set(Calendar.MINUTE, rule.minute);
        int hour = calendar.get(Calendar.HOUR);
        int minute = calendar.get(Calendar.MINUTE);
        int displayHour = hour % 12;
        if (displayHour == 0) {
            displayHour = 12;
        }
        String meridiem = hour < 12 ? "AM" : "PM";
        return String.format(java.util.Locale.US, "%d:%02d %s", displayHour, minute, meridiem);
    }
}
