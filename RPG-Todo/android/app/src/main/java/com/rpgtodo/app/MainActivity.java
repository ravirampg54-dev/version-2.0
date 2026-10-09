package com.rpgtodo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.rpgtodo.app.alarm.AlarmSchedulerPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // The alarm scheduler ships inside the app module rather than as a Capacitor plugin
        // package, so it is registered manually before the bridge is created.
        registerPlugin(AlarmSchedulerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
