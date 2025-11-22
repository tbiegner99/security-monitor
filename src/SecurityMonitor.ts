import { promises as fs } from "fs";
import { GpioMonitor } from "./GpioMonitor";
import { SecurityMonitorConfig } from "./types";

/**
 * Main Security Monitor application
 */
export class SecurityMonitor {
  private configPath: string;
  private monitors: GpioMonitor[] = [];
  private running: boolean = false;

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
