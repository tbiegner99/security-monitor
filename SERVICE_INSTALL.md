# Service Installation Guide

## Installing as a Linux Service

The Security Monitor can be installed as a systemd service to run automatically on boot and restart on failures.

### Prerequisites

- Linux system with systemd (Raspberry Pi OS, Ubuntu, Debian, etc.)
- Node.js installed
- Project built (`npm run build`)
- Configuration file created (`config.json`)

### Installation Steps

1. **Create your configuration:**

   ```bash
   npm run setup
   ```

2. **Install the service:**

   ```bash
   sudo ./install-service.sh
   ```

   Or using npm:

   ```bash
   npm run install-service
   ```

3. **Start the service:**

   ```bash
   sudo systemctl start security-monitor
   ```

4. **Check status:**
   ```bash
   sudo systemctl status security-monitor
   ```

### What the Installer Does

The `install-service.sh` script:

- ✅ Builds the TypeScript project
- ✅ Creates a systemd service file at `/etc/systemd/system/security-monitor.service`
- ✅ Configures the service to run as your user
- ✅ Sets up automatic restart on failure
- ✅ Enables auto-start on boot
- ✅ Configures logging to systemd journal

### Service Configuration

The service is configured with:

- **Working Directory:** Project root
- **User:** The user who ran the installer
- **Auto-restart:** Yes, with 10-second delay
- **Logging:** Via systemd journal
- **Security:** Hardened with NoNewPrivileges, PrivateTmp, and restricted filesystem access

### Managing the Service

**Start:**

```bash
sudo systemctl start security-monitor
```

**Stop:**

```bash
sudo systemctl stop security-monitor
```

**Restart:**

```bash
sudo systemctl restart security-monitor
```

**Status:**

```bash
sudo systemctl status security-monitor
```

**Enable auto-start on boot:**

```bash
sudo systemctl enable security-monitor
```

**Disable auto-start:**

```bash
sudo systemctl disable security-monitor
```

### Viewing Logs

**Live logs (follow mode):**

```bash
sudo journalctl -u security-monitor -f
```

**Recent logs (last 100 lines):**

```bash
sudo journalctl -u security-monitor -n 100
```

**Logs since last boot:**

```bash
sudo journalctl -u security-monitor -b
```

**Logs from specific date:**

```bash
sudo journalctl -u security-monitor --since "2025-11-21"
```

**Logs from last hour:**

```bash
sudo journalctl -u security-monitor --since "1 hour ago"
```

### Updating the Service

If you make changes to the code or configuration:

1. **Update code and rebuild:**

   ```bash
   git pull
   npm install
   npm run build
   ```

2. **Restart the service:**
   ```bash
   sudo systemctl restart security-monitor
   ```

If you change the service configuration itself:

1. **Reinstall the service:**

   ```bash
   sudo ./uninstall-service.sh
   sudo ./install-service.sh
   ```

2. **Or manually reload systemd:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart security-monitor
   ```

### Uninstalling the Service

To completely remove the service:

```bash
sudo ./uninstall-service.sh
```

Or using npm:

```bash
npm run uninstall-service
```

This will:

- Stop the service
- Disable auto-start
- Remove the service file
- Reload systemd

### Troubleshooting

**Service won't start:**

```bash
# Check detailed status
sudo systemctl status security-monitor

# Check recent logs
sudo journalctl -u security-monitor -n 50
```

**Permission errors:**

- Ensure the user running the service has access to GPIO
- Add user to `gpio` group: `sudo usermod -a -G gpio $USER`
- May need to log out and back in

**Service keeps restarting:**

- Check logs for errors: `sudo journalctl -u security-monitor -f`
- Verify config.json is valid
- Ensure GPIO pins are available and not in use

**Can't access GPIO:**

- Install required packages: `sudo apt-get install gpiod libgpiod-dev`
- Ensure GPIO is enabled in system configuration
- On Raspberry Pi: `sudo raspi-config` → Interface Options → Enable GPIO

### Service File Location

The service file is installed at:

```
/etc/systemd/system/security-monitor.service
```

You can manually edit it if needed:

```bash
sudo nano /etc/systemd/system/security-monitor.service
```

After editing, reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart security-monitor
```
