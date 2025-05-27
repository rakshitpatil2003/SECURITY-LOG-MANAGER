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

# Enhanced progress bar function
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))
    local remaining=$((width - completed))
    
    printf "\r${BLUE}[INFO]${NC} %s [" "$message"
    printf "%*s" $completed | tr ' ' '█'
    printf "%*s" $remaining | tr ' ' '░'
    printf "] %d%%" $percentage
    
    if [ $current -eq $total ]; then
        printf "\n"
    fi
}

# Installation step tracker
declare -g STEP_CURRENT=0
declare -g STEP_TOTAL=12

next_step() {
    STEP_CURRENT=$((STEP_CURRENT + 1))
    show_progress $STEP_CURRENT $STEP_TOTAL "$1"
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

# Enhanced logging with file output
LOG_FILE="/var/log/cybersentinel-install.log"

setup_logging() {
    mkdir -p /var/log
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    echo "=== CyberSentinel Installation Started: $(date) ===" >> "$LOG_FILE"
}

log_with_file() {
    local level=$1
    local message=$2
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $message" >> "$LOG_FILE"
}

error_with_file() {
    local message=$1
    echo -e "${RED}[ERROR]${NC} $message"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $message" >> "$LOG_FILE"
    echo -e "${YELLOW}Check detailed logs at: $LOG_FILE${NC}"
    exit 1
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

# Replace the entire install_docker() function with this enhanced version
install_docker() {
    next_step "Installing Docker and Docker Compose..."
    
    # Check if Docker is already installed
    if command_exists docker && command_exists docker-compose; then
        log_with_file "INFO" "Docker and Docker Compose are already installed!"
        return
    fi
    
    # Update package lists
    log_with_file "INFO" "Updating package lists..."
    apt update >> "$LOG_FILE" 2>&1 || error_with_file "Failed to update package lists."
    
    # Install prerequisites
    log_with_file "INFO" "Installing prerequisites..."
    apt install -y apt-transport-https ca-certificates curl software-properties-common >> "$LOG_FILE" 2>&1 || error_with_file "Failed to install prerequisites."
    
    # Add Docker's official GPG key
    log_with_file "INFO" "Adding Docker's GPG key..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - >> "$LOG_FILE" 2>&1 || error_with_file "Failed to add Docker's GPG key."
    
    # Add Docker repository
    log_with_file "INFO" "Adding Docker repository..."
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" >> "$LOG_FILE" 2>&1 || error_with_file "Failed to add Docker repository."
    
    # Install Docker
    log_with_file "INFO" "Installing Docker..."
    apt update >> "$LOG_FILE" 2>&1
    apt install -y docker-ce docker-ce-cli containerd.io >> "$LOG_FILE" 2>&1 || error_with_file "Failed to install Docker."
    
    # Install Docker Compose
    log_with_file "INFO" "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose >> "$LOG_FILE" 2>&1 || error_with_file "Failed to download Docker Compose."
    chmod +x /usr/local/bin/docker-compose >> "$LOG_FILE" 2>&1 || error_with_file "Failed to set permissions for Docker Compose."
    
    # Start and enable Docker
    systemctl start docker >> "$LOG_FILE" 2>&1
    systemctl enable docker >> "$LOG_FILE" 2>&1
    
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
    
    success "Application runtime environment installed successfully"
}

# NEW FUNCTION: Create systemd services instead of PM2
create_systemd_services() {
    next_step "Creating CyberSentinel System Services..."
    
    # Create service user
    log_with_file "INFO" "Creating service user..."
    useradd -r -s /bin/false cybersentinel || true
    chown -R cybersentinel:cybersentinel "$PROJECT_DIR"
    
    # Create data collector service
    cat > /etc/systemd/system/cybersentinel-collector.service << EOF
[Unit]
Description=CyberSentinel Data Collector
After=network.target
Requires=network.target

[Service]
Type=simple
User=cybersentinel
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node scripts/new-graylog-to-kafka.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cybersentinel-collector
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Create backend API service
    cat > /etc/systemd/system/cybersentinel-backend.service << EOF
[Unit]
Description=CyberSentinel Backend API
After=network.target
Requires=network.target

[Service]
Type=simple
User=cybersentinel
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cybersentinel-backend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Create frontend service
    cat > /etc/systemd/system/cybersentinel-frontend.service << EOF
[Unit]
Description=CyberSentinel Frontend UI
After=network.target
Requires=network.target

[Service]
Type=simple
User=cybersentinel
WorkingDirectory=$PROJECT_DIR/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cybersentinel-frontend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable services
    systemctl daemon-reload >> "$LOG_FILE" 2>&1
    systemctl enable cybersentinel-collector cybersentinel-backend cybersentinel-frontend >> "$LOG_FILE" 2>&1
    
    success "System services created successfully"
}

# NEW FUNCTION: Setup Nginx reverse proxy
setup_nginx() {
    next_step "Configuring Nginx Reverse Proxy..."
    
    # Install Nginx
    log_with_file "INFO" "Installing Nginx..."
    apt install -y nginx >> "$LOG_FILE" 2>&1 || error_with_file "Failed to install Nginx"
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/cybersentinel << EOF
server {
    listen 80;
    server_name $IP_ADDRESS localhost;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site and remove default
    ln -sf /etc/nginx/sites-available/cybersentinel /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and start Nginx
    nginx -t >> "$LOG_FILE" 2>&1 || error_with_file "Nginx configuration test failed"
    systemctl start nginx >> "$LOG_FILE" 2>&1
    systemctl enable nginx >> "$LOG_FILE" 2>&1
    
    success "Nginx reverse proxy configured successfully"
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


# Replace the entire create_startup_script() function with this
create_service_management_script() {
    next_step "Creating Service Management Commands..."
    
    cat > /usr/local/bin/cybersentinel << 'EOF'
#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVICES=("cybersentinel-collector" "cybersentinel-backend" "cybersentinel-frontend")

case "$1" in
    start)
        echo -e "${BLUE}Starting CyberSentinel SIEM Platform...${NC}"
        for service in "${SERVICES[@]}"; do
            systemctl start "$service"
            if systemctl is-active --quiet "$service"; then
                echo -e "${GREEN}✓${NC} $service started successfully"
            else
                echo -e "${RED}✗${NC} Failed to start $service"
            fi
        done
        echo -e "${GREEN}CyberSentinel started successfully!${NC}"
        echo -e "${BLUE}Access the dashboard at: http://$(hostname -I | awk '{print $1}')${NC}"
        ;;
    stop)
        echo -e "${YELLOW}Stopping CyberSentinel SIEM Platform...${NC}"
        for service in "${SERVICES[@]}"; do
            systemctl stop "$service"
            echo -e "${GREEN}✓${NC} $service stopped"
        done
        echo -e "${GREEN}CyberSentinel stopped successfully!${NC}"
        ;;
    restart)
        echo -e "${YELLOW}Restarting CyberSentinel SIEM Platform...${NC}"
        for service in "${SERVICES[@]}"; do
            systemctl restart "$service"
            if systemctl is-active --quiet "$service"; then
                echo -e "${GREEN}✓${NC} $service restarted successfully"
            else
                echo -e "${RED}✗${NC} Failed to restart $service"
            fi
        done
        echo -e "${GREEN}CyberSentinel restarted successfully!${NC}"
        ;;
    status)
        echo -e "${BLUE}CyberSentinel Service Status:${NC}"
        for service in "${SERVICES[@]}"; do
            if systemctl is-active --quiet "$service"; then
                echo -e "${GREEN}✓${NC} $service: $(systemctl is-active $service)"
            else
                echo -e "${RED}✗${NC} $service: $(systemctl is-active $service)"
            fi
        done
        ;;
    logs)
        echo -e "${BLUE}Select service logs to view:${NC}"
        echo "1) Data Collector"
        echo "2) Backend API" 
        echo "3) Frontend UI"
        echo "4) All services"
        read -p "Enter choice (1-4): " choice
        case $choice in
            1) journalctl -f -u cybersentinel-collector ;;
            2) journalctl -f -u cybersentinel-backend ;;
            3) journalctl -f -u cybersentinel-frontend ;;
            4) journalctl -f -u cybersentinel-collector -u cybersentinel-backend -u cybersentinel-frontend ;;
            *) echo -e "${RED}Invalid choice${NC}" ;;
        esac
        ;;
    update)
        cybersentinel-update update
        ;;
    *)
        echo -e "${RED}Usage: cybersentinel {start|stop|restart|status|logs|update}${NC}"
        echo -e "${BLUE}Additional commands:${NC}"
        echo -e "  ${GREEN}cybersentinel-update update${NC} - Update to latest version"
        echo -e "  ${GREEN}cybersentinel-update backup${NC} - Create backup only"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/cybersentinel
    success "Service management commands created"
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
    echo -e "CyberSentinel Dashboard:           ${GREEN}http://$IP_ADDRESS${NC} (via Nginx)"
    echo -e "Direct Frontend Access:            ${GREEN}http://$IP_ADDRESS:3000${NC}"
    echo -e "Backend API:                       ${GREEN}http://$IP_ADDRESS:5000${NC}"
    echo -e "Manual Remediation System:         ${GREEN}http://$IP_ADDRESS:80${NC} (admin:ChangeMe)"
    echo -e "Database Dashboard:                ${GREEN}http://$IP_ADDRESS:5601${NC}"
    echo -e "Secret Vault:                      ${GREEN}http://$IP_ADDRESS:8200${NC} (token: cybersentinel-vault-token)"
    echo ""
    
    echo -e "${YELLOW}=== Update Management ===${NC}"
    echo -e "Update Platform:       ${GREEN}cybersentinel update${NC}"
    echo -e "Create Backup:         ${GREEN}cybersentinel-update backup${NC}"
    echo -e "Manual Update:         ${GREEN}cybersentinel-update update${NC}"
    echo ""
    
    echo -e "${PURPLE}=== Logging and Troubleshooting ===${NC}"
    echo -e "Installation Logs:     ${GREEN}/var/log/cybersentinel-install.log${NC}"
    echo -e "Update Logs:           ${GREEN}/var/log/cybersentinel-update.log${NC}"
    echo -e "Service Logs:          ${GREEN}cybersentinel logs${NC}"
    echo -e "System Logs:           ${GREEN}journalctl -u cybersentinel-*${NC}"
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

