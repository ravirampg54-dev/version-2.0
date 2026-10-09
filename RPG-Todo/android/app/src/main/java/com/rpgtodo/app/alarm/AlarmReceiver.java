package com.rpgtodo.app.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.Calendar;
import org.json.JSONException;

/**
 * Fires one reminder occurrence.
 *
 * <p>The next occurrence is armed <em>before</em> the notification is posted, so a failure while
 * building the notification can never break the recurrence chain. This receiver is the only thing
 * that keeps a daily/weekly task alive, and it runs entirely in the OS: no WebView, no JS timers,
 * no app process required.
 */
public class AlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_FIRE = "com.rpgtodo.app.action.FIRE_ALARM";
    public static final String EXTRA_TASK_ID = "rpg_todo_task_id";
    public static final String EXTRA_OCCURRENCE_KEY = "rpg_todo_occurrence_key";
    public static final String EXTRA_NOTIFICATION_ID = "rpg_todo_notification_id";
    public static final String EXTRA_IS_SNOOZE = "rpg_todo_is_snooze";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION_FIRE.equals(intent.getAction())) {
            return;
        }

        String taskId = intent.getStringExtra(EXTRA_TASK_ID);
        String occurrenceKey = intent.getStringExtra(EXTRA_OCCURRENCE_KEY);
        int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0);
        boolean isSnooze = intent.getBooleanExtra(EXTRA_IS_SNOOZE, false);

        if (taskId == null || taskId.isEmpty() || notificationId == 0) {
            return;
        }

        AlarmRule stored = AlarmStore.getRule(context, taskId);
        if (stored == null) {
            // The task was deleted while this alarm was armed.
            AlarmIds.cancel(context, notificationId);
            return;
        }

        // Work on a copy so the notification describes the occurrence that just fired, not the one
        // we are about to arm.
        AlarmRule fired = copyOf(stored);
        if (fired == null) {
            return;
        }
        fired.occurrenceKey = occurrenceKey.isEmpty() ? stored.occurrenceKey : occurrenceKey;
        fired.notificationId = notificationId;

        if (isSnooze) {
            fired.snoozeCount = stored.snoozeCount + 1;
            AlarmScheduler.cancelSnoozes(context, stored);
        } else {
            advanceRecurrence(context, stored);
        }

        AlarmNotifications.show(context, fired, notificationId, isSnooze);
    }

    /** Arms the following occurrence for a recurring rule, or retires a finished one-time rule. */
    private void advanceRecurrence(Context context, AlarmRule rule) {
        String from = nextDayKey(rule.occurrenceKey);
        boolean armed = !from.isEmpty() && AlarmScheduler.arm(context, rule, from);
        rule.enabled = armed;
        AlarmStore.putRule(context, rule);
    }

    private static AlarmRule copyOf(AlarmRule rule) {
        try {
            return AlarmRule.fromJson(rule.toJson());
        } catch (JSONException ex) {
            return null;
        }
    }

    static String nextDayKey(String dateKey) {
        Calendar calendar = AlarmRule.parseDate(dateKey);
        if (calendar == null) {
            return "";
        }
        calendar.add(Calendar.DAY_OF_YEAR, 1);
        return AlarmRule.dateKey(calendar);
    }
}
