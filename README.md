# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Continuous Integration

On every push and pull request to the `main` branch, the workflow:

1. Sets up Node.js environment
2. Installs dependencies
3. Runs type checking
4. Builds the application

### Continuous Deployment

When code is pushed to the `main` branch (not on pull requests), the workflow:

1. Builds a Docker image using the project's Dockerfile
2. Pushes the image to GitHub Container Registry (GHCR) with two tags:
   - `latest` tag for the most recent version
   - A specific tag using the commit SHA for versioning

### Using the Docker Image

Once the workflow completes, you can pull and run the Docker image:

```bash
# Pull the image
docker pull ghcr.io/YOUR_GITHUB_USERNAME/ai-resume-analyser:latest

# Run the container
docker run -p 3000:3000 ghcr.io/YOUR_GITHUB_USERNAME/ai-resume-analyser:latest
```

Note: Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
