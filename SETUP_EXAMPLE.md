# Setup Wizard Example

When you run `npm run setup`, you'll see an interactive wizard like this:

```
╔════════════════════════════════════════╗
║  Security Monitor Configuration Setup ║
╚════════════════════════════════════════╝

This wizard will help you create a config.json file.

=== New Monitor Configuration ===
Monitor name (e.g., "Front Door", "Window Sensor"): Front Door
GPIO pin number (BCM numbering): 17

GPIO Configuration:
  normallyHigh: true  = Pin is HIGH (3.3V) when closed, LOW when open
  normallyHigh: false = Pin is LOW (0V) when closed, HIGH when open
Is the GPIO normally high when closed? (Y/n): y

--- Reporter Configuration ---
Available reporter types:
  1. Log (console logging)
  2. MQTT (publish to MQTT broker)
Add log reporter? (Y/n): y
✓ Log reporter added
Add MQTT reporter? (Y/n): y

--- MQTT Reporter Configuration ---
MQTT Broker URL (e.g., tcp://localhost:1883): tcp://home-assistant:1883
MQTT Topic (e.g., home/security/sensor): home/security/frontdoor
Does the broker require authentication? (y/N): n
✓ MQTT reporter added

✓ Monitor "Front Door" configured successfully!

Add another monitor? (y/N): n

╔════════════════════════════════════════╗
║         Configuration Summary          ║
╚════════════════════════════════════════╝

Total monitors: 1

📍 Front Door
   GPIO: 17
   Normally High: true
   Reporters: log, mqtt

Save configuration to /path/to/config.json? (Y/n): y

✓ Configuration saved to /path/to/config.json

You can now run the security monitor with:
  npm start
```

The wizard creates a properly formatted `config.json` file that you can edit later if needed.
