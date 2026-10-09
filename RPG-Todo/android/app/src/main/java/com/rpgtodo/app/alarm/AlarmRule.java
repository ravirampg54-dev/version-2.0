package com.rpgtodo.app.alarm;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * A single recurring (or one-time) reminder rule.
 *
 * <p>This object is the native mirror of the reminder fields stored on a task in the web app. It is
 * persisted as JSON in SharedPreferences so that receivers can reschedule the next occurrence
 * without the WebView (and therefore without the app process) running.
 *
 * <p>All date handling uses local wall-clock time in the device's current time zone. Occurrence
 * instants are rebuilt from calendar fields (year/month/day/hour/minute) rather than by adding
 * 24h offsets, so daylight-saving transitions keep the reminder at the same local time.
 */
public class AlarmRule {

    public static final String REPEAT_NEVER = "never";
    public static final String REPEAT_DAILY = "daily";
    public static final String REPEAT_WEEKDAYS = "weekdays";
    public static final String REPEAT_WEEKLY = "weekly";
    public static final String REPEAT_CUSTOM = "custom";

    public static final String TYPE_NORMAL = "normal";
    public static final String TYPE_ALARM = "alarm";

    public static final String SOUND_ALARM = "alarm";
    public static final String SOUND_NOTIFICATION = "notification";
    public static final String SOUND_SILENT = "silent";

    public static final int LOOKAHEAD_DAYS = 400;

    /** 0 = Sunday .. 6 = Saturday, matching the JavaScript Date#getDay() convention. */
    public int[] repeatDays = new int[0];

    public String taskId = "";
    public String title = "";
    public String body = "";
    public String repeatType = REPEAT_NEVER;
    public int hour = 9;
    public int minute = 0;
    public int advanceMinutes = 0;
    public String reminderType = TYPE_NORMAL;
    public String alarmSound = SOUND_ALARM;
    public boolean vibration = true;
    public int snoozeMinutes = 10;
    public String startDate = "";
    public String endDate = "";
    public boolean enabled = true;

    /** Date key (yyyy-MM-dd) of the occurrence currently armed with AlarmManager. */
    public String occurrenceKey = "";
    /** Notification id of the currently armed occurrence, so cancellation is exact. */
    public int notificationId = 0;
    /** Epoch millis of the currently armed occurrence. */
    public long fireAt = 0L;
    public int snoozeCount = 0;

    public boolean isRecurring() {
        return !REPEAT_NEVER.equals(repeatType);
    }

    public boolean isAlarm() {
        return TYPE_ALARM.equals(reminderType);
    }

