#!/bin/bash
# ============================================
# Westerville Connect — Mac Setup & Run Script
# ============================================
# Run: chmod +x setup.sh && ./setup.sh

set -e

APP_NAME="Westerville Connect"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env.local"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

clear
echo -e "${BLUE}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║     $APP_NAME — Mac Setup          ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Check Homebrew ──
info "Checking Homebrew..."
if ! command -v brew &>/dev/null; then
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
ok "Homebrew ready"

# ── 2. Check Node.js ──
info "Checking Node.js..."
if ! command -v node &>/dev/null; then
    info "Installing Node.js..."
    brew install node
fi
ok "Node.js $(node -v)"

# ── 3. Install dependencies ──
info "Installing project dependencies..."
cd "$PROJECT_DIR"
npm install --silent
ok "Dependencies installed"

# ── 4. Setup environment file ──
if [ ! -f "$ENV_FILE" ]; then
    info "Creating .env.local..."
    cat > "$ENV_FILE" << 'ENVEOF'
# ============================================
# Westerville Connect — Environment Config
# ============================================

# MongoDB (local or Atlas)
MONGODB_URI=mongodb://localhost:27017/hotspot-manager

# MikroTik Router
MIKROTIK_HOST=192.168.1.49
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=CHANGEME
MIKROTIK_MODE=usermanager

# JWT
NEXTAUTH_SECRET=CHANGEME
NEXTAUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF
    warn ".env.local created — edit it with your MikroTik and MongoDB details"
else
    ok ".env.local already exists"
fi

# ── 5. Prompt for config ──
echo ""
echo -e "${YELLOW}Configure your environment:${NC}"
echo ""

read -p "MikroTik host [192.168.1.49]: " mt_host
mt_host=${mt_host:-192.168.1.49}

read -p "MikroTik user [admin]: " mt_user
mt_user=${mt_user:-admin}

read -sp "MikroTik password: " mt_pass
echo ""

read -p "MongoDB URI [mongodb://localhost:27017/hotspot-manager]: " mongo_uri
mongo_uri=${mongo_uri:-mongodb://localhost:27017/hotspot-manager}

# Generate JWT secret
jwt_secret=$(openssl rand -hex 32)

# Write config
cat > "$ENV_FILE" << ENVEOF
# Westerville Connect — Environment Config
MONGODB_URI=$mongo_uri
MIKROTIK_HOST=$mt_host
MIKROTIK_PORT=8728
MIKROTIK_USER=$mt_user
MIKROTIK_PASSWORD=$mt_pass
MIKROTIK_MODE=usermanager
NEXTAUTH_SECRET=$jwt_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENVEOF

ok "Environment configured"

# ── 6. Install & start MongoDB (if local) ──
if [[ "$mongo_uri" == *"localhost"* ]] || [[ "$mongo_uri" == *"127.0.0.1"* ]]; then
    info "Checking local MongoDB..."
    if ! brew list mongodb-community &>/dev/null; then
        info "Installing MongoDB..."
        brew tap mongodb/brew
        brew install mongodb-community
    fi
    
    if ! pgrep -x "mongod" &>/dev/null; then
        info "Starting MongoDB..."
        brew services start mongodb-community
        sleep 2
    fi
    ok "MongoDB running"
fi

# ── 7. Seed database ──
info "Seeding database with plans..."
npx tsx scripts/seed.ts --force 2>/dev/null || true
ok "Database seeded"

# ── 8. Build the app ──
info "Building the app..."
npm run build 2>/dev/null
ok "Build complete"

# ── 9. Start server ──
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  $APP_NAME is ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  Local:   http://localhost:3000"
echo "  Admin:   http://localhost:3000/admin"
echo ""
echo "  To expose via Cloudflare Tunnel:"
echo "  Run:     ./expose.sh"
echo ""

read -p "Start the server now? [Y/n]: " start_now
start_now=${start_now:-Y}

if [[ "$start_now" =~ ^[Yy]$ ]]; then
    echo ""
    info "Starting server..."
    npm start
fi
