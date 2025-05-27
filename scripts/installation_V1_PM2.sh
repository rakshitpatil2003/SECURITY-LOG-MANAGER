#!/bin/bash

# CyberSentinel SIEM Installation Script
# Professional Installation Suite for Complete SIEM Solution
# Repository: https://github.com/rakshitpatil2003/CyberSentinel_SIEM_Installation

# Text formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
IP_ADDRESS=""
INSTALL_DIR="/opt/cybersentinel"
PROJECT_DIR="$INSTALL_DIR/SECURITY-LOG-MANAGER"
DOCKER_COMPOSE_DIR="$INSTALL_DIR/infrastructure"

# Function to show animated loading
show_loading() {
    local pid=$1
    local message=$2
    local spin='-\|/'
    local i=0
    
    while kill -0 $pid 2>/dev/null; do
        printf "\r[%c] %s" "${spin:i++%4:1}" "$message"
        sleep 0.1
    done
    printf "\r✓ %s\n" "$message"
}

# Function to log with colors
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "${PURPLE}[CYBERSENTINEL]${NC} $1"
}

# Function to detect IP address
get_ip_address() {
    IP=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1)
    
    if [ -z "$IP" ]; then
        IP=$(hostname -I | awk '{print $1}')
    fi
    
    if [ -z "$IP" ]; then
        IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
    fi
    
    if [ -z "$IP" ]; then
        warning "Could not detect IP automatically. Please enter manually."
        read -p "Enter your server IP address: " IP
    fi
    
    echo "$IP"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_system_requirements() {
    header "Checking System Requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root. Please use 'sudo' or run as root user."
    fi
    
    # Check available memory (minimum 4GB)
    local mem_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$mem_gb" -lt 4 ]; then
        warning "System has less than 4GB RAM. CyberSentinel may experience performance issues."
    fi
    
    # Check available disk space (minimum 20GB)
    local disk_gb=$(df / | awk 'NR==2{print int($4/1024/1024)}')
    if [ "$disk_gb" -lt 20 ]; then
        warning "Less than 20GB disk space available. Consider freeing up space."
    fi
    
    success "System requirements check completed"
}

# Function to create banner
show_banner() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║        ████████╗██╗   ██╗██████╗ ███████╗██████╗              ║
    ║        ██╔═════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗             ║
    ║        ██║       ╚████╔╝ ██████╔╝█████╗  ██████╔╝             ║
    ║        ██║        ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗             ║
    ║        ████████╗   ██║   ██████╔╝███████╗██║  ██║             ║
    ║        ╚═══════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝             ║
    ║                                                               ║
    ║              ███████╗███████╗███╗   ██╗████████╗              ║
    ║              ██╔════╝██╔════╝████╗  ██║╚══██╔══╝              ║
    ║              ███████╗█████╗  ██╔██╗ ██║   ██║                 ║
    ║              ╚════██║██╔══╝  ██║╚██╗██║   ██║                 ║
    ║              ███████║███████╗██║ ╚████║   ██║                 ║
    ║              ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝                 ║
    ║                                                               ║
    ║                    SIEM INSTALLATION SUITE                   ║
    ║                  Professional Security Platform              ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}Welcome to CyberSentinel SIEM Installation Suite${NC}"
    echo -e "${BLUE}Automated deployment of enterprise-grade security infrastructure${NC}"
    echo ""
}

# Install Docker and Docker Compose
install_docker() {
    log "Starting Docker installation..."
    
    # Check if Docker is already installed
    if command_exists docker && command_exists docker-compose; then
        success "Docker and Docker Compose are already installed!"
        return
    fi
    
    # Update package lists
    log "Updating package lists..."
    apt update || error "Failed to update package lists."
    
    # Install prerequisites
    log "Installing prerequisites..."
    apt install -y apt-transport-https ca-certificates curl software-properties-common || error "Failed to install prerequisites."
    
    # Add Docker's official GPG key
    log "Adding Docker's GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - || error "Failed to add Docker's GPG key."
    
    # Add Docker repository
    log "Adding Docker repository..."
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" || error "Failed to add Docker repository."
    
    # Install Docker
    log "Installing Docker..."
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io || error "Failed to install Docker."
    
    # Install Docker Compose
    log "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || error "Failed to download Docker Compose."
    chmod +x /usr/local/bin/docker-compose || error "Failed to set permissions for Docker Compose."
    
    success "Docker and Docker Compose have been successfully installed!"
}

