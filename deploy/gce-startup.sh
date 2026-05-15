#!/bin/bash
set -euo pipefail

# GCE startup script — runs once on first boot to set up SlideBuilder.
# Attach this via --metadata-from-file startup-script=deploy/gce-startup.sh

export DEBIAN_FRONTEND=noninteractive

# Install Docker
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

# Install Caddy (auto-TLS reverse proxy)
if ! command -v caddy &>/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# Pull env from instance metadata
GEMINI_API_KEY=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/attributes/gemini-api-key" -H "Metadata-Flavor: Google" || echo "")
DOMAIN=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/attributes/domain" -H "Metadata-Flavor: Google" || echo "")

# Clone or update repo
APP_DIR=/opt/slidebuilder
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone https://github.com/Bwtaggart/SlideBuilder.git "$APP_DIR"
fi
cd "$APP_DIR"

# Write env file
cat > .env.production <<EOF
GEMINI_API_KEY=${GEMINI_API_KEY}
TEXT_MODEL_ID=gemini-2.5-flash
EOF

# Build and run container
docker build -t slidebuilder .
docker rm -f slidebuilder 2>/dev/null || true
docker run -d \
  --name slidebuilder \
  --restart unless-stopped \
  --env-file .env.production \
  -p 127.0.0.1:3000:3000 \
  slidebuilder

# Configure Caddy reverse proxy
if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
  reverse_proxy localhost:3000
}
EOF
else
  cat > /etc/caddy/Caddyfile <<EOF
:80 {
  reverse_proxy localhost:3000
}
EOF
fi

systemctl restart caddy
echo "SlideBuilder deployed successfully."