    public JSONObject toJson() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("taskId", taskId);
        json.put("title", title);
        json.put("body", body);
        json.put("repeatType", repeatType);
        JSONArray days = new JSONArray();
        for (int day : repeatDays) {
            days.put(day);
        }
        json.put("repeatDays", days);
        json.put("hour", hour);
        json.put("minute", minute);
        json.put("advanceMinutes", advanceMinutes);
        json.put("reminderType", reminderType);
        json.put("alarmSound", alarmSound);
        json.put("vibration", vibration);
        json.put("snoozeMinutes", snoozeMinutes);
        json.put("startDate", startDate);
        json.put("endDate", endDate);
        json.put("enabled", enabled);
        json.put("occurrenceKey", occurrenceKey);
        json.put("notificationId", notificationId);
        json.put("fireAt", fireAt);
        json.put("snoozeCount", snoozeCount);
        return json;
    }

    public static AlarmRule fromJson(JSONObject json) {
        AlarmRule rule = new AlarmRule();
        if (json == null) {
            return rule;
        }

        rule.taskId = json.optString("taskId", "");
        rule.title = json.optString("title", "");
        rule.body = json.optString("body", "");
        rule.repeatType = normalizeRepeatType(json.optString("repeatType", REPEAT_NEVER));
        rule.hour = clamp(json.optInt("hour", 9), 0, 23);
        rule.minute = clamp(json.optInt("minute", 0), 0, 59);
        rule.advanceMinutes = Math.max(0, json.optInt("advanceMinutes", 0));
        rule.reminderType = TYPE_ALARM.equals(json.optString("reminderType", TYPE_NORMAL))
            ? TYPE_ALARM
            : TYPE_NORMAL;
        String sound = json.optString("alarmSound", SOUND_ALARM);
        rule.alarmSound = SOUND_SILENT.equals(sound) || SOUND_NOTIFICATION.equals(sound) ? sound : SOUND_ALARM;
        rule.vibration = json.optBoolean("vibration", true);
        rule.snoozeMinutes = normalizeSnooze(json.optInt("snoozeMinutes", 10));
        rule.startDate = json.optString("startDate", "");
        rule.endDate = json.optString("endDate", "");
        rule.enabled = json.optBoolean("enabled", true);
        rule.occurrenceKey = json.optString("occurrenceKey", "");
        rule.notificationId = json.optInt("notificationId", 0);
        rule.fireAt = json.optLong("fireAt", 0L);
        rule.snoozeCount = json.optInt("snoozeCount", 0);
        rule.repeatDays = parseRepeatDays(json.optJSONArray("repeatDays"), rule);
        return rule;
    }

    public static int normalizeSnooze(int minutes) {
        if (minutes == 5 || minutes == 10 || minutes == 15) {
            return minutes;
        }
        return 10;
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static String normalizeRepeatType(String value) {
        if (REPEAT_DAILY.equals(value)) return REPEAT_DAILY;
        if (REPEAT_WEEKDAYS.equals(value)) return REPEAT_WEEKDAYS;
        if (REPEAT_WEEKLY.equals(value)) return REPEAT_WEEKLY;
        if (REPEAT_CUSTOM.equals(value)) return REPEAT_CUSTOM;
        return REPEAT_NEVER;
    }

    private static int[] parseRepeatDays(JSONArray array, AlarmRule rule) {
        if (REPEAT_CUSTOM.equals(rule.repeatType) && array != null && array.length() > 0) {
            int[] days = new int[array.length()];
            int count = 0;
            for (int i = 0; i < array.length(); i++) {
                int day = array.optInt(i, -1);
                if (day >= 0 && day <= 6) {
                    days[count++] = day;
                }
            }
            if (count == days.length) {
                return days;
            }
            int[] trimmed = new int[count];
            System.arraycopy(days, 0, trimmed, 0, count);
            return trimmed;
        }
        return new int[0];
    }

    // ---------------------------------------------------------------------
    // Recurrence maths
    // ---------------------------------------------------------------------

    /**
     * Returns the first occurrence date key at or after {@code fromDateKey} that satisfies the
     * recurrence rule and whose reminder instant is still in the future.
     *
     * @return a {@code yyyy-MM-dd} key, or an empty string when the rule has no future occurrence.
     */
    public String nextOccurrenceDate(String fromDateKey, long nowMillis) {
        Calendar cursor = parseDate(fromDateKey);
        if (cursor == null) {
            cursor = startOfDay(parseDate(startDate));
        }
        if (cursor == null) {
            cursor = startOfDay(nowMillis);
        }

        Calendar start = parseDate(startDate);
        if (start != null && cursor.before(start)) {
            cursor = start;
        }

        for (int i = 0; i < LOOKAHEAD_DAYS; i++) {
            if (!endDate.isEmpty()) {
                Calendar end = parseDate(endDate);
                if (end != null && cursor.after(end)) {
                    return "";
                }
            }
            if (matchesDate(cursor)) {
                if (fireInstant(cursor.getTimeInMillis()) > nowMillis) {
                    return dateKey(cursor);
                }
            }
            cursor.add(Calendar.DAY_OF_YEAR, 1);
        }
        return "";
    }

    /** True when this rule is meant to fire on the given calendar day. */
    public boolean matchesDate(Calendar day) {
        if (REPEAT_DAILY.equals(repeatType)) {
            return true;
        }
        if (REPEAT_WEEKDAYS.equals(repeatType)) {
            int weekday = day.get(Calendar.DAY_OF_WEEK);
            return weekday != Calendar.SATURDAY && weekday != Calendar.SUNDAY;
        }
        if (REPEAT_WEEKLY.equals(repeatType)) {
            Calendar anchor = parseDate(startDate);
            int anchorWeekday = anchor != null ? anchor.get(Calendar.DAY_OF_WEEK) : Calendar.MONDAY;
            return day.get(Calendar.DAY_OF_WEEK) == anchorWeekday;
        }
        if (REPEAT_CUSTOM.equals(repeatType)) {
            if (repeatDays.length == 0) {
                return false;
            }
            int weekday = day.get(Calendar.DAY_OF_WEEK);
            int jsWeekday = weekday - Calendar.SUNDAY;
            for (int repeatDay : repeatDays) {
                if (repeatDay == jsWeekday) {
                    return true;
                }
            }
            return false;
        }
        // One-time reminder: only the start date qualifies.
        return dayKey(day).equals(startDate);
    }

    /**
     * Builds the wall-clock reminder instant for a date key, minus the advance offset.
     *
     * <p>The calendar fields are resolved in the device's current time zone, so a reminder at
     * 07:00 stays at 07:00 local across DST boundaries.
     */
    public long fireInstantFor(String dateKey) {
        Calendar day = parseDate(dateKey);
        if (day == null) {
            return 0L;
        }
        return fireInstant(day.getTimeInMillis());
    }

    private long fireInstant(long dayStartMillis) {
        Calendar calendar = Calendar.getInstance(TimeZone.getDefault());
        calendar.setTimeInMillis(dayStartMillis);
        calendar.set(Calendar.HOUR_OF_DAY, hour);
        calendar.set(Calendar.MINUTE, minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        long instant = calendar.getTimeInMillis();
        if (advanceMinutes > 0) {
            instant -= (long) advanceMinutes * 60L * 1000L;
        }
        return instant;
    }

    // ---------------------------------------------------------------------
    // Small calendar helpers
    // ---------------------------------------------------------------------

    public static Calendar parseDate(String dateKey) {
        if (dateKey == null || dateKey.length() < 10) {
            return null;
        }
        try {
            int year = Integer.parseInt(dateKey.substring(0, 4));
            int month = Integer.parseInt(dateKey.substring(5, 7));
            int day = Integer.parseInt(dateKey.substring(8, 10));
            Calendar calendar = Calendar.getInstance(TimeZone.getDefault());
            calendar.clear();
            calendar.set(year, month - 1, day, 0, 0, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            return calendar;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static Calendar startOfDay(Calendar calendar) {
        Calendar copy = (Calendar) calendar.clone();
        copy.set(Calendar.HOUR_OF_DAY, 0);
        copy.set(Calendar.MINUTE, 0);
        copy.set(Calendar.SECOND, 0);
        copy.set(Calendar.MILLISECOND, 0);
        return copy;
    }

    public static Calendar startOfDay(long millis) {
        Calendar calendar = Calendar.getInstance(TimeZone.getDefault());
        calendar.setTimeInMillis(millis);
        return startOfDay(calendar);
    }

    public static String dateKey(Calendar calendar) {
        return String.format(
            Locale.US,
            "%04d-%02d-%02d",
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1,
            calendar.get(Calendar.DAY_OF_MONTH)
        );
    }

    public static String todayKey() {
        return dateKey(startOfDay(System.currentTimeMillis()));
    }
}
