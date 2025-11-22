#!/usr/bin/env node

import * as readline from "readline";
import { promises as fs } from "fs";
import * as path from "path";
import { SecurityMonitorConfig, MonitorConfig, ReporterConfig } from "./types";

/**
 * Setup wizard for creating config.json
 */
class SetupWizard {
  private rl: readline.Interface;
  private config: SecurityMonitorConfig = { monitors: [] };

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Ask a question and return the answer
   */
  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Ask a yes/no question
   */
  private async yesNo(
    prompt: string,
    defaultValue: boolean = true
  ): Promise<boolean> {
    const defaultStr = defaultValue ? "Y/n" : "y/N";
    const answer = await this.question(`${prompt} (${defaultStr}): `);

    if (!answer) {
      return defaultValue;
    }

    return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
  }

  /**
   * Ask for a number
   */
  private async askNumber(
    prompt: string,
    defaultValue?: number
  ): Promise<number> {
    const defaultStr = defaultValue !== undefined ? ` [${defaultValue}]` : "";
    const answer = await this.question(`${prompt}${defaultStr}: `);

    if (!answer && defaultValue !== undefined) {
      return defaultValue;
    }

    const num = parseInt(answer, 10);
    if (isNaN(num)) {
      console.log("Invalid number, please try again.");
      return this.askNumber(prompt, defaultValue);
    }

    return num;
  }

  /**
   * Configure MQTT reporter
   */
  private async configureMqttReporter(): Promise<ReporterConfig> {
    console.log("\n--- MQTT Reporter Configuration ---");

    const broker = await this.question(
      "MQTT Broker URL (e.g., tcp://localhost:1883): "
    );
    const topic = await this.question(
      "MQTT Topic (e.g., home/security/sensor): "
    );

    const needsAuth = await this.yesNo(
      "Does the broker require authentication?",
      false
    );

    const config: any = {
      type: "mqtt",
      broker,
      topic,
    };

    if (needsAuth) {
      const username = await this.question("Username: ");
      const password = await this.question("Password: ");
      config.username = username;
      config.password = password;
    }

    return config;
  }

  /**
   * Configure reporters for a monitor
   */
  private async configureReporters(): Promise<ReporterConfig[]> {
    const reporters: ReporterConfig[] = [];

    console.log("\n--- Reporter Configuration ---");
    console.log("Available reporter types:");
    console.log("  1. Log (console logging)");
    console.log("  2. MQTT (publish to MQTT broker)");

    const addLog = await this.yesNo("Add log reporter?", true);
    if (addLog) {
      reporters.push({ type: "log" });
      console.log("✓ Log reporter added");
    }

    const addMqtt = await this.yesNo("Add MQTT reporter?", true);
    if (addMqtt) {
      const mqttConfig = await this.configureMqttReporter();
      reporters.push(mqttConfig);
      console.log("✓ MQTT reporter added");
    }

    if (reporters.length === 0) {
      console.log(
        "Warning: No reporters configured. Adding log reporter by default."
      );
      reporters.push({ type: "log" });
    }

    return reporters;
  }

  /**
   * Configure a single monitor
   */
  private async configureMonitor(): Promise<MonitorConfig> {
    console.log("\n=== New Monitor Configuration ===");

    const name = await this.question(
      'Monitor name (e.g., "Front Door", "Window Sensor"): '
    );
    const gpio = await this.askNumber("GPIO pin number (BCM numbering)");

    console.log("\nGPIO Configuration:");
    console.log(
      "  normallyHigh: true  = Pin is HIGH (3.3V) when closed, LOW when open"
    );
    console.log(
      "  normallyHigh: false = Pin is LOW (0V) when closed, HIGH when open"
    );
    const normallyHigh = await this.yesNo(
      "Is the GPIO normally high when closed?",
      true
    );

    console.log("\nMomentary Configuration:");
    console.log(
      "  momentary: true  = Only report when pin changes FROM normal state (e.g., button press)"
    );
    console.log(
      "  momentary: false = Report ALL state changes (both open and close)"
    );
    const momentary = await this.yesNo(
      "Is this a momentary switch/button?",
      false
    );

    console.log("\nPull Resistor Configuration:");
    console.log(
      "  up   = Enable internal pull-up resistor (pin pulled to 3.3V)"
    );
    console.log(
      "  down = Enable internal pull-down resistor (pin pulled to GND)"
    );
    console.log(
      "  none = No internal pull resistor (use external resistor)"
    );
    const pullAnswer = await this.question(
      "Pull resistor [up/down/none] (none): "
    );
    const pull = pullAnswer.toLowerCase() === "up" || pullAnswer.toLowerCase() === "down" 
      ? pullAnswer.toLowerCase() as "up" | "down"
      : "none";

    const reporters = await this.configureReporters();

    const config: MonitorConfig = {
      name,
      gpio,
      normallyHigh,
      momentary,
      reporters,
    };

    if (pull !== "none") {
      config.pull = pull as "up" | "down";
    }

    return config;
  }

  /**
   * Run the setup wizard
   */
  async run(): Promise<void> {
    console.log("╔════════════════════════════════════════╗");
    console.log("║  Security Monitor Configuration Setup ║");
    console.log("╚════════════════════════════════════════╝");
    console.log();
    console.log("This wizard will help you create a config.json file.");
    console.log();

    let addMore = true;

    while (addMore) {
      const monitor = await this.configureMonitor();
      this.config.monitors.push(monitor);

      console.log(`\n✓ Monitor "${monitor.name}" configured successfully!`);

      if (this.config.monitors.length > 0) {
        addMore = await this.yesNo("\nAdd another monitor?", false);
      }
    }

    // Show summary
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║         Configuration Summary          ║");
    console.log("╚════════════════════════════════════════╝");
    console.log();
    console.log(`Total monitors: ${this.config.monitors.length}`);

    for (const monitor of this.config.monitors) {
      console.log(`\n📍 ${monitor.name}`);
      console.log(`   GPIO: ${monitor.gpio}`);
      console.log(`   Normally High: ${monitor.normallyHigh}`);
      console.log(`   Momentary: ${monitor.momentary ?? false}`);
      console.log(`   Pull: ${monitor.pull ?? "none"}`);
      console.log(
        `   Reporters: ${monitor.reporters.map((r) => r.type).join(", ")}`
      );
    }

    console.log();

    // Save config
    const configPath = path.join(process.cwd(), "config.json");
    const save = await this.yesNo(`Save configuration to ${configPath}?`, true);

    if (save) {
      try {
        const configJson = JSON.stringify(this.config, null, 2);
        await fs.writeFile(configPath, configJson, "utf8");
        console.log(`\n✓ Configuration saved to ${configPath}`);
        console.log("\nYou can now run the security monitor with:");
        console.log("  npm start");
      } catch (error) {
        console.error("\n✗ Error saving configuration:", error);
        console.log("\nConfiguration JSON:");
        console.log(JSON.stringify(this.config, null, 2));
      }
    } else {
      console.log("\nConfiguration JSON:");
      console.log(JSON.stringify(this.config, null, 2));
    }

    this.rl.close();
  }
}

/**
 * Main entry point
 */
async function main() {
  const wizard = new SetupWizard();

  try {
    await wizard.run();
  } catch (error) {
    console.error("\nSetup wizard error:", error);
    process.exit(1);
  }
}

// Run the wizard
if (require.main === module) {
  main();
}

export { SetupWizard };
