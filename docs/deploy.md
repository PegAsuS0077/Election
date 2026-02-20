# Deployment Guide

## Production Build

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

## Vercel (Recommended)

1. Push repository to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variable: `VITE_API_URL` → your backend URL
5. Click Deploy

## Netlify

1. Push to GitHub
2. Go to https://netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_API_URL` → your backend URL

## Custom Server (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/election/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Backend (FastAPI)

See `backend/` directory and `docs/plans/2026-02-19-backend-integration.md`.