# Function to install Node.js
install_nodejs() {
    header "Installing Application Runtime Environment..."
    
    if command_exists node && [[ $(node -v) == v22* ]]; then
        success "Application runtime already installed"
        return
    fi
    
    # Install Node.js 22.x
    log "Configuring application runtime repository..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
    
    log "Installing application runtime..."
    apt install -y -qq nodejs
    
    # Install PM2 globally
    log "Installing process manager..."
    npm install -g pm2 >/dev/null 2>&1
    
    success "Application runtime environment installed successfully"
}

# Function to setup infrastructure
setup_infrastructure() {
    header "Deploying Core Infrastructure Components..."
    
    # Create directories
    mkdir -p "$DOCKER_COMPOSE_DIR" || error "Failed to create infrastructure directory"
    cd "$DOCKER_COMPOSE_DIR" || error "Failed to access infrastructure directory"
    
    # Create docker-compose.yml
    log "Configuring infrastructure components..."
    cat > docker-compose.yml << EOF
version: '3.8'
services:
  # CyberSentinel Endpoint Processor - Message Queue
  cybersentinel-queue-coordinator:
    image: confluentinc/cp-zookeeper:7.3.0
    container_name: cybersentinel-queue-coordinator
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    networks:
      - cybersentinel-network
    restart: unless-stopped

  cybersentinel-endpoint-processor:
    image: confluentinc/cp-kafka:7.3.0
    container_name: cybersentinel-endpoint-processor
    depends_on:
      - cybersentinel-queue-coordinator
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: cybersentinel-queue-coordinator:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://cybersentinel-endpoint-processor:9092,PLAINTEXT_HOST://$IP_ADDRESS:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    networks:
      - cybersentinel-network
    restart: unless-stopped

  # CyberSentinel Database - Log Storage
  cybersentinel-database:
    image: opensearchproject/opensearch:2.8.0
    container_name: cybersentinel-database
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
      - DISABLE_SECURITY_PLUGIN=true
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - cybersentinel-db-data:/usr/share/opensearch/data
    ports:
      - "9200:9200"
      - "9300:9300"
    networks:
      - cybersentinel-network
    restart: unless-stopped

  # CyberSentinel Database Dashboard
  cybersentinel-database-dashboard:
    image: opensearchproject/opensearch-dashboards:2.8.0
    container_name: cybersentinel-database-dashboard
    ports:
      - "5601:5601"
    environment:
      OPENSEARCH_HOSTS: '["http://cybersentinel-database:9200"]'
      DISABLE_SECURITY_DASHBOARDS_PLUGIN: "true"
    depends_on:
      - cybersentinel-database
    networks:
      - cybersentinel-network
    restart: unless-stopped

  # CyberSentinel Secret Key Vault
  cybersentinel-secret-vault:
    image: hashicorp/vault:1.12.3
    container_name: cybersentinel-secret-vault
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: cybersentinel-vault-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    cap_add:
      - IPC_LOCK
    command: server -dev
    networks:
      - cybersentinel-network
    restart: unless-stopped

volumes:
  cybersentinel-db-data:

networks:
  cybersentinel-network:
    driver: bridge
EOF
    
    success "Infrastructure configuration completed"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    header "Initializing Core Infrastructure..."
    
    cd "$DOCKER_COMPOSE_DIR" || error "Infrastructure directory not found"
    
    log "Starting infrastructure deployment..."
    docker-compose up -d >/dev/null 2>&1 || error "Failed to deploy infrastructure"
    
    # Wait for services to be ready
    log "Waiting for infrastructure components to initialize..."
    sleep 30
    
    # Verify services
    log "Verifying infrastructure deployment..."
    local failed_services=()
    
    if ! docker ps | grep -q cybersentinel-endpoint-processor; then
        failed_services+=("Endpoint Processor")
    fi
    
    if ! docker ps | grep -q cybersentinel-database; then
        failed_services+=("Database")
    fi
    
    if ! docker ps | grep -q cybersentinel-secret-vault; then
        failed_services+=("Secret Vault")
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Failed to start: ${failed_services[*]}"
    fi
    
    success "Core infrastructure deployed successfully"
}

# Function to install CyberSentinel Manual Remediation (JumpServer)
install_manual_remediation() {
    header "Installing CyberSentinel Manual Remediation System..."
    
    cd /opt || error "Failed to navigate to installation directory"
    
    # Install git if not present
    if ! command_exists git; then
        log "Installing version control system..."
        apt install -y -qq git
    fi
    
    log "Downloading remediation system components..."
    
    # Download and run JumpServer installation
    (
        curl -sSL https://github.com/jumpserver/jumpserver/releases/download/v4.0.0/quick_start.sh | bash
    ) > /opt/remediation_install.log 2>&1 &
    
    local install_pid=$!
    show_loading $install_pid "Installing Manual Remediation System"
    
    wait $install_pid
    
    if [ $? -ne 0 ]; then
        error "Failed to install Manual Remediation System. Check logs at /opt/remediation_install.log"
    fi
    
    # Wait for JumpServer to be ready
    log "Waiting for remediation system to initialize..."
    sleep 60
    
    success "CyberSentinel Manual Remediation System installed successfully"
}

