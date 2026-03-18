#!/bin/bash
# ============================================
# Westerville Connect — Quick Start
# ============================================
# Run: chmod +x start.sh && ./start.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting Westerville Connect...${NC}"

# Start MongoDB if local
if grep -q "localhost" .env.local 2>/dev/null; then
    if ! pgrep -x "mongod" &>/dev/null; then
        brew services start mongodb-community 2>/dev/null || true
        sleep 2
    fi
fi

# Build if needed
if [ ! -d ".next" ]; then
    echo -e "${BLUE}Building...${NC}"
    npm run build 2>/dev/null
fi

echo -e "${GREEN}Ready! http://localhost:3000${NC}"
echo ""
npm start
