#!/bin/bash
set -euo pipefail

# Create a GCE instance for SlideBuilder.
# Usage: ./deploy/create-instance.sh [DOMAIN]
#
# Prerequisites:
#   - gcloud CLI authenticated with your project
#   - GEMINI_API_KEY env var set (or it reads from .env.local)
#
# Examples:
#   GEMINI_API_KEY=AIza... ./deploy/create-instance.sh slides.example.com
#   ./deploy/create-instance.sh   # no domain = HTTP only on port 80

DOMAIN="${1:-}"
INSTANCE_NAME="slidebuilder"
ZONE="us-central1-a"
MACHINE_TYPE="e2-small"

# Resolve API key
if [ -z "${GEMINI_API_KEY:-}" ] && [ -f .env.local ]; then
  GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d= -f2)
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "Error: Set GEMINI_API_KEY env var or have it in .env.local"
  exit 1
fi

echo "Creating GCE instance: $INSTANCE_NAME ($MACHINE_TYPE in $ZONE)"
[ -n "$DOMAIN" ] && echo "Domain: $DOMAIN (Caddy will auto-provision TLS)"

gcloud compute instances create "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server \
  --metadata="gemini-api-key=${GEMINI_API_KEY},domain=${DOMAIN}" \
  --metadata-from-file=startup-script=deploy/gce-startup.sh

# Ensure firewall rules exist
gcloud compute firewall-rules describe allow-http &>/dev/null 2>&1 || \
  gcloud compute firewall-rules create allow-http \
    --allow=tcp:80 --target-tags=http-server

gcloud compute firewall-rules describe allow-https &>/dev/null 2>&1 || \
  gcloud compute firewall-rules create allow-https \
    --allow=tcp:443 --target-tags=https-server

echo ""
echo "Instance created. It will take 2-3 minutes for startup to complete."
echo ""
IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "External IP: $IP"
if [ -n "$DOMAIN" ]; then
  echo "Point $DOMAIN → $IP, then visit https://$DOMAIN"
else
  echo "Visit http://$IP"
fi
echo ""
echo "SSH: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "Logs: docker logs -f slidebuilder"
echo "Redeploy: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE -- 'cd /opt/slidebuilder && git pull && docker build -t slidebuilder . && docker rm -f slidebuilder && docker run -d --name slidebuilder --restart unless-stopped --env-file .env.production -p 127.0.0.1:3000:3000 slidebuilder && systemctl restart caddy'"
