import { Gpio } from "onoff";
import { ReporterFactory } from "./reporter/ReporterFactory";
import { Reporter } from "./reporter/Reporter";
import { MonitorConfig, StateChangeEvent } from "./types";

/**
 * Monitor for a single GPIO pin
 */
export class GpioMonitor {
  private config: MonitorConfig;
  private name: string;
  private gpioPin: number;
  private normallyHigh: boolean;
  private momentary: boolean;
  private gpio: Gpio | null = null;
  private reporters: Reporter[] = [];
  private lastValue: number | null = null;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.name = config.name;
    this.gpioPin = config.gpio;
    this.normallyHigh = config.normallyHigh;
    this.momentary = config.momentary ?? false;
  }

  /**
   * Initialize the GPIO pin and set up watch
   */
  async initialize(): Promise<boolean> {
    try {
      // Set up GPIO pin as input with both edge detection
      this.gpio = new Gpio(this.gpioPin, "in", "both", {
        activeLow: false,
        reconfigureDirection: false,
      });

      // Create reporters
      this.reporters = ReporterFactory.createReporters(this.config.reporters);

      // Read initial state
      this.lastValue = await this.readValue();
      const modeStr = this.momentary ? " (momentary mode)" : "";
      console.log(
        `Initialized ${this.name} on GPIO ${
          this.gpioPin
        }, initial state: ${this.getState(this.lastValue)}${modeStr}`
      );

      // Set up watch for changes
      this.gpio.watch((err: Error | null | undefined, value: number) => {
        if (err) {
          console.error(`Error watching GPIO ${this.gpioPin}:`, err);
          return;
        }
        this.handleChange(value);
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to initialize ${this.name} on GPIO ${this.gpioPin}:`,
        errorMessage
      );
      return false;
    }
  }

  /**
   * Read the current GPIO value
   */
  private async readValue(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.gpio!.read((err: Error | null | undefined, value: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Get state description based on value and normallyHigh setting
   */
  private getState(value: number): "OPEN" | "CLOSED" {
    if (this.normallyHigh) {
      // normallyHigh: true means high = CLOSED, low = OPEN
      return value === 1 ? "CLOSED" : "OPEN";
    } else {
      // normallyHigh: false means low = CLOSED, high = OPEN
      return value === 0 ? "CLOSED" : "OPEN";
    }
  }

  /**
   * Check if this value change should be reported based on momentary setting
   */
  private shouldReport(value: number): boolean {
    // If momentary is false, report all changes
    if (!this.momentary) {
      return true;
    }

    // If momentary is true, only report when changing FROM normal state TO abnormal state
    if (this.normallyHigh) {
      // Normal state is HIGH (1), abnormal is LOW (0)
      // Only report when value is LOW (abnormal state)
      return value === 0;
    } else {
      // Normal state is LOW (0), abnormal is HIGH (1)
      // Only report when value is HIGH (abnormal state)
      return value === 1;
    }
  }

  /**
   * Handle GPIO value change
   */
  private async handleChange(value: number): Promise<void> {
    if (value === this.lastValue) {
      return; // No actual change
    }

    this.lastValue = value;
    const state = this.getState(value);

    // Check if we should report this change
    if (!this.shouldReport(value)) {
      console.log(
        `${this.name}: GPIO ${this.gpioPin} returned to normal state (value: ${value}) - not reporting (momentary mode)`
      );
      return;
    }

    const event: StateChangeEvent = {
      name: this.name,
      gpio: this.gpioPin,
      value: value,
      state: state,
      timestamp: new Date(),
    };

    console.log(`\n*** State Change Detected ***`);
    console.log(`Monitor: ${this.name}`);
    console.log(`GPIO: ${this.gpioPin}`);
    console.log(`New State: ${state} (value: ${value})`);
    console.log(`Time: ${event.timestamp.toISOString()}`);
    console.log("***************************\n");

    // Report to all configured reporters
    for (const reporter of this.reporters) {
      try {
        await reporter.report(event);
      } catch (error) {
        console.error(
          `Error reporting to ${reporter.constructor.name}:`,
          error
        );
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log(`Cleaning up ${this.name}...`);

    // Close all reporters
    for (const reporter of this.reporters) {
      try {
        await reporter.close();
      } catch (error) {
        console.error(`Error closing reporter:`, error);
      }
    }

    // Unexport GPIO
    if (this.gpio) {
      try {
        this.gpio.unexport();
      } catch (error) {
        console.error(`Error unexporting GPIO ${this.gpioPin}:`, error);
      }
    }
  }
}
