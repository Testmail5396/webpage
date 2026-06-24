# Zoho Catalyst Setup Guide

## Step 1 — Create Data Store tables

In Catalyst console → Data Store → New Table, create these 4 tables:

### Table: `Profiles`
| Column | Type |
|--------|------|
| Name | Single-Line Text |
| Email | Single-Line Text |
| Role | Single-Line Text |
| Avatar | Single-Line Text |
| AvatarColor | Single-Line Text |
| ProfileImage | Single-Line Text |

### Table: `Folders`
| Column | Type |
|--------|------|
| DesignerId | Single-Line Text |
| ParentFolderId | Single-Line Text |
| Name | Single-Line Text |
| IsPersonal | Single-Line Text |

### Table: `Links`
| Column | Type |
|--------|------|
| DesignerId | Single-Line Text |
| FolderId | Single-Line Text |
| Title | Single-Line Text |
| Url | Single-Line Text |
| Description | Multi-Line Text |
| Thumbnail | Single-Line Text |
| Modules | Multi-Line Text |
| SharedWith | Multi-Line Text |

### Table: `AppModules`
| Column | Type |
|--------|------|
| Name | Single-Line Text |

After creating AppModules, add default rows: Tickets, Analytics, IM, KB, Reports, Setup.

## Step 2 — Set up Zoho OAuth App

In api-console.zoho.com, create a Server-based Application:
- Client Name: Designfolio
- Homepage URL: your Catalyst domain
- Redirect URI: `https://<your-catalyst-domain>/auth/callback`
- Scopes: `openid profile email`

Note your **Client ID**.

## Step 3 — Install Catalyst CLI and initialize

```bash
npm install -g zcatalyst-cli
catalyst login
cd /Users/vikash-19848/Documents/Final/Designfolio
catalyst init
```

During init, select your Catalyst project. It creates `catalyst.json`.

## Step 4 — Install function dependencies

```bash
cd functions/api
npm install
cd ../..
```

## Step 5 — Set environment variables

Create `.env.production` in the project root:
```
REACT_APP_ZOHO_CLIENT_ID=your_client_id
REACT_APP_USE_CATALYST=true
```

For local development (demo mode), no env vars needed — the app uses localStorage.

## Step 6 — Build and deploy

```bash
npm run build
catalyst deploy
```

The build output goes to `build/` which Catalyst serves as the Web Client.
The function at `functions/api/` deploys as an Advanced I/O function.

After deployment, your app is live at:
`https://<project-name>-<id>.catalystserverless.com`

## Architecture

```
Browser → Catalyst Web Client (React app)
              ↓ fetch('/server/api/...')
         Catalyst Function (Express + zcatalyst-sdk-node)
              ↓ datastore().table(...)
         Catalyst Data Store
```

- Catalyst platform handles Zoho authentication at the hosting layer
- The function uses `catalyst.initialize(req)` to get the authenticated user
- Only `@zohocorp.com` emails are allowed (enforced server-side)
- Teammates' changes sync via 20-second polling

## Local development

```bash
npm run dev
```

Runs in demo mode with localStorage — no Catalyst connection needed.
