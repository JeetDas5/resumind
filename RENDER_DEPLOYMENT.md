# Render Deployment Guide

## Quick Setup

1. **Connect your repository to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service:**
   - **Name:** `ai-resume-analyser`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for better performance)

3. **Environment Variables:**
   - `NODE_ENV` = `production`

## Alternative: Using render.yaml

If you have a `render.yaml` file in your repo root (which I've created), Render will automatically use those settings.

## Key Changes Made

1. **Integrated API routes** into React Router v7 using file-based routing
2. **Updated build process** to work with React Router v7
3. **Fixed API endpoint calls** in the frontend to use relative URLs
4. **Used React Router's built-in server** instead of custom Express server

## API Endpoints

- `GET /api` - Welcome message
- `POST /api/scrape` - Scrape job data from URL

## File Structure for API Routes

- `app/routes/api_.ts` - Handles GET /api
- `app/routes/api_.scrape.ts` - Handles POST /api/scrape

## Troubleshooting

If deployment fails:

1. **Check build logs** in Render dashboard
2. **Verify all dependencies** are in package.json
3. **Check Node.js version** (using Node 20)
4. **Review environment variables**
5. **Make sure you're using the latest code** with the fixed API routes

## Testing Locally

```bash
# Install dependencies
npm install

# Build the app
npm run build

# Start production server
npm start
```

The app should run on port 3000 locally and will use Render's PORT environment variable in production.

## Important Notes

- The frontend now calls `/api/scrape` instead of `http://localhost:5000/api/scrape`
- API routes are integrated into the React Router app using file-based routing
- No separate Express server needed
