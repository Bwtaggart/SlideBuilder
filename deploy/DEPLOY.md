# Deploying SlideBuilder on GCE

## Prerequisites

- A Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- A domain name (strongly recommended — see [Security note on HTTP](#security-note-http-deployments))

---

## Step 1: Create or select a GCP project

```bash
# Create a new project (or skip if using an existing one)
gcloud projects create slidebuilder-prod --name="SlideBuilder"

# Set it as active
gcloud config set project slidebuilder-prod

# Link billing (replace BILLING_ACCOUNT_ID with yours)
# Find yours: gcloud billing accounts list
gcloud billing projects link slidebuilder-prod --billing-account=BILLING_ACCOUNT_ID
```

---

## Step 2: Enable required APIs

```bash
gcloud services enable \
  aiplatform.googleapis.com \
  compute.googleapis.com \
  iamcredentials.googleapis.com
```

- **aiplatform.googleapis.com** — Vertex AI (Gemini calls)
- **compute.googleapis.com** — GCE instances
- **iamcredentials.googleapis.com** — ADC token exchange

---

## Step 3: Grant Vertex AI access to the default service account

The VM uses its attached service account to call Gemini via ADC. Grant it the
Vertex AI User role:

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

---

## Step 4: Create OAuth credentials for Google Sign-In

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials > OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - User type: **External** (or Internal if using Workspace)
   - App name: `SlideBuilder`
   - Authorized domains: your domain (e.g. `example.com`)
   - Scopes: just email and profile (defaults)
4. Back on Create OAuth client ID:
   - Application type: **Web application**
   - Name: `SlideBuilder Production`
   - Authorized JavaScript origins: `https://slides.yourdomain.com`
   - Authorized redirect URIs: `https://slides.yourdomain.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

> **If you don't have a domain yet**, use `http://EXTERNAL_IP` as the origin
> and `http://EXTERNAL_IP/api/auth/callback/google` as the redirect URI.
> You can update these after the instance is created and you know the IP.
> See the [security note below](#security-note-http-deployments) about HTTP limitations.

---

## Step 5: Point your domain (if using one)

Create a DNS A record pointing your domain to the IP you'll get in Step 6.
If you don't know the IP yet, do this after the instance is created.

```
slides.yourdomain.com  →  A  →  <EXTERNAL_IP>
```

Caddy (installed by the startup script) will auto-provision a TLS certificate
from Let's Encrypt once DNS resolves.

---

## Step 6: Create the GCE instance

```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" \
GOOGLE_CLIENT_SECRET="your-client-secret" \
./deploy/create-instance.sh slides.yourdomain.com
```

Without a domain (HTTP only):
```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" \
GOOGLE_CLIENT_SECRET="your-client-secret" \
./deploy/create-instance.sh
```

This creates an `e2-small` instance (2 vCPU, 2 GB RAM) in `us-central1-a`.
The startup script installs Docker + Caddy, clones the repo, builds the
container, and starts serving.

The script prints the external IP when done. **If you didn't set up DNS yet,
go back to Step 5 now.**

---

## Step 7: Wait for startup and verify

The startup script takes 2-3 minutes to pull dependencies and build the
Docker image. Monitor progress:

```bash
# SSH into the instance
gcloud compute ssh slidebuilder --zone=us-central1-a

# Watch the startup script
sudo journalctl -f -u google-startup-scripts

# Or check the container directly
docker logs -f slidebuilder
```

Once ready, visit your domain (or IP). You should see the Google Sign-In page.

---

## Step 8: Update OAuth redirect URI (if using IP)

If you deployed without a domain and now have the IP:

1. Go back to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth client
3. Add `http://<EXTERNAL_IP>/api/auth/callback/google` to redirect URIs
4. Add `http://<EXTERNAL_IP>` to authorized JavaScript origins

---

## Redeploying after code changes

Push to `main`, then:

```bash
gcloud compute ssh slidebuilder --zone=us-central1-a -- \
  'cd /opt/slidebuilder && git pull origin main && docker build -t slidebuilder . && docker rm -f slidebuilder && docker run -d --name slidebuilder --restart unless-stopped --env-file .env.production -p 127.0.0.1:3000:3000 slidebuilder && sudo systemctl restart caddy'
```

---

## Configuration reference

All config is via environment variables in `.env.production` on the VM:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLOUD_PROJECT` | Yes | GCP project for Vertex AI billing |
| `GOOGLE_CLOUD_LOCATION` | No | Region for Vertex AI (default: `us-central1`) |
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID for Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (auto-generated by deploy script) |
| `NEXTAUTH_URL` | Yes | Public URL of the app |
| `TEXT_MODEL_ID` | No | Gemini text model (default: `gemini-2.5-flash`) |
| `IMAGE_MODEL_ID` | No | Gemini image model (default: `gemini-3-pro-image-preview`) |

To change config on a running instance:

```bash
gcloud compute ssh slidebuilder --zone=us-central1-a
sudo vim /opt/slidebuilder/.env.production
docker restart slidebuilder
```

---

## Cost estimate

| Resource | ~Monthly cost |
|----------|---------------|
| e2-small (always on) | ~$15 |
| 20 GB boot disk | ~$1 |
| Vertex AI (Gemini) | Pay per use |
| Static IP (if reserved) | ~$3 |
| **Total (infra only)** | **~$19 + Gemini usage** |

To reduce cost, stop the instance when not in use:
```bash
gcloud compute instances stop slidebuilder --zone=us-central1-a
gcloud compute instances start slidebuilder --zone=us-central1-a
```

---

## Security note: HTTP deployments

Deploying without a domain serves the app over **plain HTTP**. This means:

- Session cookies are sent **unencrypted** (no `Secure` flag)
- Anyone on the network path can intercept cookies and hijack sessions
- Google OAuth tokens transit in cleartext during the login flow

**HTTP is acceptable only for local testing.** For any deployment accessible
over the internet, use a domain with HTTPS (Caddy handles TLS automatically).

If you must temporarily use a raw IP, restrict access with a firewall rule:
```bash
gcloud compute firewall-rules create allow-http-restricted \
  --allow=tcp:80 --target-tags=http-server \
  --source-ranges="YOUR_IP/32"
```

---

## Troubleshooting

**"Unauthorized" on API calls after login:**
Check that the OAuth redirect URI matches exactly (including protocol and path).

**Caddy not serving HTTPS:**
DNS must resolve to the instance IP before Caddy can get a certificate.
Check: `dig slides.yourdomain.com` should return your IP.

**Gemini calls failing:**
Verify the service account has `roles/aiplatform.user`:
```bash
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/aiplatform.user"
```

**Container won't start:**
```bash
docker logs slidebuilder
cat /opt/slidebuilder/.env.production  # check for empty values
```
