import { Reporter } from "./Reporter";
import { MqttReporterConfig, StateChangeEvent } from "../types";
import * as mqtt from "mqtt";

/**
 * MQTT Reporter - publishes events to MQTT broker
 */
export class MqttReporter extends Reporter {
  private client: mqtt.MqttClient | null = null;
  private connected: boolean = false;
  protected config: MqttReporterConfig;

  constructor(config: MqttReporterConfig) {
    super(config);
    this.config = config;
    this.connectToMqtt();
  }

  private connectToMqtt(): void {
    const { broker, username, password } = this.config;

    const options: mqtt.IClientOptions = {};
    if (username) {
      options.username = username;
    }
    if (password) {
      options.password = password;
    }

    this.client = mqtt.connect(broker, options);

    this.client.on("connect", () => {
      this.connected = true;
      console.log(`MQTT: Connected to ${broker}`);
    });

    this.client.on("error", (error: Error) => {
      console.error(`MQTT: Connection error - ${error.message}`);
      this.connected = false;
    });

    this.client.on("offline", () => {
      console.log("MQTT: Disconnected");
      this.connected = false;
    });
  }

  async report(event: StateChangeEvent): Promise<void> {
    if (!this.connected || !this.client) {
      console.warn("MQTT: Not connected, skipping report");
      return;
    }

    const payload = JSON.stringify({
      name: event.name,
      gpio: event.gpio,
      value: event.value,
      state: event.state,
      timestamp: event.timestamp.toISOString(),
    });

    return new Promise((resolve, reject) => {
      this.client!.publish(
        this.config.topic,
        payload,
        { qos: 1 },
        (error?: Error) => {
          if (error) {
            console.error(`MQTT: Publish error - ${error.message}`);
            reject(error);
          } else {
            console.log(`MQTT: Published to ${this.config.topic}`);
            resolve();
          }
        }
      );
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          console.log("MQTT: Connection closed");
          resolve();
        });
      });
    }
  }
}
