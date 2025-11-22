import { ReporterConfig, StateChangeEvent } from "../types";

/**
 * Base Reporter class
 */
export abstract class Reporter {
  protected config: ReporterConfig;

  constructor(config: ReporterConfig) {
    this.config = config;
  }

  /**
   * Report a state change
   * @param event - The state change event
   */
  abstract report(event: StateChangeEvent): Promise<void>;

  /**
   * Close and cleanup reporter resources
   */
  async close(): Promise<void> {
    // Override if cleanup is needed
  }
}
