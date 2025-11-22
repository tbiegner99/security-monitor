import { Reporter } from "./Reporter";
import { LogReporterConfig, StateChangeEvent } from "../types";

/**
 * Log Reporter - logs events to console
 */
export class LogReporter extends Reporter {
  constructor(config: LogReporterConfig) {
    super(config);
  }

  async report(event: StateChangeEvent): Promise<void> {
    const timestamp = event.timestamp.toISOString();
    console.log(
      `[${timestamp}] ${event.name} (GPIO ${event.gpio}): ${event.state} (value: ${event.value})`
    );
  }
}
