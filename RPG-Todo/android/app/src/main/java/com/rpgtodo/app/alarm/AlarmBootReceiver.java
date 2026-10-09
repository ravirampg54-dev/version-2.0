package com.rpgtodo.app.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Rebuilds the whole schedule after events that invalidate AlarmManager entries.
 *
 * <ul>
 *   <li>{@code BOOT_COMPLETED} / {@code QUICKBOOT_POWERON} — alarms are cleared on reboot.
 *   <li>{@code MY_PACKAGE_REPLACED} — alarms are cleared on app update.
 *   <li>{@code TIMEZONE_CHANGED} / {@code TIME_SET} — armed alarms are anchored to a UTC offset, so
 *       a travel or clock change would otherwise shift every reminder.
 * </ul>
 *
 * <p>{@code LOCKED_BOOT_COMPLETED} is deliberately not handled: rules live in credential-encrypted
 * storage, which is not readable until after the user unlocks the device and {@code
 * BOOT_COMPLETED} fires.
 */
public class AlarmBootReceiver extends BroadcastReceiver {

    private static final String[] HANDLED_ACTIONS = {
        Intent.ACTION_BOOT_COMPLETED,
        Intent.ACTION_MY_PACKAGE_REPLACED,
        Intent.ACTION_TIMEZONE_CHANGED,
        Intent.ACTION_TIME_CHANGED,
        "android.intent.action.QUICKBOOT_POWERON",
        "com.htc.intent.action.QUICKBOOT_POWERON",
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (action == null || !isHandled(action)) {
            return;
        }

        AlarmChannels.ensureChannels(context);
        AlarmScheduler.rescheduleAll(context);
    }

    private static boolean isHandled(String action) {
        for (String handled : HANDLED_ACTIONS) {
            if (handled.equals(action)) {
                return true;
            }
        }
        return false;
    }
}
