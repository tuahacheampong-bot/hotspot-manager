#!/bin/bash
# ============================================
# Westerville Connect — Docker Launcher
# ============================================
# One command to run everything on any Mac
# Usage: ./launch.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${BLUE}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║       Westerville Connect Launcher        ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
if ! command -v docker &>/dev/null; then
    echo -e "${YELLOW}Docker not found. Opening download page...${NC}"
    open "https://www.docker.com/products/docker-desktop/"
    echo "Install Docker Desktop, then run this script again."
    exit 1
fi

# Check Docker is running
if ! docker info &>/dev/null; then
    echo -e "${YELLOW}Docker Desktop is not running. Starting it...${NC}"
    open -a "Docker Desktop"
    echo "Waiting for Docker to start..."
    until docker info &>/dev/null; do sleep 2; done
fi

echo -e "${GREEN}Docker ready${NC}"

# Stop local MongoDB if running (conflicts with Docker MongoDB on port 27017)
if pgrep -x "mongod" &>/dev/null; then
    echo -e "${YELLOW}Stopping local MongoDB (conflicts with Docker)...${NC}"
    brew services stop mongodb-community 2>/dev/null || true
    sleep 2
fi

# Prompt for MikroTik config
echo ""
echo -e "${YELLOW}MikroTik Router Configuration${NC}"
echo ""
read -p "MikroTik IP [192.168.1.49]: " mt_host
mt_host=${mt_host:-192.168.1.49}

read -p "MikroTik user [admin]: " mt_user
mt_user=${mt_user:-admin}

read -sp "MikroTik password: " mt_pass
echo ""

# Export for docker-compose
export MIKROTIK_HOST=$mt_host
export MIKROTIK_PORT=8728
export MIKROTIK_USER=$mt_user
export MIKROTIK_PASSWORD=$mt_pass
export MIKROTIK_MODE=usermanager
export NEXTAUTH_SECRET=$(openssl rand -hex 32)

cd "$PROJECT_DIR"

# Save config for future runs
cat > .env << EOF
MIKROTIK_HOST=$mt_host
MIKROTIK_PORT=8728
MIKROTIK_USER=$mt_user
MIKROTIK_PASSWORD=$mt_pass
MIKROTIK_MODE=usermanager
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
EOF

echo ""
echo -e "${BLUE}Building and starting...${NC}"
echo ""

# Build and run
docker compose up -d --build

# Wait for app to start
echo -e "${BLUE}Waiting for app to start...${NC}"
sleep 10

# Seed the database
echo -e "${BLUE}Seeding database...${NC}"
docker compose run --rm seed 2>/dev/null || true

# Create admin user
echo -e "${BLUE}Creating admin account...${NC}"
curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","phone":"0555000000","password":"admin"}' > /dev/null 2>&1

# Set admin role via MongoDB
docker compose exec mongodb mongosh hotspot-manager --eval "
  db.users.updateOne({phone:'0555000000'}, {\$set:{role:'admin'}})
" > /dev/null 2>&1 || true

ok "Admin created: 0555000000 / admin"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Westerville Connect is running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "  Dashboard:    http://localhost:3000"
echo "  Admin Panel:  http://localhost:3000/admin"
echo ""
echo "  Login as admin:  0555000000 / admin"
echo ""
echo "  To stop:    docker compose down"
echo "  To restart: docker compose restart"
echo "  To see logs: docker compose logs -f app"
echo ""
