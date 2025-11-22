import * as mqtt from "mqtt";
import { HomeAssistantConfig, MonitorConfig } from "./types";
import * as os from "os";

/**
 * Home Assistant MQTT Discovery Integration
 */
export class HomeAssistantIntegration {
  private client: mqtt.MqttClient | null = null;
  private config: HomeAssistantConfig;
  private connected: boolean = false;
  private discoveryPrefix: string;
  private availabilityTopic: string;
  private deviceName: string;
  private deviceId: string;

  constructor(config: HomeAssistantConfig) {
    this.config = config;
    this.discoveryPrefix = config.discoveryPrefix || "homeassistant";
    this.availabilityTopic =
      config.availabilityTopic || "security-monitor/availability";
    this.deviceName = config.deviceName || `Security Monitor (${os.hostname()})`;
    this.deviceId = config.deviceId || `security-monitor-${os.hostname()}`;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    const { broker, username, password } = this.config;

    const options: mqtt.IClientOptions = {
      will: {
        topic: this.availabilityTopic,
        payload: "offline",
        qos: 1,
        retain: true,
      },
    };

    if (username) {
      options.username = username;
    }
    if (password) {
      options.password = password;
    }

    this.client = mqtt.connect(broker, options);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      this.client!.on("connect", () => {
        clearTimeout(timeout);
        this.connected = true;
        console.log(
          `Home Assistant: Connected to ${broker}`
        );
        this.publishAvailability("online");
        resolve();
      });

      this.client!.on("error", (error: Error) => {
        console.error(`Home Assistant: Connection error - ${error.message}`);
        this.connected = false;
      });

      this.client!.on("offline", () => {
        console.log("Home Assistant: Disconnected");
        this.connected = false;
      });

      this.client!.on("reconnect", () => {
        console.log("Home Assistant: Reconnecting...");
      });
    });
  }

  /**
   * Publish availability status
   */
  private publishAvailability(status: "online" | "offline"): void {
    if (!this.client) return;

    this.client.publish(this.availabilityTopic, status, {
      qos: 1,
      retain: true,
    });
  }

  /**
   * Generate unique sensor ID
   */
  private getSensorId(monitor: MonitorConfig): string {
    return `${this.deviceId}_gpio_${monitor.gpio}`;
  }

  /**
   * Get device class based on monitor type
   */
  private getDeviceClass(monitor: MonitorConfig): string {
    const name = monitor.name.toLowerCase();
    
    if (name.includes("door")) return "door";
    if (name.includes("window")) return "window";
    if (name.includes("motion")) return "motion";
    if (name.includes("garage")) return "garage_door";
    if (name.includes("lock")) return "lock";
    if (name.includes("opening")) return "opening";
    
    // Default based on momentary setting
    return monitor.momentary ? "motion" : "opening";
  }

  /**
   * Publish discovery configuration for a monitor
   */
  async publishDiscovery(monitor: MonitorConfig, stateTopic: string): Promise<void> {
    if (!this.connected || !this.client) {
      console.warn("Home Assistant: Not connected, skipping discovery");
      return;
    }

    const sensorId = this.getSensorId(monitor);
    const deviceClass = this.getDeviceClass(monitor);
    
    // Binary sensor discovery topic
    const discoveryTopic = `${this.discoveryPrefix}/binary_sensor/${sensorId}/config`;

    const discoveryPayload = {
      name: monitor.name,
      unique_id: sensorId,
      state_topic: stateTopic,
      availability_topic: this.availabilityTopic,
      device_class: deviceClass,
      payload_on: "OPEN",
      payload_off: "CLOSED",
      value_template: "{{ value_json.state }}",
      json_attributes_topic: stateTopic,
      device: {
        identifiers: [this.deviceId],
        name: this.deviceName,
        model: "GPIO Security Monitor",
        manufacturer: "Custom",
        sw_version: "1.0.0",
      },
    };

    return new Promise((resolve, reject) => {
      this.client!.publish(
        discoveryTopic,
        JSON.stringify(discoveryPayload),
        { qos: 1, retain: true },
        (error?: Error) => {
          if (error) {
            console.error(
              `Home Assistant: Discovery failed for ${monitor.name} - ${error.message}`
            );
            reject(error);
          } else {
            console.log(
              `Home Assistant: Discovery published for ${monitor.name} (${deviceClass})`
            );
            resolve();
          }
        }
      );
    });
  }

  /**
   * Publish discovery for all monitors
   */
  async publishAllDiscoveries(
    monitors: MonitorConfig[],
    getStateTopic: (monitor: MonitorConfig) => string
  ): Promise<void> {
    for (const monitor of monitors) {
      try {
        const stateTopic = getStateTopic(monitor);
        await this.publishDiscovery(monitor, stateTopic);
      } catch (error) {
        console.error(
          `Home Assistant: Error publishing discovery for ${monitor.name}:`,
          error
        );
      }
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      // Publish offline before closing
      this.publishAvailability("offline");

      return new Promise((resolve) => {
        setTimeout(() => {
          this.client!.end(false, {}, () => {
            console.log("Home Assistant: Connection closed");
            resolve();
          });
        }, 100); // Small delay to ensure offline message is sent
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
