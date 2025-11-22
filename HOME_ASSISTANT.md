# Home Assistant Integration Guide

The Security Monitor includes native Home Assistant integration with MQTT auto-discovery.

## Features

- 🔍 **Automatic Discovery**: Sensors appear in Home Assistant without manual configuration
- 📊 **Smart Device Classes**: Automatically detects and assigns appropriate device classes (door, window, motion, etc.)
- 💚 **Availability Tracking**: Shows online/offline status of the security monitor
- 📱 **Unified Device**: All sensors grouped under a single device in Home Assistant
- 🔄 **Reliable**: Uses MQTT Last Will and Testament for connection monitoring
- 🏷️ **JSON Attributes**: Full state information available as attributes

## Quick Start

1. **Enable in configuration:**

```json
{
  "homeAssistant": {
    "enabled": true,
    "broker": "tcp://home-assistant:1883"
  }
}
```

2. **Start the monitor:**

```bash
npm start
```

3. **Check Home Assistant:**
   - Go to Settings → Devices & Services → MQTT
   - Your sensors should appear automatically under a new device

## Configuration

### Basic Configuration

Minimal configuration requires only enabling and specifying the broker:

```json
{
  "homeAssistant": {
    "enabled": true,
    "broker": "tcp://192.168.1.100:1883"
  }
}
```

### Full Configuration

```json
{
  "homeAssistant": {
    "enabled": true,
    "broker": "tcp://home-assistant:1883",
    "discoveryPrefix": "homeassistant",
    "availabilityTopic": "security-monitor/availability",
    "username": "mqtt_user",
    "password": "mqtt_password",
    "deviceName": "Raspberry Pi Security Monitor",
    "deviceId": "security-monitor-rpi4"
  }
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | - | Enable/disable Home Assistant integration |
| `broker` | string | Yes | - | MQTT broker URL (e.g., `tcp://192.168.1.100:1883`) |
| `discoveryPrefix` | string | No | `homeassistant` | MQTT discovery topic prefix |
| `availabilityTopic` | string | No | `security-monitor/availability` | Topic for online/offline status |
| `username` | string | No | - | MQTT broker username |
| `password` | string | No | - | MQTT broker password |
| `deviceName` | string | No | `Security Monitor (hostname)` | Device name shown in Home Assistant |
| `deviceId` | string | No | `security-monitor-hostname` | Unique device identifier |

## How It Works

### Discovery Process

When the security monitor starts with Home Assistant integration enabled:

1. **Connects to MQTT** with a Last Will message pointing to availability topic
2. **Publishes availability** as "online" to the availability topic
3. **Publishes discovery configs** for each monitor to Home Assistant discovery topics
4. **Maintains connection** and automatically reconnects if disconnected
5. **Publishes "offline"** when shutting down gracefully

### Device Class Detection

The integration automatically assigns appropriate device classes based on monitor names:

| Monitor Name Contains | Device Class | Icon in HA |
|----------------------|--------------|------------|
| "door" | `door` | 🚪 |
| "window" | `window` | 🪟 |
| "motion" | `motion` | 🏃 |
| "garage" | `garage_door` | 🚗 |
| "lock" | `lock` | 🔒 |
| "opening" | `opening` | 📂 |
| (momentary: true) | `motion` | 🏃 |
| (default) | `opening` | 📂 |

### Discovery Topics

Discovery configurations are published to:
```
{discoveryPrefix}/binary_sensor/{device_id}_gpio_{pin}/config
```

Example:
```
homeassistant/binary_sensor/security-monitor-rpi4_gpio_17/config
```

### State Topics

State updates are published to the MQTT topic configured in each monitor's MQTT reporter.

## Example Configurations

### Single Door Sensor

```json
{
  "monitors": [
    {
      "name": "Front Door",
      "gpio": 17,
      "normallyHigh": true,
      "reporters": [
        {
          "type": "mqtt",
          "broker": "tcp://home-assistant:1883",
          "topic": "security/front-door/state"
        }
      ]
    }
  ],
  "homeAssistant": {
    "enabled": true,
    "broker": "tcp://home-assistant:1883"
  }
}
```

### Multiple Sensors with Authentication