# Function to customize JumpServer
customize_remediation_system() {
    header "Customizing Manual Remediation Interface..."
    
    # Wait for containers to be ready
    log "Waiting for remediation system containers..."
    for i in {1..30}; do
        if docker ps | grep -q "jms_core"; then
            break
        fi
        sleep 5
    done
    
    if ! docker ps | grep -q "jms_core"; then
        warning "Remediation system container not found. Skipping customization."
        return
    fi
    
    # Download logo files from GitHub
    log "Downloading custom interface assets..."
    local logo_dir="/tmp/cybersentinel_logos"
    mkdir -p "$logo_dir"
    cd "$logo_dir"
    
    local github_repo="https://raw.githubusercontent.com/rakshitpatil2003/CyberSentinel_SIEM_Installation/main/logos"
    
    curl -s -o 125_x_18.png "$github_repo/125_x_18.png" 2>/dev/null
    curl -s -o 30_x_40.png "$github_repo/30_x_40.png" 2>/dev/null
    curl -s -o front_logo.png "$github_repo/front_logo.png" 2>/dev/null
    curl -s -o favicon_logo.ico "$github_repo/favicon_logo.ico" 2>/dev/null
    
    # Apply customizations
    log "Applying interface customizations..."
    docker cp 125_x_18.png jms_core:/opt/jumpserver/apps/static/img/logo_text_white.png 2>/dev/null
    docker cp 30_x_40.png jms_core:/opt/jumpserver/apps/static/img/logo.png 2>/dev/null
    docker cp front_logo.png jms_core:/opt/jumpserver/apps/static/img/login_image.png 2>/dev/null
    docker cp favicon_logo.ico jms_core:/opt/jumpserver/apps/static/img/facio.ico 2>/dev/null
    
    # Restart containers to apply changes
    log "Restarting remediation system..."
    docker restart jms_core jms_lion jms_web jms_chen jms_koko jms_celery jms_redis >/dev/null 2>&1
    
    # Cleanup
    rm -rf "$logo_dir"
    
    success "Manual Remediation System customized successfully"
}

# Function to clone and setup the main project
setup_main_project() {
    header "Deploying Main CyberSentinel Application..."
    
    cd "$INSTALL_DIR" || error "Installation directory not found"
    
    log "Downloading CyberSentinel SIEM Platform..."
    
    # Clone the project
    if [ -d "SECURITY-LOG-MANAGER" ]; then
        rm -rf SECURITY-LOG-MANAGER
    fi
    
    git clone https://github.com/rakshitpatil2003/SECURITY-LOG-MANAGER.git >/dev/null 2>&1 || error "Failed to download CyberSentinel platform"
    
    cd SECURITY-LOG-MANAGER || error "Failed to access project directory"
    
    # Install dependencies for all components
    log "Installing backend dependencies..."
    cd backend && npm install --force >/dev/null 2>&1 || error "Failed to install backend dependencies"
    
    log "Installing frontend dependencies..."
    cd ../frontend && npm install --force >/dev/null 2>&1 || error "Failed to install frontend dependencies"
    
    log "Installing script dependencies..."
    cd ../scripts && npm install --force >/dev/null 2>&1 || error "Failed to install script dependencies"
    
    cd ..
    success "CyberSentinel application deployed successfully"
}

# Function to collect Graylog configuration
collect_graylog_config() {
    header "Configuring CyberSentinel Container Integration..."
    
    echo -e "${YELLOW}Please provide the following CyberSentinel Container details:${NC}"
    echo ""
    
    read -p "CyberSentinel Container HOST (IP address): " GRAYLOG_HOST
    read -p "CyberSentinel Container PORT (default 9000): " GRAYLOG_PORT
    read -p "CyberSentinel Container USERNAME: " GRAYLOG_USERNAME
    read -s -p "CyberSentinel Container PASSWORD: " GRAYLOG_PASSWORD
    echo ""
    read -p "CyberSentinel Container STREAM_ID: " GRAYLOG_STREAM_ID
    
    # Set defaults
    GRAYLOG_PORT=${GRAYLOG_PORT:-9000}
    
    success "Container integration configured"
}

