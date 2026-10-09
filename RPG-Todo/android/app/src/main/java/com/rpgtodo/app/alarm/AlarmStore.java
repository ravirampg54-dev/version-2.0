package com.rpgtodo.app.alarm;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * SharedPreferences-backed persistence for alarm rules and pending notification actions.
 *
 * <p>Broadcast receivers run in the same process as the activity, so all access is guarded by a
 * class-level monitor. Writes are commit()ed synchronously: an AlarmManager entry that survives a
 * process death is useless if the rule that can reschedule it did not survive too.
 */
public final class AlarmStore {

    private static final String PREFS_NAME = "rpg_todo_alarms";
    private static final String KEY_RULES = "alarm_rules";
    private static final String KEY_ACTIONS = "alarm_action_queue";
    private static final String KEY_SCHEDULED_AT = "last_sync_at";
    private static final int MAX_QUEUED_ACTIONS = 40;

    private AlarmStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static synchronized Map<String, AlarmRule> loadRules(Context context) {
        Map<String, AlarmRule> rules = new LinkedHashMap<>();
        String raw = prefs(context).getString(KEY_RULES, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject json = array.optJSONObject(i);
                if (json == null) {
                    continue;
                }
                AlarmRule rule = AlarmRule.fromJson(json);
                if (!rule.taskId.isEmpty()) {
                    rules.put(rule.taskId, rule);
                }
            }
        } catch (JSONException ex) {
            // Corrupt store: start from empty rather than crash the receiver.
            return new LinkedHashMap<>();
        }
        return rules;
    }

    public static synchronized void saveRules(Context context, Map<String, AlarmRule> rules) {
        JSONArray array = new JSONArray();
        for (AlarmRule rule : rules.values()) {
            try {
                array.put(rule.toJson());
            } catch (JSONException ex) {
                // Skip the individual rule rather than losing the whole schedule.
            }
        }
        prefs(context)
            .edit()
            .putString(KEY_RULES, array.toString())
            .putLong(KEY_SCHEDULED_AT, System.currentTimeMillis())
            .commit();
    }

    public static synchronized long lastSyncAt(Context context) {
        return prefs(context).getLong(KEY_SCHEDULED_AT, 0L);
    }

    public static synchronized AlarmRule getRule(Context context, String taskId) {
        return loadRules(context).get(taskId);
    }

    public static synchronized void putRule(Context context, AlarmRule rule) {
        Map<String, AlarmRule> rules = loadRules(context);
        rules.put(rule.taskId, rule);
        saveRules(context, rules);
    }

    public static synchronized void removeRule(Context context, String taskId) {
        Map<String, AlarmRule> rules = loadRules(context);
        if (rules.remove(taskId) != null) {
            saveRules(context, rules);
        }
    }

    public static synchronized void clearRules(Context context) {
        prefs(context).edit().remove(KEY_RULES).commit();
    }

    /**
     * Queues a notification action for the web layer to pick up. The WebView may not be running
     * when an alarm action is tapped, so actions are persisted and drained on the next app start or
     * resume instead of being delivered over the bridge immediately.
     */
    public static synchronized void enqueueAction(Context context, String type, String taskId, String dateKey) {
        JSONArray array = readActions(context);
        JSONObject action = new JSONObject();
        try {
            action.put("type", type);
            action.put("taskId", taskId == null ? "" : taskId);
            action.put("dateKey", dateKey == null ? "" : dateKey);
            action.put("at", System.currentTimeMillis());
            array.put(action);
        } catch (JSONException ex) {
            return;
        }
        while (array.length() > MAX_QUEUED_ACTIONS) {
            array.remove(0);
        }
        prefs(context).edit().putString(KEY_ACTIONS, array.toString()).commit();
    }

    public static synchronized JSONArray drainActions(Context context) {
        JSONArray pending = readActions(context);
        if (pending.length() > 0) {
            prefs(context).edit().remove(KEY_ACTIONS).commit();
        }
        return pending;
    }

    private static JSONArray readActions(Context context) {
        String raw = prefs(context).getString(KEY_ACTIONS, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException ex) {
            return new JSONArray();
        }
    }

    /** Snapshot of every armed occurrence, for the Capacitor bridge to report to the web layer. */
    public static synchronized List<AlarmRule> snapshot(Context context) {
        return new ArrayList<>(loadRules(context).values());
    }
}
