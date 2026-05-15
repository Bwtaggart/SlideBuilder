#!/bin/bash
set -euo pipefail

# Create a GCE instance for SlideBuilder.
# Usage: ./deploy/create-instance.sh [DOMAIN]
#
# Auth: ADC for Vertex AI, Google OAuth for user login.
# The VM service account needs the "Vertex AI User" role.
#
# Prerequisites:
#   - gcloud CLI authenticated with your project
#   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars set
#     (create at: https://console.cloud.google.com/apis/credentials)
#
# Examples:
#   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy ./deploy/create-instance.sh slides.example.com
#   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy ./deploy/create-instance.sh

DOMAIN="${1:-}"
INSTANCE_NAME="slidebuilder"
ZONE="us-central1-a"
MACHINE_TYPE="e2-small"

if [ -z "${GOOGLE_CLIENT_ID:-}" ] || [ -z "${GOOGLE_CLIENT_SECRET:-}" ]; then
  echo "Error: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars"
  echo "Create OAuth credentials at: https://console.cloud.google.com/apis/credentials"
  exit 1
fi

NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "Creating GCE instance: $INSTANCE_NAME ($MACHINE_TYPE in $ZONE)"
[ -n "$DOMAIN" ] && echo "Domain: $DOMAIN (Caddy will auto-provision TLS)"

gcloud compute instances create "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server \
  --scopes=cloud-platform \
  --metadata="domain=${DOMAIN},google-client-id=${GOOGLE_CLIENT_ID},google-client-secret=${GOOGLE_CLIENT_SECRET},nextauth-secret=${NEXTAUTH_SECRET}" \
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
  echo "Point $DOMAIN -> $IP, then visit https://$DOMAIN"
  echo ""
  echo "Add to your OAuth consent screen authorized redirect URIs:"
  echo "  https://$DOMAIN/api/auth/callback/google"
else
  echo "Visit http://$IP"
  echo ""
  echo "Add to your OAuth consent screen authorized redirect URIs:"
  echo "  http://$IP/api/auth/callback/google"
fi
echo ""
echo "SSH: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "Logs: docker logs -f slidebuilder"
