# AI Resume Analyser - Docker Image

## Docker Image Information

- **Repository**: [jeet5/ai-resume-analyser](https://hub.docker.com/r/jeet5/ai-resume-analyser)
- **Tag**: latest
- **Digest**: sha256:2420a1b622c3a3732d112d77b57456e771e6a9a94f2f67ae5bcf5e17f6e91dad

## Description

This Docker image contains the AI Resume Analyser application, a tool designed to analyze resumes and provide insights. The application is built with React and uses React Router for server-side rendering.

## Usage Instructions

### Pulling the Image

To pull the Docker image from Docker Hub, run:

```bash
docker pull jeet5/ai-resume-analyser:latest
```

### Running the Container

To run the application in a container:

```bash
docker run -p 3000:3000 jeet5/ai-resume-analyser:latest
```

This will start the application and map port 3000 from the container to port 3000 on your host machine. You can then access the application by navigating to `http://localhost:3000` in your web browser.

### Environment Variables

If the application requires any environment variables, you can set them using the `-e` flag:

```bash
docker run -p 3000:3000 -e VAR_NAME=value jeet5/ai-resume-analyser:latest
```

## Building the Image Locally

If you want to build the image locally from the source code:

1. Clone the repository
2. Navigate to the project directory
3. Run the build command:

```bash
docker build -t ai-resume-analyser .
```

## Dockerfile Details

The Dockerfile uses a multi-stage build process to optimize the final image size:

1. **Stage 1**: Installs all dependencies (including dev dependencies)
2. **Stage 2**: Installs only production dependencies
3. **Stage 3**: Builds the application
4. **Final Stage**: Creates a minimal production image with only the necessary files

## Technical Details

- Base Image: node:20-alpine
- Exposed Port: 3000 (default for React Router)
- Start Command: `npm run start`

## Support

For issues or questions about this Docker image, please open an issue in the GitHub repository or contact the maintainer.