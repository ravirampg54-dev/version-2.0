package com.rpgtodo.app.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.rpgtodo.app.MainActivity;

/**
 * Handles notification action buttons and taps.
 *
 * <p>Actions are written to a persistent queue instead of being pushed straight to the WebView:
 * the app is usually not running when a notification button is tapped. The web layer drains the
 * queue on start and on every resume.
 *
 * <p>Note what is deliberately <em>not</em> here: none of these actions delete a task. Completing
 * one occurrence of a recurring task, or dismissing its notification, must leave the recurrence
 * intact.
 */
public class AlarmActionReceiver extends BroadcastReceiver {

    public static final String ACTION_OPEN = "com.rpgtodo.app.action.OPEN_TASK";
    public static final String ACTION_COMPLETE = "com.rpgtodo.app.action.COMPLETE_TASK";
    public static final String ACTION_SNOOZE = "com.rpgtodo.app.action.SNOOZE_TASK";
    public static final String ACTION_TURN_OFF = "com.rpgtodo.app.action.TURN_OFF_REMINDERS";

    public static final String EXTRA_TASK_ID = "rpg_todo_task_id";
    public static final String EXTRA_OCCURRENCE_KEY = "rpg_todo_occurrence_key";
    public static final String EXTRA_SNOOZE_MINUTES = "rpg_todo_snooze_minutes";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        String taskId = intent.getStringExtra(EXTRA_TASK_ID);
        if (taskId == null || taskId.isEmpty()) {
            return;
        }
        String occurrenceKey = intent.getStringExtra(EXTRA_OCCURRENCE_KEY);
        if (occurrenceKey == null || occurrenceKey.isEmpty()) {
            occurrenceKey = AlarmRule.todayKey();
        }

        AlarmRule rule = AlarmStore.getRule(context, taskId);
        int notificationId = rule != null ? rule.notificationId : AlarmIds.occurrence(taskId, occurrenceKey);

        if (ACTION_OPEN.equals(action)) {
            AlarmStore.enqueueAction(context, "openTask", taskId, occurrenceKey);
            AlarmIds.cancel(context, notificationId);
            launchApp(context, taskId);
            return;
        }

        if (ACTION_COMPLETE.equals(action)) {
            AlarmStore.enqueueAction(context, "complete", taskId, occurrenceKey);
            AlarmIds.cancel(context, notificationId);
            return;
        }

        if (ACTION_SNOOZE.equals(action)) {
            int minutes = AlarmRule.normalizeSnooze(intent.getIntExtra(EXTRA_SNOOZE_MINUTES, 10));
            AlarmIds.cancel(context, notificationId);
            AlarmScheduler.cancelSnoozes(context, rule);
            if (rule != null) {
                rule.snoozeMinutes = minutes;
                AlarmStore.putRule(context, rule);
                AlarmScheduler.armSnooze(context, rule, minutes);
            }
            AlarmStore.enqueueAction(context, "snoozed", taskId, occurrenceKey);
            return;
        }

        if (ACTION_TURN_OFF.equals(action)) {
            AlarmStore.enqueueAction(context, "remindersOff", taskId, occurrenceKey);
            if (rule != null) {
                AlarmScheduler.cancel(context, rule);
                rule.enabled = false;
                AlarmStore.putRule(context, rule);
            } else {
                AlarmIds.cancel(context, notificationId);
            }
        }
    }

    private void launchApp(Context context, String taskId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra(EXTRA_TASK_ID, taskId);
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        context.startActivity(intent);
    }
}
