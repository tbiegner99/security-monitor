#!/bin/bash

# Security Monitor - Service Installation Script
# This script installs the security monitor as a systemd service on Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="security-monitor"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER=$(whoami)

echo "╔════════════════════════════════════════╗"
echo "║  Security Monitor Service Installer    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo ./install-service.sh"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js first"
    exit 1
fi

# Check if config.json exists
if [ ! -f "${PROJECT_DIR}/config.json" ]; then
    echo -e "${YELLOW}Warning: config.json not found${NC}"
    echo "You should create a configuration file before starting the service"
    echo "Run: npm run setup"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the project
echo "Building project..."
cd "${PROJECT_DIR}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Get Node.js path
NODE_PATH=$(which node)

# Create systemd service file
echo ""
echo "Creating systemd service file..."

cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=Security Monitor - GPIO Monitoring Service
After=network.target
Documentation=https://github.com/tbiegner99/security-monitor

[Service]
Type=simple
User=${USER}
WorkingDirectory=${PROJECT_DIR}
ExecStart=${NODE_PATH} ${PROJECT_DIR}/dist/index.js ${PROJECT_DIR}/config.json
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${PROJECT_DIR}

[Install]
WantedBy=multi-user.target
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to create service file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Service file created: ${SERVICE_FILE}${NC}"

# Reload systemd
echo ""
echo "Reloading systemd daemon..."
systemctl daemon-reload

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to reload systemd${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"

# Enable service
echo ""
echo "Enabling service to start on boot..."
systemctl enable ${SERVICE_NAME}

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to enable service${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Service enabled${NC}"

# Print summary
echo ""
echo "╔════════════════════════════════════════╗"
echo "║          Installation Complete         ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Service installed successfully!"
echo ""
echo "Useful commands:"
echo "  Start service:    sudo systemctl start ${SERVICE_NAME}"
echo "  Stop service:     sudo systemctl stop ${SERVICE_NAME}"
echo "  Restart service:  sudo systemctl restart ${SERVICE_NAME}"
echo "  Service status:   sudo systemctl status ${SERVICE_NAME}"
echo "  View logs:        sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Disable service:  sudo systemctl disable ${SERVICE_NAME}"
echo ""
echo "To start the service now, run:"
echo "  ${GREEN}sudo systemctl start ${SERVICE_NAME}${NC}"
echo ""