```json
{
  "monitors": [
    {
      "name": "Front Door",
      "gpio": 17,
      "normallyHigh": true,
      "reporters": [
        {
          "type": "mqtt",
          "broker": "tcp://home-assistant:1883",
          "topic": "security/front-door/state"
        }
      ]
    },
    {
      "name": "Back Window",
      "gpio": 27,
      "normallyHigh": true,
      "reporters": [
        {
          "type": "mqtt",
          "broker": "tcp://home-assistant:1883",
          "topic": "security/back-window/state"
        }
      ]
    },
    {
      "name": "Motion Sensor",
      "gpio": 22,
      "normallyHigh": false,
      "momentary": true,
      "reporters": [
        {
          "type": "mqtt",
          "broker": "tcp://home-assistant:1883",
          "topic": "security/motion/state"
        }
      ]
    }
  ],
  "homeAssistant": {
    "enabled": true,
    "broker": "tcp://home-assistant:1883",
    "username": "mqtt_user",
    "password": "secure_password",
    "deviceName": "Raspberry Pi Security System",
    "deviceId": "rpi-security-001"
  }
}
```

## Verification

### Check Discovery in Home Assistant

1. Go to **Settings** → **Devices & Services**
2. Click on **MQTT** integration
3. Click **Devices** tab
4. Look for your device (e.g., "Security Monitor (hostname)")
5. Click on the device to see all sensors

### Check MQTT Topics

You can use an MQTT client to verify the topics:

```bash
# Subscribe to discovery topic
mosquitto_sub -h home-assistant -t "homeassistant/binary_sensor/#" -v

# Subscribe to availability topic
mosquitto_sub -h home-assistant -t "security-monitor/availability" -v

# Subscribe to state topics
mosquitto_sub -h home-assistant -t "security/#" -v
```

### Check Logs

Monitor logs for Home Assistant integration status:

```bash
# If running manually
npm start

# If running as service
sudo journalctl -u security-monitor -f
```

Look for:
```
Home Assistant: Connected to tcp://home-assistant:1883
Home Assistant: Discovery published for Front Door (door)
Home Assistant: Discovery published for Motion Sensor (motion)
```

## Troubleshooting

### Sensors Not Appearing

1. **Check MQTT broker connection:**
   - Verify broker URL is correct
   - Test credentials if using authentication
   - Ensure MQTT integration is set up in Home Assistant

2. **Check discovery prefix:**
   - Default is `homeassistant`
   - If you changed it in Home Assistant, update config to match

3. **Check logs:**
   ```bash
   sudo journalctl -u security-monitor -f
   ```

4. **Manual discovery:**
   - Restart the security monitor
   - Restart Home Assistant
   - Check MQTT integration in Home Assistant

### Availability Shows Offline

1. **Check availability topic:**
   - Verify topic matches in configuration
   - Use MQTT client to check messages

2. **Check connection:**
   - Monitor may have crashed
   - MQTT broker may be unreachable
   - Check service status: `sudo systemctl status security-monitor`

### Sensors Show Unknown State

1. **Check MQTT reporters:**
   - Each monitor needs an MQTT reporter configured
   - State topic must match what Home Assistant expects

2. **Check monitor is working:**
   - Test GPIO pins
   - Check console/log output

## Customization in Home Assistant

After discovery, you can customize sensors in Home Assistant:

1. Go to the sensor entity
2. Click the gear icon
3. Customize:
   - Friendly name
   - Icon
   - Entity ID
   - Area assignment

These customizations persist even if the monitor restarts.

## Removing Integration

To remove the Home Assistant integration:

1. **Stop the monitor:**
   ```bash
   sudo systemctl stop security-monitor
   ```

2. **Remove from Home Assistant:**
   - Go to Settings → Devices & Services → MQTT
   - Find your device
   - Click "Delete" on the device

3. **Clear retained messages** (optional):
   ```bash
   mosquitto_pub -h home-assistant -t "homeassistant/binary_sensor/+/config" -n -r -d
   mosquitto_pub -h home-assistant -t "security-monitor/availability" -n -r -d
   ```

## Advanced: Custom Automations

Example automation using the security monitor:

```yaml
automation:
  - alias: "Front Door Opened Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          message: "Front door was opened!"
          
  - alias: "Motion Detected at Night"
    trigger:
      - platform: state
        entity_id: binary_sensor.motion_sensor
        to: "on"
    condition:
      - condition: time
        after: "22:00:00"
        before: "06:00:00"
    action:
      - service: light.turn_on
        target:
          entity_id: light.hallway
      - service: notify.mobile_app
        data:
          message: "Motion detected at night!"
```
