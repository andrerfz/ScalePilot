#!/bin/bash

echo "=== IoT Pilot Deployment ==="
echo

# Check for required environment files
MISSING_FILES=0

# Check .env file
if [ ! -f .env ]; then
  echo "ERROR: .env file is missing. Please create it from .env.example"
  echo "Example content:"
  echo "DOMAIN=yourdomain.ddns.net"
  echo "EMAIL=youremail@example.com"
  MISSING_FILES=1
fi

# Check tailscale.env file
if [ ! -f tailscale.env ]; then
  echo "ERROR: tailscale.env file is missing. Please create it from tailscale.env.example"
  echo "Example content:"
  echo "NOIP_USERNAME=your_noip_username"
  echo "NOIP_PASSWORD=your_noip_password"
  echo "NOIP_HOSTNAMES=yourdomain.ddns.net"
  MISSING_FILES=1
fi

# Check Dockerfile existence
if [ ! -f Docker/Dockerfile ]; then
  echo "ERROR: Dockerfile not found at Docker/Dockerfile"
  MISSING_FILES=1
fi

# Exit if any files are missing
if [ $MISSING_FILES -eq 1 ]; then
  echo
  echo "Deployment aborted due to missing files. Please fix the issues and try again."
  exit 1
fi

# Deploy Docker containers - specifying the dockerfile path
echo "All required files found. Deploying Docker containers..."
docker-compose -f docker-compose.yml up -d --build

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo
  echo "Deployment completed successfully!"
  echo
  echo "Your IoT Pilot should now be accessible at: https://$(grep DOMAIN .env | cut -d= -f2)"
  echo
  echo "Useful commands:"
  echo "  docker-compose logs -f     # View logs"
  echo "  docker-compose down        # Stop containers"
  echo "  docker-compose restart     # Restart containers"
else
  echo
  echo "Deployment failed. Please check the Docker error messages above."
  exit 1
fi