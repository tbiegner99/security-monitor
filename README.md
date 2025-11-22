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

Start the security monitor:

```bash
npm start
```

Or specify a custom config file:

```bash
node dist/index.js /path/to/config.json
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
4. **Reporting**: State changes are reported to all configured reporters (MQTT, logs, etc.)
5. **Cleanup**: On shutdown (Ctrl+C), all GPIO resources and connections are properly cleaned up

## State Logic

- **normallyHigh: true**
  - GPIO value 1 (HIGH) = CLOSED
  - GPIO value 0 (LOW) = OPEN
- **normallyHigh: false**
  - GPIO value 0 (LOW) = CLOSED
  - GPIO value 1 (HIGH) = OPEN

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
