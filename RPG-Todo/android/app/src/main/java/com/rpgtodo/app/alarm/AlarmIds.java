package com.rpgtodo.app.alarm;

import android.app.NotificationManager;
import android.content.Context;

/**
 * Stable notification identifiers.
 *
 * <p>Ids are derived from {@code taskId + occurrence date + snooze bucket} with an FNV-1a hash
 * truncated to a positive 31-bit integer. Because the seed strings are stable across reboots and
 * app restarts, the same occurrence always maps to the same notification id, which lets us cancel
 * exactly one pending notification without touching other tasks.
 */
public final class AlarmIds {

    private AlarmIds() {}

    public static int occurrence(String taskId, String occurrenceKey) {
        return hash(taskId + "|" + occurrenceKey);
    }

    public static int snooze(String taskId, String occurrenceKey, int minutes) {
        return hash(taskId + "|" + occurrenceKey + "|snooze:" + minutes + ":" + occurrenceKey);
    }

    /** Positive 31-bit FNV-1a. */
    private static int hash(String seed) {
        final int offsetBasis = 0x811c9dc5;
        final int prime = 0x01000193;
        int hash = offsetBasis;
        for (int i = 0; i < seed.length(); i++) {
            hash ^= seed.charAt(i);
            hash *= prime;
        }
        return hash & 0x7fffffff;
    }

    public static void cancel(Context context, int notificationId) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(notificationId);
        }
    }
}
