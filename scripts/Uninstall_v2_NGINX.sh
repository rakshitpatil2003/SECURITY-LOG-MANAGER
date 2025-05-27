#!/bin/bash

# CyberSentinel SIEM Complete Uninstallation Script
# This script removes ALL CyberSentinel components and dependencies
# Repository: https://github.com/rakshitpatil2003/CyberSentinel_SIEM_Installation

# Text formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Uninstallation directories
INSTALL_DIR="/opt/cybersentinel"
DOCKER_COMPOSE_DIR="$INSTALL_DIR/infrastructure"
LOG_FILE="/var/log/cybersentinel-uninstall.log"

# Function to log with colors
log() {
    echo -e "${BLUE}[UNINSTALL]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [UNINSTALL] $1" >> "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

header() {
    echo -e "${PURPLE}[CYBERSENTINEL REMOVAL]${NC} $1"
}

# Function to show uninstallation banner
show_uninstall_banner() {
    clear
    echo -e "${RED}"
    cat << "EOF"
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║             CYBERSENTINEL SIEM UNINSTALLATION                ║
    ║                                                               ║
    ║                    ⚠️  WARNING ⚠️                             ║
    ║                                                               ║
    ║        This will COMPLETELY REMOVE all CyberSentinel         ║
    ║        components, data, and configurations!                  ║
    ║                                                               ║
    ║                   THIS ACTION IS IRREVERSIBLE                 ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root. Please use 'sudo' or run as root user."
        exit 1
    fi
}

# Function to stop all CyberSentinel services
stop_cybersentinel_services() {
    header "Stopping CyberSentinel Services..."
    
    # Stop systemd services
    local services=("cybersentinel-frontend" "cybersentinel-backend" "cybersentinel-collector")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            log "Stopping $service..."
            systemctl stop "$service" 2>/dev/null || warning "Failed to stop $service"
        fi
    done
    
    # Stop Docker containers
    if command -v docker >/dev/null 2>&1; then
        log "Stopping CyberSentinel Docker containers..."
        cd "$DOCKER_COMPOSE_DIR" 2>/dev/null && docker-compose down -v 2>/dev/null || warning "Failed to stop Docker containers"
        
        # Stop individual containers if they exist
        local containers=(
            "cybersentinel-endpoint-processor"
            "cybersentinel-queue-coordinator"
            "cybersentinel-database"
            "cybersentinel-database-dashboard"
            "cybersentinel-secret-vault"
        )
        
        for container in "${containers[@]}"; do
            if docker ps -q -f name="$container" | grep -q .; then
                log "Stopping container: $container"
                docker stop "$container" 2>/dev/null || warning "Failed to stop $container"
                docker rm "$container" 2>/dev/null || warning "Failed to remove $container"
            fi
        done
    fi
    
    # Stop JumpServer containers
    local jumpserver_containers=$(docker ps -q -f name="jms_" 2>/dev/null)
    if [ ! -z "$jumpserver_containers" ]; then
        log "Stopping JumpServer containers..."
        docker stop $jumpserver_containers 2>/dev/null || warning "Failed to stop JumpServer containers"
        docker rm $jumpserver_containers 2>/dev/null || warning "Failed to remove JumpServer containers"
    fi
    
    success "All services stopped"
}

# Function to remove systemd services
remove_systemd_services() {
    header "Removing System Services..."
    
    local services=("cybersentinel-frontend" "cybersentinel-backend" "cybersentinel-collector")
    
    for service in "${services[@]}"; do
        if [ -f "/etc/systemd/system/$service.service" ]; then
            log "Removing $service service..."
            systemctl disable "$service" 2>/dev/null || warning "Failed to disable $service"
            rm -f "/etc/systemd/system/$service.service"
        fi
    done
    
    # Reload systemd
    systemctl daemon-reload 2>/dev/null
    
    success "System services removed"
}

# Function to remove Docker components
remove_docker_components() {
    header "Removing Docker Components..."
    
    if command -v docker >/dev/null 2>&1; then
        # Remove CyberSentinel Docker volumes
        log "Removing Docker volumes..."
        docker volume rm cybersentinel-db-data 2>/dev/null || warning "Failed to remove cybersentinel-db-data volume"
        
        # Remove CyberSentinel Docker network
        log "Removing Docker networks..."
        docker network rm cybersentinel-network 2>/dev/null || warning "Failed to remove cybersentinel-network"
        
        # Remove CyberSentinel Docker images
        log "Removing Docker images..."
        local images=(
            "confluentinc/cp-zookeeper:7.3.0"
            "confluentinc/cp-kafka:7.3.0"
            "opensearchproject/opensearch:2.8.0"
            "opensearchproject/opensearch-dashboards:2.8.0"
            "hashicorp/vault:1.12.3"
        )
        
        for image in "${images[@]}"; do
            if docker images -q "$image" | grep -q .; then
                log "Removing image: $image"
                docker rmi "$image" 2>/dev/null || warning "Failed to remove $image"
            fi
        done
        
        # Remove JumpServer images and volumes
        log "Removing JumpServer components..."
        docker images | grep jumpserver | awk '{print $3}' | xargs -r docker rmi 2>/dev/null || warning "Failed to remove JumpServer images"
        docker volume ls | grep jms | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || warning "Failed to remove JumpServer volumes"
    fi
    
    success "Docker components removed"
}

# Function to remove Nginx configuration
remove_nginx_config() {
    header "Removing Nginx Configuration..."
    
    if command -v nginx >/dev/null 2>&1; then
        log "Removing CyberSentinel Nginx configuration..."
        
        # Remove site configuration
        rm -f /etc/nginx/sites-available/cybersentinel
        rm -f /etc/nginx/sites-enabled/cybersentinel
        
        # Restore default site if it was removed
        if [ -f /etc/nginx/sites-available/default ] && [ ! -f /etc/nginx/sites-enabled/default ]; then
            ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
        fi
        
        # Test and reload Nginx
        nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || warning "Nginx configuration test failed"
    fi
    
    success "Nginx configuration removed"
}

# Function to remove application files
remove_application_files() {
    header "Removing Application Files..."
    
    # Remove main installation directory
    if [ -d "$INSTALL_DIR" ]; then
        log "Removing CyberSentinel installation directory..."
        rm -rf "$INSTALL_DIR"
    fi
    
    # Remove JumpServer installation
    if [ -d "/opt/jumpserver" ]; then
        log "Removing JumpServer installation..."
        rm -rf /opt/jumpserver
    fi
    
    # Remove service scripts
    log "Removing service management scripts..."
    rm -f /usr/local/bin/cybersentinel
    rm -f /usr/local/bin/cybersentinel-update
    
    success "Application files removed"
}

# Function to remove user and permissions
remove_user_permissions() {
    header "Removing Service User..."
    
    # Remove cybersentinel user
    if id "cybersentinel" >/dev/null 2>&1; then
        log "Removing cybersentinel user..."
        userdel cybersentinel 2>/dev/null || warning "Failed to remove cybersentinel user"
    fi
    
    success "Service user removed"
}

# Function to remove log files
remove_log_files() {
    header "Removing Log Files..."
    
    # Remove CyberSentinel log files
    log "Removing application log files..."
    rm -rf /var/log/cybersentinel*
    
    success "Log files removed"
}

# Function to clean up remaining Docker resources
cleanup_docker() {
    header "Cleaning Up Docker Resources..."
    
    if command -v docker >/dev/null 2>&1; then
        log "Cleaning up unused Docker resources..."
        docker system prune -af --volumes 2>/dev/null || warning "Failed to clean Docker resources"
    fi
    
    success "Docker cleanup completed"
}

# Function to remove packages (optional)
remove_packages() {
    header "Package Removal Options..."
    
    echo -e "${YELLOW}Do you want to remove the following packages?${NC}"
    echo "This will remove packages that might be used by other applications:"
    echo "  - Docker and Docker Compose"
    echo "  - Node.js and NPM"
    echo "  - Nginx"
    echo "  - Git"
    echo ""
    
    read -p "Remove packages? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Removing packages..."
        
        # Stop services first
        systemctl stop docker nginx 2>/dev/null || true
        
        # Remove packages
        apt remove --purge -y docker-ce docker-ce-cli containerd.io docker-compose 2>/dev/null || warning "Failed to remove Docker"
        apt remove --purge -y nodejs npm 2>/dev/null || warning "Failed to remove Node.js"
        apt remove --purge -y nginx 2>/dev/null || warning "Failed to remove Nginx"
        apt remove --purge -y git 2>/dev/null || warning "Failed to remove Git"
        
        # Clean up package cache
        apt autoremove -y 2>/dev/null || warning "Failed to autoremove packages"
        apt autoclean 2>/dev/null || warning "Failed to clean package cache"
        
        success "Packages removed"
    else
        log "Packages kept (skipped removal)"
    fi
}

# Function to show completion summary
show_completion_summary() {
    clear
    echo -e "${GREEN}"
    cat << "EOF"
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║                UNINSTALLATION COMPLETED!                     ║
    ║                                                               ║
    ║            CyberSentinel SIEM has been completely            ║
    ║              removed from your system                        ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${BLUE}=== Removal Summary ===${NC}"
    echo -e "${GREEN}✓${NC} CyberSentinel services stopped and removed"
    echo -e "${GREEN}✓${NC} Docker containers and images removed"
    echo -e "${GREEN}✓${NC} Application files and directories removed"
    echo -e "${GREEN}✓${NC} System services and configurations removed"
    echo -e "${GREEN}✓${NC} Service user and permissions removed"
    echo -e "${GREEN}✓${NC} Log files cleaned up"
    echo ""
    
    echo -e "${YELLOW}=== Notes ===${NC}"
    echo -e "• Docker, Node.js, and Nginx may still be installed (if you chose to keep them)"
    echo -e "• Check uninstallation logs at: ${GREEN}$LOG_FILE${NC}"
    echo -e "• System reboot recommended to ensure complete cleanup"
    echo ""
    
    success "CyberSentinel SIEM Platform completely removed from your system!"
}

# Main uninstallation function
main() {
    # Setup logging
    touch "$LOG_FILE"
    echo "=== CyberSentinel Uninstallation Started: $(date) ===" >> "$LOG_FILE"
    
    show_uninstall_banner
    check_root
    
    echo -e "${RED}⚠️  This will completely remove CyberSentinel SIEM Platform ⚠️${NC}"
    echo -e "${YELLOW}All data, configurations, and components will be permanently deleted!${NC}"
    echo ""
    echo -e "The following will be removed:"
    echo -e "  • All CyberSentinel services and applications"
    echo -e "  • Docker containers, images, and volumes"
    echo -e "  • Database data and configurations"
    echo -e "  • Manual Remediation System (JumpServer)"
    echo -e "  • Nginx configurations"
    echo -e "  • Service management scripts"
    echo -e "  • All log files and data"
    echo ""
    
    read -p "Are you absolutely sure you want to continue? (type 'YES' to confirm): " confirmation
    
    if [ "$confirmation" != "YES" ]; then
        echo -e "${BLUE}Uninstallation cancelled.${NC}"
        exit 0
    fi
    
    echo ""
    log "Starting CyberSentinel SIEM Platform removal..."
    
    # Uninstallation steps
    stop_cybersentinel_services
    remove_systemd_services
    remove_docker_components
    remove_nginx_config
    remove_application_files
    remove_user_permissions
    remove_log_files
    cleanup_docker
    remove_packages
    
    show_completion_summary
}

# Trap to ensure cleanup on exit
trap 'echo -e "\n${YELLOW}Uninstallation interrupted.${NC}"; exit 1' INT TERM

# Run main function
main "$@"