# NEW FUNCTION: Update CyberSentinel platform
create_update_script() {
    next_step "Creating Update Management System..."
    
    cat > /usr/local/bin/cybersentinel-update << 'EOF'
#!/bin/bash

PROJECT_DIR="/opt/cybersentinel/SECURITY-LOG-MANAGER"
BACKUP_DIR="/opt/cybersentinel/backups"
LOG_FILE="/var/log/cybersentinel-update.log"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_update() {
    echo -e "${BLUE}[UPDATE]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [UPDATE] $1" >> "$LOG_FILE"
}

error_update() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
    exit 1
}

success_update() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

backup_current() {
    log_update "Creating backup of current installation..."
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="cybersentinel-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME" || error_update "Failed to create backup"
    success_update "Backup created: $BACKUP_DIR/$BACKUP_NAME"
}

update_platform() {
    log_update "Stopping CyberSentinel services..."
    systemctl stop cybersentinel-frontend cybersentinel-backend cybersentinel-collector
    
    log_update "Fetching latest version from GitHub..."
    cd /opt/cybersentinel || error_update "Failed to access installation directory"
    
    # Backup current version
    backup_current
    
    # Pull latest changes
    cd "$PROJECT_DIR" || error_update "Failed to access project directory"
    git fetch origin >> "$LOG_FILE" 2>&1
    git reset --hard origin/main >> "$LOG_FILE" 2>&1 || error_update "Failed to update from repository"
    
    log_update "Installing updated dependencies..."
    cd backend && npm install --force >> "$LOG_FILE" 2>&1 || error_update "Failed to update backend dependencies"
    cd ../frontend && npm install --force >> "$LOG_FILE" 2>&1 || error_update "Failed to update frontend dependencies"
    cd ../scripts && npm install --force >> "$LOG_FILE" 2>&1 || error_update "Failed to update script dependencies"
    
    # Fix permissions
    chown -R cybersentinel:cybersentinel "$PROJECT_DIR"
    
    log_update "Starting CyberSentinel services..."
    systemctl start cybersentinel-collector cybersentinel-backend cybersentinel-frontend
    
    success_update "CyberSentinel platform updated successfully!"
    echo -e "${BLUE}Access the updated dashboard at: http://$(hostname -I | awk '{print $1}')${NC}"
}

case "$1" in
    update)
        update_platform
        ;;
    backup)
        backup_current
        ;;
    *)
        echo -e "${RED}Usage: cybersentinel-update {update|backup}${NC}"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/cybersentinel-update
    success "Update management system created"
}

# Main installation function
main() {
    setup_logging  # Add this line at the beginning
    show_banner
    
    # Detect IP address
    IP_ADDRESS=$(get_ip_address)
    log_with_file "INFO" "Detected server IP: $IP_ADDRESS"
    
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
    next_step "Creating installation directory..."
    mkdir -p "$INSTALL_DIR"
    
    # Installation steps with progress tracking
    install_docker
    install_nodejs  # Keep this but remove PM2 installation line
    setup_infrastructure
    deploy_infrastructure
    install_manual_remediation
    customize_remediation_system
    setup_main_project
    collect_graylog_config
    update_environment_files
    create_systemd_services     # NEW - Replace setup_process_manager
    setup_nginx                 # NEW
    create_update_script        # NEW
    create_service_management_script  # Replace create_startup_script
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