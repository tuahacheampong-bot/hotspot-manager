#!/bin/bash
# ============================================
# Westerville Connect — Cloudflare Tunnel
# ============================================
# Exposes the app to the internet via Cloudflare
# Run: chmod +x expose.sh && ./expose.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
TUNNEL_NAME="westerville-connect"
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

clear
echo -e "${BLUE}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║  Westerville Connect — Expose to WAN ║"
echo "  ╚════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Install cloudflared if needed ──
if ! command -v cloudflared &>/dev/null; then
    info "Installing cloudflared..."
    brew install cloudflare/cloudflare/cloudflared
fi
ok "cloudflared ready"

# ── 2. Login to Cloudflare ──
if [ ! -f "$CONFIG_DIR/cert.pem" ]; then
    info "Opening Cloudflare login in browser..."
    info "Authorize your domain when the browser opens."
    cloudflared tunnel login
fi
ok "Cloudflare authenticated"

# ── 3. Create tunnel if needed ──
TUNNEL_ID=$(cloudflared tunnel list -o json 2>/dev/null | python3 -c "
import sys, json
tunnels = json.load(sys.stdin)
for t in tunnels:
    if t.get('name') == '$TUNNEL_NAME':
        print(t['id'])
        break
" 2>/dev/null)

if [ -z "$TUNNEL_ID" ]; then
    info "Creating tunnel..."
    TUNNEL_ID=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1 | grep -o '[a-f0-9-]\{36\}')
    ok "Tunnel created: $TUNNEL_ID"
else
    ok "Tunnel exists: $TUNNEL_ID"
fi

# ── 4. Get user's domain ──
echo ""
echo -e "${YELLOW}You need a domain or subdomain on Cloudflare.${NC}"
echo "Example: wifi.yourdomain.com"
echo ""
read -p "Enter your domain/subdomain: " TUNNEL_DOMAIN

if [ -z "$TUNNEL_DOMAIN" ]; then
    warn "No domain provided. Using quick tunnel (temporary URL)."
    echo ""
    info "Starting quick tunnel..."
    echo -e "${GREEN}Your URL will appear below:${NC}"
    echo ""
    cloudflared tunnel --url http://localhost:3000
    exit 0
fi

# ── 5. Create DNS record ──
info "Creating DNS record for $TUNNEL_DOMAIN..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$TUNNEL_DOMAIN" 2>/dev/null || true
ok "DNS configured"

# ── 6. Write config ──
info "Writing tunnel config..."
cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $TUNNEL_DOMAIN
    service: http://localhost:3000
  - service: http_status:404
EOF
ok "Config written"

# ── 7. Update Vercel env ──
echo ""
info "Updating Vercel MIKROTIK_HOST is no longer needed with Cloudflare Tunnel."
info "The tunnel handles all routing."

# ── 8. Start the app in background ──
info "Starting app server..."
cd "$PROJECT_DIR"
npm start &
APP_PID=$!
sleep 3

# ── 9. Start the tunnel ──
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Exposing: https://$TUNNEL_DOMAIN${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  Local:    http://localhost:3000"
echo "  Public:   https://$TUNNEL_DOMAIN"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cloudflared tunnel run "$TUNNEL_NAME"

# Cleanup on exit
kill $APP_PID 2>/dev/null || true
