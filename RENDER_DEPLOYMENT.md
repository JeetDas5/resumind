# Render Deployment Guide

## Quick Setup

1. **Connect your repository to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service:**
   - **Name:** `ai-resume-analyser`
   - **Runtime:** `Node`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

3. **Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = (automatically set by Render)

## Alternative: Using render.yaml

If you have a `render.yaml` file in your repo root (which I've created), Render will automatically use those settings.

## Key Changes Made

1. **Integrated API routes** into React Router instead of separate Express server
2. **Updated build process** to work with React Router v7
3. **Fixed server entry point** to handle dynamic PORT from Render
4. **Added proper Express integration** with React Router

## API Endpoints

- `GET /api` - Welcome message
- `POST /api/scrape` - Scrape job data from URL

## Troubleshooting

If deployment fails:

1. **Check build logs** in Render dashboard
2. **Verify all dependencies** are in package.json
3. **Check Node.js version** (using Node 20)
4. **Review environment variables**

## Testing Locally

```bash
# Install dependencies
npm ci

# Build the app
npm run build

# Start production server
npm start
```

The app should run on the port specified by the PORT environment variable (default: 3000).