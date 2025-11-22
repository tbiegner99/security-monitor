#!/bin/bash

# Security Monitor - Service Uninstaller
# This script removes the security monitor systemd service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVICE_NAME="security-monitor"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "╔════════════════════════════════════════╗"
echo "║  Security Monitor Service Uninstaller  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo ./uninstall-service.sh"
    exit 1
fi

# Check if service exists
if [ ! -f "${SERVICE_FILE}" ]; then
    echo -e "${YELLOW}Service is not installed${NC}"
    exit 0
fi

# Stop the service if running
echo "Stopping service..."
systemctl stop ${SERVICE_NAME} 2>/dev/null || true
echo -e "${GREEN}✓ Service stopped${NC}"

# Disable the service
echo "Disabling service..."
systemctl disable ${SERVICE_NAME} 2>/dev/null || true
echo -e "${GREEN}✓ Service disabled${NC}"

# Remove service file
echo "Removing service file..."
rm -f "${SERVICE_FILE}"
echo -e "${GREEN}✓ Service file removed${NC}"

# Reload systemd
echo "Reloading systemd daemon..."
systemctl daemon-reload
echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"

echo ""
echo -e "${GREEN}Service uninstalled successfully!${NC}"
echo ""
