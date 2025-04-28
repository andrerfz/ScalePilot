# IotPilot

Micro server designed to provide a bridge connection from App throw IoT devices on local host, providing full remote management and scalability.

🔵Initial focus will be on scale devices, then progressively provide more devices support.


📜 Recap: What We've Done So Far
1. Node.js TCP Client + Web Server
   You wrote a Node.js server that:

Connects to HF2211 IOT devices via TCP sockets.

Serves a basic web panel (index page) for sending commands (weight, tare, etc.).

The app is prepared to scale for multiple devices (we are planning a device manager panel).

2. Dockerization
   We decided to dockerize the Node.js server for easy deployment and future upgrades.

Created a docker-compose.yml that launches:

Your app container (currently named app, but optionally scale-server if you want).

A reverse proxy container (swag), based on SWAG (Secure Web Application Gateway).

A No-IP DDNS update client (noip container).

3. SSL and Reverse Proxy
   Set up SWAG to:

Reverse proxy incoming web traffic to your Node.js app.

Automatically handle HTTPS certificates via Certbot (Let’s Encrypt).

Manage security (optional firewall protections).

Set up SWAG Nginx config (the default file inside site-confs) to point to your app on port 4000 internally.

4. Networking
   Both app, swag, and noip containers are connected through a private Docker network.

Only swag is exposed to the outside world (80 and 443 ports).

📈 Next Steps to Complete the Project

Step	Description	Status
🔵 1.	Finalize the Node.js app to manage multiple devices dynamically (device selector on the front-end, configuration saving).	🔜 (In Progress)
🔵 2.	Finalize the Docker structure:
- Create a simple Dockerfile for the app
- Confirm environment variables	🔜 (Almost ready)
  🔵 3.	Finalize SWAG Nginx config:
- Adjust domain/subdomain
- Verify SSL working.	🔜
  🔵 4.	Configure No-IP DDNS Client:
- Provide credentials for No-IP.
- Confirm DDNS works automatically.	🔜
  🔵 5.	Create a "Devices Manager" Page:
- A table showing configured devices.
- "Add Device" button.
- Link to device "Detail" page.	🔜 (UI/UX part)
  🔵 6.	Remote access test:
- Try accessing remotely with HTTPS + domain.	🔜
  🔵 7.	(Optional) Backup setup for easy scaling to new Raspberry Pis (build a simple install script maybe).	🔜
  🚀 Deployment Vision
  In the final state:

You SSH into a Raspberry Pi 📡

Git pull your project + docker-compose up -d

Node app auto-starts.

Reverse proxy auto-handles HTTPS and DDNS.

You connect remotely (e.g., https://yourdomain.ddns.net) securely 🔐

Through the panel, you add new IoT devices without editing code manually.

📦 Folder Structure So Far (Simplified)
project/
├── app/
│   ├── index.js          # Main entry point
│   ├── server.js         # Server implementation
│   ├── deviceManager.js  # Device management logic
│   ├── package.json      # Node.js dependencies
│   └── public/           # Static web files
│       ├── index.html    # Main web interface
│       └── device.html   # Device control interface
├── Docker/
│   └── Dockerfile        # Docker build definition
├── swag/
│   └── config/
│       └── nginx/
│           └── site-confs/
│               └── default  # Nginx configuration
├── docker-compose.yml    # Docker Compose configuration
├── .env                  # Environment variables for SWAG
└── noip-duc.env          # Environment variables for NoIP

🔥 Immediate Next Step (Recommended):
Let's finish the "multi-device manager" inside the app first, so the web panel can:

List existing devices

Add a new device (IP/Port)

Remove device if needed

Select which device to send commands to

✅ Then after that, finalize Docker and remote access.



# IoT Pilot

A micro server designed to provide a bridge connection from web applications to IoT devices, providing full remote management and scalability.

🔵 Initial focus is on scale devices (HF2211), with plans to progressively add support for more devices.

## Project Overview

### Key Features

- **Multi-Device Management**: Configure and manage multiple IoT devices from a single interface
- **Secure Remote Access**: Access your IoT devices from anywhere through HTTPS
- **Easy Deployment**: Simple Docker-based deployment process
- **API-First Design**: RESTful API for all device operations
- **User-Friendly Interface**: Web-based control panel for device management

## Quick Start

1. Clone this repository
2. Configure environment files:
    - Copy `.env.example` to `.env` and update with your domain
    - Copy `noip-duc.env.example` to `noip-duc.env` and update with your NoIP credentials
3. Run with Docker Compose:
   ```
   docker-compose up -d
   ```
4. Access the interface at https://your-domain.ddns.net

## Application Architecture

The application consists of the following components:

### Server Components

- **Device Manager**: Handles device configuration, persistence, and selection
- **TCP Connection Manager**: Manages low-level communication with IoT devices
- **REST API**: Provides HTTP endpoints for web client interaction
- **Static File Server**: Serves the web interface

### Frontend Components

- **Device Control Panel**: Interface for sending commands to selected devices
- **Device Manager Panel**: Interface for adding, editing, and removing devices

### Integration Components

- **SWAG**: Secure Web Application Gateway for SSL termination and reverse proxying
- **NoIP Client**: Dynamic DNS updater for remote access

## Project Status

The project is fully functional with the following features implemented:

✅ HF2211 Scale Communication
✅ Multi-Device Management
✅ Device Configuration Persistence
✅ Secure Remote Access
✅ User-Friendly Web Interface

## Next Steps

- Add support for additional IoT device types
- Implement user authentication
- Add data logging and visualization
- Develop mobile application
- Create a webhook system for integration with other systems

## API Reference

### Device Control Endpoints

- `GET /weight?deviceId=<id>` - Get current weight reading
- `GET /tare?deviceId=<id>` - Tare the scale
- `GET /status?deviceId=<id>` - Get device status
- `GET /clearPreset?deviceId=<id>` - Clear preset tare
- `GET /presetTare?value=<kg>&deviceId=<id>` - Set preset tare

### Device Management Endpoints

- `GET /api/devices` - List all configured devices
- `GET /api/devices/:id` - Get a specific device
- `POST /api/devices` - Add a new device
- `PUT /api/devices/:id` - Update a device
- `DELETE /api/devices/:id` - Remove a device

## Docker Components

The application is deployed using Docker Compose with the following services:

- **iot-app**: The Node.js application
- **swag**: HTTPS and reverse proxy handling
- **noip-duc**: Dynamic DNS updater for remote access

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.