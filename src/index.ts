#!/usr/bin/env node

import * as path from "path";
import { SecurityMonitor } from "./SecurityMonitor";

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const configPath = process.argv[2] || path.join(__dirname, "../config.json");

  const monitor = new SecurityMonitor(configPath);

  // Set up graceful shutdown
  monitor.setupShutdownHandlers();

  try {
    await monitor.initialize();

    // Keep the process running
    console.log("Press Ctrl+C to stop monitoring");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Fatal error:", errorMessage);
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