# Function to update environment files
update_environment_files() {
    header "Configuring Application Environment..."
    
    # Update backend .env
    log "Configuring backend environment..."
    cat > "$PROJECT_DIR/backend/.env" << EOF
# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=production

# CyberSentinel Database Configuration
OPENSEARCH_HOST=http://$IP_ADDRESS:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# CyberSentinel Endpoint Processor Configuration
KAFKA_BOOTSTRAP_SERVERS=$IP_ADDRESS:29092
KAFKA_CLIENT_ID=cybersentinel-siem
KAFKA_CONSUMER_GROUP_ID=cybersentinel-processor-group
KAFKA_LOG_TOPIC=security-logs

# CyberSentinel Container Configuration
GRAYLOG_HOST=$GRAYLOG_HOST
GRAYLOG_PORT=$GRAYLOG_PORT
GRAYLOG_USERNAME=$GRAYLOG_USERNAME
GRAYLOG_PASSWORD=$GRAYLOG_PASSWORD
GRAYLOG_STREAM_ID=$GRAYLOG_STREAM_ID

# CyberSentinel Manual Remediation Configuration
JUMP_SERVER_HOST=$IP_ADDRESS
JUMP_SERVER_PORT=80
JUMP_SERVER_USER=admin
JUMP_SERVER_PASSWORD=ChangeMe

# CyberSentinel Secret Vault Configuration
VAULT_ADDR=http://$IP_ADDRESS:8200
VAULT_TOKEN=cybersentinel-vault-token

# JWT Secret for Authentication
JWT_SECRET=cybersentinel-security-key-$(openssl rand -hex 32)
EOF
    
    # Update frontend .env
    log "Configuring frontend environment..."
    cat > "$PROJECT_DIR/frontend/.env" << EOF
REACT_APP_API_URL=http://$IP_ADDRESS:5000/api
EOF
    
    success "Application environment configured"
}

# Function to setup PM2 configuration
setup_process_manager() {
    header "Configuring CyberSentinel Service Manager..."
    
    # Create PM2 ecosystem file
    cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'cybersentinel-data-collector',
      script: 'scripts/new-graylog-to-kafka.js',
      cwd: '$PROJECT_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/cybersentinel/data-collector-error.log',
      out_file: '/var/log/cybersentinel/data-collector-out.log',
      log_file: '/var/log/cybersentinel/data-collector.log'
    },
    {
      name: 'cybersentinel-backend-api',
      script: 'backend/server.js',
      cwd: '$PROJECT_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/cybersentinel/backend-error.log',
      out_file: '/var/log/cybersentinel/backend-out.log',
      log_file: '/var/log/cybersentinel/backend.log'
    },
    {
      name: 'cybersentinel-frontend-ui',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_DIR/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/cybersentinel/frontend-error.log',
      out_file: '/var/log/cybersentinel/frontend-out.log',
      log_file: '/var/log/cybersentinel/frontend.log'
    }
  ]
};
EOF
    
    # Create log directory
    mkdir -p /var/log/cybersentinel
    
    success "Service manager configured"
}

# Function to create startup script
create_startup_script() {
    header "Creating CyberSentinel Service Commands..."
    
    # Create service management script
    cat > /usr/local/bin/cybersentinel << 'EOF'
#!/bin/bash

ECOSYSTEM_FILE="/opt/cybersentinel/SECURITY-LOG-MANAGER/ecosystem.config.js"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

case "$1" in
    start)
        echo -e "${BLUE}Starting CyberSentinel SIEM Platform...${NC}"
        pm2 start $ECOSYSTEM_FILE
        echo -e "${GREEN}CyberSentinel started successfully!${NC}"
        echo -e "${BLUE}Access the dashboard at: http://$(hostname -I | awk '{print $1}'):3000${NC}"
        ;;
    stop)
        echo -e "${YELLOW}Stopping CyberSentinel SIEM Platform...${NC}"
        pm2 stop $ECOSYSTEM_FILE
        echo -e "${GREEN}CyberSentinel stopped successfully!${NC}"
        ;;
    restart)
        echo -e "${YELLOW}Restarting CyberSentinel SIEM Platform...${NC}"
        pm2 restart $ECOSYSTEM_FILE
        echo -e "${GREEN}CyberSentinel restarted successfully!${NC}"
        ;;
    status)
        pm2 status
        ;;
    logs)
        pm2 logs
        ;;
    monitor)
        pm2 monit
        ;;
    *)
        echo -e "${RED}Usage: cybersentinel {start|stop|restart|status|logs|monitor}${NC}"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/cybersentinel
    
    success "Service commands created"
}

