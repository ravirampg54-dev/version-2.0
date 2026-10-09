package com.rpgtodo.app.alarm;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import com.rpgtodo.app.MainActivity;
import com.rpgtodo.app.R;

/**
 * Builds and posts the reminder / alarm notifications.
 *
 * <p>Alarms get alarm-grade presentation (max priority, alarm category, public lock-screen
 * visibility, action buttons). Everything is delivered as a standard notification driven by the OS:
 * this app does not attempt a full-screen intent or continuous ringing, which would require extra
 * permissions and dedicated audio focus handling.
 */
public final class AlarmNotifications {

    private static final int REQUEST_OPEN_BASE = 400000;
    private static final int REQUEST_ACTION_BASE = 500000;

    private AlarmNotifications() {}

    /** PendingIntent that brings RPG Todo to the foreground and focuses a task. */
    public static PendingIntent openTaskPendingIntent(Context context, String taskId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra(AlarmActionReceiver.EXTRA_TASK_ID, taskId == null ? "" : taskId);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            REQUEST_OPEN_BASE + (taskId == null ? 0 : Math.abs(taskId.hashCode() % 9000)),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent actionPendingIntent(
        Context context,
        String action,
        String taskId,
        String occurrenceKey,
        int extra,
        int requestCode
    ) {
        Intent intent = new Intent(context, AlarmActionReceiver.class);
        intent.setAction(action);
        intent.setData(android.net.Uri.parse("rpg-todo://action/" + action + "/" + taskId));
        intent.putExtra(AlarmActionReceiver.EXTRA_TASK_ID, taskId);
        intent.putExtra(AlarmActionReceiver.EXTRA_OCCURRENCE_KEY, occurrenceKey);
        intent.putExtra(AlarmActionReceiver.EXTRA_SNOOZE_MINUTES, extra);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /**
     * Posts (or replaces) the notification for one occurrence.
     *
     * @param notificationId stable id derived from the task and occurrence date
     * @param isSnooze true when this is a snoozed copy of an already-fired occurrence
     */
    public static void show(Context context, AlarmRule rule, int notificationId, boolean isSnooze) {
        AlarmChannels.ensureChannels(context);
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        String timeLabel = AlarmScheduler.formatTime(rule);
        String contentText = rule.body.isEmpty() ? context.getString(R.string.notification_default_body, timeLabel) : rule.body;
        String subText = isSnooze
            ? context.getString(R.string.notification_subtext_snoozed, timeLabel, rule.snoozeMinutes)
            : timeLabel;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, AlarmChannels.channelFor(rule))
            .setSmallIcon(R.drawable.ic_stat_rpg_todo)
            .setColor(0xff6c63ff)
            .setContentTitle(rule.title.isEmpty() ? context.getString(R.string.app_name) : rule.title)
            .setContentText(contentText)
            .setSubText(subText)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(contentText))
            .setContentIntent(openTaskPendingIntent(context, rule.taskId))
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setShowWhen(true)
            .setWhen(rule.fireAt > 0 ? rule.fireAt : System.currentTimeMillis())
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(rule.isAlarm() ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(rule.isAlarm() ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER);

        int requestBase = REQUEST_ACTION_BASE + Math.abs(notificationId % 100000);
        builder.addAction(
            new NotificationCompat.Action(
                R.drawable.ic_stat_rpg_todo,
                context.getString(R.string.action_open_task),
                actionPendingIntent(
                    context,
                    AlarmActionReceiver.ACTION_OPEN,
                    rule.taskId,
                    rule.occurrenceKey,
                    0,
                    requestBase + 1
                )
            )
        );
        builder.addAction(
            new NotificationCompat.Action(
                R.drawable.ic_stat_rpg_todo,
                context.getString(R.string.action_complete),
                actionPendingIntent(
                    context,
                    AlarmActionReceiver.ACTION_COMPLETE,
                    rule.taskId,
                    rule.occurrenceKey,
                    0,
                    requestBase + 2
                )
            )
        );

        if (rule.isAlarm()) {
            builder.addAction(
                new NotificationCompat.Action(
                    R.drawable.ic_stat_rpg_todo,
                    context.getString(R.string.action_snooze, rule.snoozeMinutes),
                    actionPendingIntent(
                        context,
                        AlarmActionReceiver.ACTION_SNOOZE,
                        rule.taskId,
                        rule.occurrenceKey,
                        rule.snoozeMinutes,
                        requestBase + 3
                    )
                )
            );
        }

        if (rule.isRecurring()) {
            builder.addAction(
                new NotificationCompat.Action(
                    R.drawable.ic_stat_rpg_todo,
                    context.getString(R.string.action_turn_off),
                    actionPendingIntent(
                        context,
                        AlarmActionReceiver.ACTION_TURN_OFF,
                        rule.taskId,
                        rule.occurrenceKey,
                        0,
                        requestBase + 4
                    )
                )
            );
        }

        try {
            manager.notify(notificationId, builder.build());
        } catch (SecurityException ex) {
            // POST_NOTIFICATIONS was revoked between the alarm firing and this call.
        }
    }
}
