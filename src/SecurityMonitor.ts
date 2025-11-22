import { promises as fs } from "fs";
import { GpioMonitor } from "./GpioMonitor";
import { SecurityMonitorConfig, MonitorConfig } from "./types";
import { HomeAssistantIntegration } from "./HomeAssistantIntegration";

/**
 * Main Security Monitor application
 */
export class SecurityMonitor {
  private configPath: string;
  private monitors: GpioMonitor[] = [];
  private running: boolean = false;
  private homeAssistant: HomeAssistantIntegration | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<SecurityMonitorConfig> {
    try {
      console.log(`Loading configuration from ${this.configPath}`);
      const configData = await fs.readFile(this.configPath, "utf8");
      const config: SecurityMonitorConfig = JSON.parse(configData);
      console.log(`Configuration loaded: ${JSON.stringify(config, null, 2)}`);
      return config;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load config from ${this.configPath}: ${errorMessage}`
      );
    }
  }

  /**
   * Get state topic for a monitor (used by MQTT reporters)
   */
  private getStateTopic(monitor: MonitorConfig): string {
    // Find MQTT reporter in the monitor's reporters
    const mqttReporter = monitor.reporters.find((r) => r.type === "mqtt");
    if (mqttReporter && "topic" in mqttReporter) {
      return mqttReporter.topic as string;
    }
    // Fallback topic
    return `security-monitor/gpio_${monitor.gpio}/state`;
  }

  /**
   * Initialize all monitors from configuration
   */
  async initialize(): Promise<void> {
    console.log("Security Monitor starting...");
    console.log(`Loading configuration from ${this.configPath}`);

    const config = await this.loadConfig();

    if (!config.monitors || config.monitors.length === 0) {
      throw new Error("No monitors configured");
    }

    console.log(`Found ${config.monitors.length} monitor(s) to initialize`);

    // Initialize Home Assistant integration if configured
    if (config.homeAssistant?.enabled) {
      console.log("\nInitializing Home Assistant integration...");
      this.homeAssistant = new HomeAssistantIntegration(config.homeAssistant);
      
      try {
        await this.homeAssistant.connect();
        
        // Publish discovery for all monitors
        await this.homeAssistant.publishAllDiscoveries(
          config.monitors,
          (monitor) => this.getStateTopic(monitor)
        );
      } catch (error) {
        console.error("Home Assistant integration failed:", error);
        console.log("Continuing without Home Assistant integration...");
        this.homeAssistant = null;
      }
    }

    // Create and initialize all monitors
    for (const monitorConfig of config.monitors) {
      const monitor = new GpioMonitor(monitorConfig);
      const success = await monitor.initialize();

      if (success) {
        this.monitors.push(monitor);
      }
    }

    if (this.monitors.length === 0) {
      throw new Error("No monitors were successfully initialized");
    }

    console.log(
      `\nSuccessfully initialized ${this.monitors.length} monitor(s)`
    );
    console.log("Monitoring for GPIO state changes...\n");

    // Report initial state for all monitors
    console.log("Reporting initial states...");
    for (const monitor of this.monitors) {
      await monitor.reportCurrentState();
    }
    console.log("Initial state reporting complete\n");

    this.running = true;
  }

  /**
   * Shut down all monitors
   */
  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log("\nShutting down Security Monitor...");
    this.running = false;

    // Close Home Assistant integration first
    if (this.homeAssistant) {
      await this.homeAssistant.close();
    }

    for (const monitor of this.monitors) {
      await monitor.cleanup();
    }

    console.log("Security Monitor shut down complete");
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal} signal`);
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }
}
