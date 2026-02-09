# VPS Deployment Guide (Eshope1)

This guide is for deploying this Next.js (App Router) app on a Linux VPS (Ubuntu/Debian) using **PM2** + **Nginx**.

## 1) Requirements

- A domain pointing to your VPS IP (A record)
- Ubuntu/Debian VPS
- Node.js 20 LTS recommended
- MongoDB connection string (MongoDB Atlas or self-hosted)

## 2) Install system dependencies

```bash
sudo apt update && sudo apt -y upgrade
sudo apt-get install -y git nginx build-essential
```

### Install Node.js (Node 20)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

## 3) Clone the repo

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/abcryk12-afk/Eshope1.git eshope
cd eshope
```

## 4) Environment variables

Create `.env.local` (or `.env`) on the VPS inside `/var/www/eshope`.

Common required variables:

```bash
NODE_ENV=production
NEXTAUTH_URL=https://YOUR_DOMAIN
NEXTAUTH_SECRET=YOUR_LONG_RANDOM_SECRET

MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING

SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...  # keep \n escaping as configured

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

Notes:

- Never commit `.env*`.
- If you use Google sign-in via Firebase, make sure Google Cloud Console has the correct authorized redirect URI.

## 5) Install dependencies + build

```bash
npm ci
npm run build
```

## 6) Run with PM2

Install PM2:

```bash
sudo npm i -g pm2
```

Start the app:

```bash
pm2 start "npm run start" --name eshope
pm2 save
pm2 startup
```

By default Next.js listens on port `3000`.

## 7) Nginx reverse proxy

Create config:

```bash
sudo nano /etc/nginx/sites-available/eshope
```

Example:

```nginx
server {
  server_name YOUR_DOMAIN;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/eshope /etc/nginx/sites-enabled/eshope
sudo nginx -t
sudo systemctl restart nginx
```

## 8) SSL (Let’s Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## 9) Uploads / Admin branding logos (IMPORTANT)

Admin uploads currently save to local filesystem:

- `public/uploads/YYYY/MM/...`

Implications:

- On a VPS, these files persist **as long as your deployment does not wipe the folder**.
- If you redeploy by deleting `/var/www/eshope` and recloning, you will lose uploads.

Recommended production approach:

- Use external object storage (Firebase Storage / S3 / Cloudinary)
- Save the returned public URL in the database

## 10) Updating code (deploy updates)

```bash
cd /var/www/eshope
sudo git pull
npm ci
npm run build
pm2 restart eshope
```

## Troubleshooting

- If `npm run start` says no production build, run `npm run build` first.
- If port 3000 is busy:

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```
