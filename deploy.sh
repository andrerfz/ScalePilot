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
  echo "TAILSCALE_AUTH_KEY=tskey-auth-xxxxxxxxxxxx"
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

# Create SWAG configuration directory if it doesn't exist
if [ ! -d swag/config/nginx/site-confs ]; then
  echo "Creating SWAG configuration directory structure..."
  mkdir -p swag/config/nginx/site-confs
fi

# Deploy Docker containers
echo "All required files found. Deploying Docker containers..."
docker-compose down
docker-compose up -d --build

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo
  echo "Deployment completed successfully!"
  echo
  echo "Your IoT Pilot should now be accessible at:"
  echo "  - Local: http://localhost (port 80)"
  domain=$(grep DOMAIN .env | cut -d= -f2)
  if [ ! -z "$domain" ]; then
    echo "  - Internet (when DNS propagates): http://$domain"
  fi
  echo
  echo "Check Tailscale Authentication:"
  echo "  docker logs tailscale | grep 'To authenticate'"
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