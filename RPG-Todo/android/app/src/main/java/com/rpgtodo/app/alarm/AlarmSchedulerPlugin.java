package com.rpgtodo.app.alarm;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Web-layer bridge for native reminder scheduling.
 *
 * <p>The web app owns task data; this plugin owns <em>when the OS fires</em>. Methods:
 *
 * <ul>
 *   <li>{@code sync} — full reconciliation: arms tasks that should be armed, cancels tasks that
 *       should not, and returns the next occurrence per task so the UI can display it.
 *   <li>{@code schedule} / {@code cancel} — targeted single-task operations.
 *   <li>{@code getStatus} — notification permission, exact-alarm capability, Android version.
 *   <li>{@code requestPermissions} — POST_NOTIFICATIONS.
 *   <li>{@code openExactAlarmSettings} — deep-links to the OS screen where exact alarms are granted.
 *   <li>{@code consumeActions} — drains queued notification-button actions.
 * </ul>
 */
@CapacitorPlugin(
    name = "AlarmScheduler",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"),
    }
)
public class AlarmSchedulerPlugin extends Plugin {

    private static final int NOTIFICATION_PERMISSION_REQUEST = 4831;

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(buildStatus());
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity available to request notification permission.");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(buildStatus());
            return;
        }

        ActivityCompat.requestPermissions(
            activity,
            new String[] { Manifest.permission.POST_NOTIFICATIONS },
            NOTIFICATION_PERMISSION_REQUEST
        );
        // PermissionDialog listener resolves the call when the user answers.
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        AlarmRule rule = ruleFromCall(call);
        if (rule == null) {
            return;
        }
        AlarmChannels.ensureChannels(getContext());
        AlarmScheduler.cancel(getContext(), rule);
        if (AlarmScheduler.arm(getContext(), rule, rule.startDate.isEmpty() ? AlarmRule.todayKey() : rule.startDate)) {
            AlarmStore.putRule(getContext(), rule);
        } else {
            AlarmStore.removeRule(getContext(), rule.taskId);
        }
        JSObject result = new JSObject();
        result.put("taskId", rule.taskId);
        result.put("scheduled", rule.enabled);
        result.put("occurrenceKey", rule.occurrenceKey);
        result.put("fireAt", rule.fireAt);
        call.resolve(result);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String taskId = call.getString("taskId", "");
        if (taskId.isEmpty()) {
            call.reject("taskId is required.");
            return;
        }
        AlarmScheduler.cancelTask(getContext(), taskId);
        call.resolve();
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        AlarmScheduler.cancelAll(getContext());
        call.resolve();
    }

    /**
     * Reconciles the native schedule with the task list supplied by the web layer.
     *
     * <p>Any task missing from {@code tasks} is cancelled and dropped from the native store, which
     * is what keeps deleted tasks from ever ringing again.
     */
    @PluginMethod
    public void sync(PluginCall call) {
        JSONArray tasks = call.getArray("tasks", new JSArray());
        AlarmChannels.ensureChannels(getContext());

        List<AlarmRule> desired = new ArrayList<>();
        Set<String> desiredIds = new HashSet<>();

        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task == null) {
                continue;
            }
            AlarmRule rule = ruleFromTask(task);
            if (rule == null) {
                continue;
            }
            desired.add(rule);
            desiredIds.add(rule.taskId);
        }

        // Drop rules whose tasks no longer exist or no longer want reminders.
        for (AlarmRule existing : AlarmStore.snapshot(getContext())) {
            if (!desiredIds.contains(existing.taskId)) {
                AlarmScheduler.cancel(getContext(), existing);
                AlarmStore.removeRule(getContext(), existing.taskId);
            }
        }

        List<AlarmRule> armed = new ArrayList<>();
        for (AlarmRule rule : desired) {
            AlarmScheduler.cancel(getContext(), rule);
            boolean ok = AlarmScheduler.arm(getContext(), rule, rule.startDate);
            rule.enabled = ok;
            if (ok) {
                armed.add(rule);
            }
            AlarmStore.putRule(getContext(), rule);
        }

        JSObject result = buildStatus();
        JSArray scheduled = new JSArray();
        for (AlarmRule rule : armed) {
            JSObject item = new JSObject();
            item.put("taskId", rule.taskId);
            item.put("occurrenceKey", rule.occurrenceKey);
            item.put("fireAt", rule.fireAt);
            item.put("notificationId", rule.notificationId);
            scheduled.put(item);
        }
        result.put("scheduled", scheduled);
        result.put("syncedAt", System.currentTimeMillis());
        call.resolve(result);
    }

    @PluginMethod
    public void getPending(PluginCall call) {
        JSArray pending = new JSArray();
        for (AlarmRule rule : AlarmStore.snapshot(getContext())) {
            if (!rule.enabled || rule.occurrenceKey.isEmpty()) {
                continue;
            }
            JSObject item = new JSObject();
            item.put("taskId", rule.taskId);
            item.put("title", rule.title);
            item.put("occurrenceKey", rule.occurrenceKey);
            item.put("fireAt", rule.fireAt);
            item.put("notificationId", rule.notificationId);
            item.put("reminderType", rule.reminderType);
            item.put("repeatType", rule.repeatType);
            pending.put(item);
        }
        JSObject result = new JSObject();
        result.put("notifications", pending);
        call.resolve(result);
    }

    /** Drains notification-button actions recorded while the app was not running. */
    @PluginMethod
    public void consumeActions(PluginCall call) {
        JSArray actions = new JSArray();
        try {
            JSONArray stored = AlarmStore.drainActions(getContext());
            for (int i = 0; i < stored.length(); i++) {
                if (stored.optJSONObject(i) != null) {
                    actions.put(stored.getJSONObject(i));
                }
            }
        } catch (JSONException ex) {
            // Fall through with an empty queue rather than failing the whole call.
        }
        JSObject result = new JSObject();
        result.put("actions", actions);
        call.resolve(result);
    }

    /** Opens the OS screen where the user grants "Alarms &amp; reminders" / exact alarms. */
    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity available to open settings.");
            return;
        }

        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not open exact alarm settings on this device.", ex);
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity available to open settings.");
            return;
        }
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not open notification settings on this device.", ex);
        }
    }

    // -----------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------

    private JSObject buildStatus() {
        JSObject status = new JSObject();
        status.put("available", true);
        status.put("platform", "android");
        status.put("sdkInt", Build.VERSION.SDK_INT);
        status.put("notificationsGranted", hasNotificationPermission());
        status.put("canScheduleExact", AlarmScheduler.canScheduleExact(getContext()));
        status.put("requiresNotificationPermission", Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU);
        status.put("supportsActions", true);
        status.put("bootRestore", true);
        return status;
    }

    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }
        return (
            getContext()
                .getPackageManager()
                .checkPermission(Manifest.permission.POST_NOTIFICATIONS, getContext().getPackageName()) ==
            PackageManager.PERMISSION_GRANTED
        );
    }

    private AlarmRule ruleFromCall(PluginCall call) {
        AlarmRule rule = ruleFromTask(call.getObject("task", new JSObject()));
        if (rule == null) {
            call.reject("Invalid reminder payload.");
            return null;
        }
        return rule;
    }

    /** Maps a web task object onto a native rule, or returns null when it should not be armed. */
    private AlarmRule ruleFromTask(JSONObject task) {
        if (task == null) {
            return null;
        }
        String taskId = task.optString("id", "");
        if (taskId.isEmpty() || !task.optBoolean("reminderEnabled", false)) {
            return null;
        }

        AlarmRule rule = new AlarmRule();
        rule.taskId = taskId;
        rule.title = task.optString("title", "");
        rule.body = task.optString("description", "");
        rule.repeatType = task.optString("repeatType", AlarmRule.REPEAT_NEVER);
        rule.reminderType = task.optString("reminderType", AlarmRule.TYPE_NORMAL);
        rule.alarmSound = task.optString("alarmSound", AlarmRule.SOUND_ALARM);
        rule.vibration = task.optBoolean("vibrationEnabled", true);
        rule.advanceMinutes = Math.max(0, task.optInt("advanceMinutes", 0));
        rule.snoozeMinutes = AlarmRule.normalizeSnooze(task.optInt("snoozeMinutes", 10));
        rule.startDate = task.optString("startDate", "");
        rule.endDate = task.optString("endDate", "");
        rule.hour = task.optInt("hour", 9);
        rule.minute = task.optInt("minute", 0);

        JSONArray days = task.optJSONArray("repeatDays");
        if (days != null && days.length() > 0) {
            int[] parsed = new int[days.length()];
            for (int i = 0; i < days.length(); i++) {
                parsed[i] = days.optInt(i, -1);
            }
            rule.repeatDays = parsed;
        }

        if (rule.startDate.isEmpty()) {
            rule.startDate = AlarmRule.todayKey();
        }
        return rule;
    }
}
