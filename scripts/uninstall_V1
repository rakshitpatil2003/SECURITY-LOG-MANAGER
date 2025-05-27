#!/bin/bash

# CyberSentinel Full Uninstallation Script (original setup)
# Author: Rakshit Patil
# Purpose: Removes all files, services, tools installed by install_cybersentinel.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
error_exit() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

log "Stopping PM2 processes..."
pm2 stop all || true
pm2 delete all || true
pm2 unstartup || true
rm -rf ~/.pm2

log "Stopping and removing Docker containers..."
docker ps -aq | xargs -r docker stop

docker ps -aq | xargs -r docker rm

log "Removing Docker volumes..."
docker volume ls -q | grep cybersentinel | xargs -r docker volume rm

log "Removing project directory..."
rm -rf /opt/cybersentinel

log "Uninstalling Node.js and npm..."
apt purge -y nodejs npm || true
apt autoremove -y || true

log "Removing manual remediation system (JumpServer)..."
docker rm -f $(docker ps -aq --filter "name=jms_*") 2>/dev/null || true
rm -rf /opt/jumpserver || true
rm -f /opt/remediation_install.log

log "Removing PM2 globally..."
npm uninstall -g pm2 || true

log "Cleaning logs and binaries..."
rm -f /usr/local/bin/cybersentinel
rm -f /usr/local/bin/cybersentinel-update
rm -f /var/log/cybersentinel-install.log

log "CyberSentinel uninstalled successfully."
echo -e "${GREEN}Your system is clean. You can now reinstall CyberSentinel from GitHub.${NC}"
exit 0
