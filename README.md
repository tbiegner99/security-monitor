# Security Monitor

A TypeScript-based GPIO security monitoring system for Raspberry Pi and similar devices. This application monitors GPIO pins for state changes and reports them through configurable reporters (MQTT, logging, etc.).

## Features

- **GPIO Monitoring**: Watch multiple GPIO pins for state changes
- **Flexible Configuration**: JSON-based configuration for monitors and reporters
- **Multiple Reporters**: Support for MQTT and console logging (easily extensible)
- **Type-Safe**: Written in TypeScript with full type definitions
- **Graceful Shutdown**: Proper cleanup of GPIO resources and connections

## Installation

```bash
npm install
```

## Building

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Configuration

### Quick Setup (Recommended)

Use the interactive setup wizard to create your configuration:

```bash
npm run setup
```

The wizard will guide you through:

- Adding monitors (sensors)
- Configuring GPIO pins
- Setting up reporters (MQTT, logging)
- Saving the configuration

### Manual Configuration

Create or edit `config.json` in the project root:

```json
{
  "monitors": [
    {
      "name": "Front Door",
      "normallyHigh": true,
      "gpio": 17,
      "reporters": [
        {
          "type": "mqtt",
          "broker": "tcp://home-assistant:1883",
          "topic": "home/security/frontdoor",
          "username": "optional",
          "password": "optional"
        },
        {
          "type": "log"
        }
      ]
    }
  ]
}
```

### Configuration Options

#### Monitor Configuration

- `name` (string): Human-readable name for the monitor
- `normallyHigh` (boolean):
  - `true`: GPIO normally high (3.3V) when closed, goes low when open
  - `false`: GPIO normally low (0V) when closed, goes high when open
- `gpio` (number): GPIO pin number (BCM numbering)
- `momentary` (boolean, optional, default: `false`):
  - `true`: Only report when GPIO changes FROM normal state (e.g., button press, motion detected)
  - `false`: Report ALL state changes (both opening and closing)
- `reporters` (array): List of reporter configurations

#### Reporter Types

**Log Reporter**

```json
{
  "type": "log"
}
```

Logs state changes to the console.

**MQTT Reporter**

```json
{
  "type": "mqtt",
  "broker": "tcp://hostname:1883",
  "topic": "your/topic/here",
  "username": "optional",
  "password": "optional"
}
```

Publishes state changes to an MQTT broker.

## Running

### Manual Start

Start the security monitor:

```bash
npm start
```

Or specify a custom config file:

```bash
node dist/index.js /path/to/config.json
```

### Install as Linux Service

For production use on Linux systems (Raspberry Pi, etc.), install as a systemd service:

```bash
sudo ./install-service.sh
```

This will:

- Build the project
- Create a systemd service
- Enable auto-start on boot
- Configure proper logging

**Service Management Commands:**

```bash
# Start the service
sudo systemctl start security-monitor

# Stop the service
sudo systemctl stop security-monitor

# Restart the service
sudo systemctl restart security-monitor

# Check service status
sudo systemctl status security-monitor

# View live logs
sudo journalctl -u security-monitor -f

# View recent logs
sudo journalctl -u security-monitor -n 100

# Disable auto-start
sudo systemctl disable security-monitor
```

**Uninstall Service:**

```bash
sudo ./uninstall-service.sh
```

## Development

Watch mode for development:

```bash
npm run watch
```

Then in another terminal:

```bash
node dist/index.js
```

## How It Works

1. **Initialization**: The application reads the configuration and initializes GPIO monitors for each configured pin
2. **Monitoring**: Each monitor watches its GPIO pin for state changes using edge detection
3. **State Detection**: When a pin changes state, the monitor determines if it's "OPEN" or "CLOSED" based on the `normallyHigh` setting
4. **Reporting**: State changes are reported to all configured reporters (MQTT, logs, etc.) based on the `momentary` setting
5. **Cleanup**: On shutdown (Ctrl+C), all GPIO resources and connections are properly cleaned up

## State Logic

- **normallyHigh: true**
  - GPIO value 1 (HIGH) = CLOSED
  - GPIO value 0 (LOW) = OPEN
- **normallyHigh: false**
  - GPIO value 0 (LOW) = CLOSED
  - GPIO value 1 (HIGH) = OPEN

## Momentary vs. Continuous Monitoring

### Continuous Mode (`momentary: false` - default)

Reports **every** state change:

- Door opens → Report sent ✅
- Door closes → Report sent ✅

Use for: Door/window sensors, switches that need both open and close notifications

### Momentary Mode (`momentary: true`)

Reports **only** when changing from normal state:

- Button pressed (normallyHigh: true, goes LOW) → Report sent ✅
- Button released (returns HIGH) → No report ❌
- Motion detected (normallyHigh: false, goes HIGH) → Report sent ✅
- Motion clears (returns LOW) → No report ❌

Use for: Buttons, motion sensors, momentary switches, doorbells

## Event Format

Events reported to reporters have the following structure:

```typescript
{
  name: string; // Monitor name
  gpio: number; // GPIO pin number
  value: number; // Current GPIO value (0 or 1)
  state: "OPEN" | "CLOSED"; // Interpreted state
  timestamp: Date; // When the change occurred
}
```

## Requirements

- Node.js 18+
- Raspberry Pi or compatible device with GPIO support
- GPIO pins properly configured with appropriate pull-up/pull-down resistors

## License

ISC