# Function to perform final checks
perform_final_checks() {
    header "Performing Final System Verification..."
    
    local issues=()
    
    # Check Docker containers
    log "Verifying infrastructure components..."
    if ! docker ps | grep -q cybersentinel-endpoint-processor; then
        issues+=("Endpoint Processor not running")
    fi
    
    if ! docker ps | grep -q cybersentinel-database; then
        issues+=("Database not running")
    fi
    
    if ! docker ps | grep -q jms_core; then
        issues+=("Manual Remediation System not running")
    fi
    
    # Check ports
    log "Verifying service accessibility..."
    local ports=(3000 5000 5601 8200 9200 29092)
    for port in "${ports[@]}"; do
        if ! netstat -tuln | grep -q ":$port "; then
            issues+=("Port $port not accessible")
        fi
    done
    
    if [ ${#issues[@]} -gt 0 ]; then
        warning "The following issues were detected:"
        for issue in "${issues[@]}"; do
            echo -e "  ${RED}•${NC} $issue"
        done
        echo ""
        warning "Please review the installation logs and retry if necessary."
    else
        success "All system components verified successfully"
    fi
}

# Function to show completion summary
show_completion_summary() {
    clear
    echo -e "${GREEN}"
    cat << "EOF"
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║                 INSTALLATION COMPLETED!                       ║
    ║                                                               ║
    ║        CyberSentinel SIEM Platform is ready to use           ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${BLUE}=== CyberSentinel Service Management ===${NC}"
    echo -e "Start Platform:    ${GREEN}cybersentinel start${NC}"
    echo -e "Stop Platform:     ${YELLOW}cybersentinel stop${NC}"
    echo -e "Restart Platform:  ${YELLOW}cybersentinel restart${NC}"
    echo -e "Check Status:      ${BLUE}cybersentinel status${NC}"
    echo -e "View Logs:         ${BLUE}cybersentinel logs${NC}"
    echo -e "Monitor Services:  ${BLUE}cybersentinel monitor${NC}"
    echo ""
    
    echo -e "${BLUE}=== Access Information ===${NC}"
    echo -e "CyberSentinel Dashboard:           ${GREEN}http://$IP_ADDRESS:3000${NC}"
    echo -e "Manual Remediation System:         ${GREEN}http://$IP_ADDRESS:80${NC} (admin:ChangeMe)"
    echo -e "Database Dashboard:                ${GREEN}http://$IP_ADDRESS:5601${NC}"
    echo -e "Secret Vault:                      ${GREEN}http://$IP_ADDRESS:8200${NC} (token: cybersentinel-vault-token)"
    echo ""
    
    echo -e "${YELLOW}=== First Time Setup ===${NC}"
    echo -e "1. Start the platform: ${GREEN}cybersentinel start${NC}"
    echo -e "2. Wait 2-3 minutes for all services to initialize"
    echo -e "3. Access the dashboard at: ${GREEN}http://$IP_ADDRESS:3000${NC}"
    echo -e "4. Default login: ${GREEN}admin:admin${NC}"
    echo ""
    
    echo -e "${PURPLE}=== Important Notes ===${NC}"
    echo -e "• Change default passwords after first login"
    echo -e "• Configure firewall rules for production use"
    echo -e "• Monitor system resources during initial data ingestion"
    echo -e "• Review logs if any service fails to start"
    echo ""
    
    success "CyberSentinel SIEM Platform installation completed successfully!"
}

# Main installation function
main() {
    show_banner
    
    # Detect IP address
    IP_ADDRESS=$(get_ip_address)
    log "Detected server IP: $IP_ADDRESS"
    
    # System checks
    check_system_requirements
    
    echo -e "\n${YELLOW}This will install CyberSentinel SIEM Platform with all components.${NC}"
    echo -e "${YELLOW}The installation will take approximately 15-20 minutes.${NC}"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    
    # Create installation directory
    log "Creating installation directory..."
    mkdir -p "$INSTALL_DIR"
    
    # Installation steps
    install_docker
    install_nodejs
    setup_infrastructure
    deploy_infrastructure
    install_manual_remediation
    customize_remediation_system
    setup_main_project
    collect_graylog_config
    update_environment_files
    setup_process_manager
    create_startup_script
    perform_final_checks
    show_completion_summary
}

# Trap to ensure cleanup on exit
trap 'echo -e "\n${YELLOW}Installation interrupted. Cleaning up...${NC}"; exit 1' INT TERM

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root. Please use 'sudo' or run as root user."
fi

# Run main function
main