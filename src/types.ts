/**
 * Type definitions for the security monitor system
 */

export interface ReporterConfig {
  type: string;
  [key: string]: any;
}

export interface MqttReporterConfig extends ReporterConfig {
  type: "mqtt";
  broker: string;
  topic: string;
  username?: string;
  password?: string;
}

export interface LogReporterConfig extends ReporterConfig {
  type: "log";
}

export interface MonitorConfig {
  name: string;
  normallyHigh: boolean;
  gpio: number;
  momentary?: boolean; // If true, only report when changing from normal state
  pull?: "up" | "down"; // Pull-up/pull-down resistor configuration
  reporters: ReporterConfig[];
}

export interface HomeAssistantConfig {
  enabled: boolean;
  broker: string;
  discoveryPrefix?: string; // Default: homeassistant
  availabilityTopic?: string;
  username?: string;
  password?: string;
  deviceName?: string;
  deviceId?: string;
}

export interface SecurityMonitorConfig {
  monitors: MonitorConfig[];
  homeAssistant?: HomeAssistantConfig;
}

export interface StateChangeEvent {
  name: string;
  gpio: number;
  value: number;
  state: "OPEN" | "CLOSED";
  timestamp: Date;
}
