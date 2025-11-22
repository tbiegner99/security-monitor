import { Reporter } from "./Reporter";
import { LogReporter } from "./LogReporter";
import { MqttReporter } from "./MqttReporter";
import {
  ReporterConfig,
  LogReporterConfig,
  MqttReporterConfig,
} from "../types";

/**
 * Factory for creating reporters based on configuration
 */
export class ReporterFactory {
  static createReporter(config: ReporterConfig): Reporter {
    switch (config.type) {
      case "log":
        return new LogReporter(config as LogReporterConfig);
      case "mqtt":
        return new MqttReporter(config as MqttReporterConfig);
      default:
        throw new Error(`Unknown reporter type: ${config.type}`);
    }
  }

  static createReporters(reporterConfigs: ReporterConfig[]): Reporter[] {
    return reporterConfigs.map((config) =>
      ReporterFactory.createReporter(config)
    );
  }
}
