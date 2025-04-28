const fs = require('fs').promises;
const path = require('path');

class DeviceManager {
    constructor() {
        this.devices = [];
        this.configPath = path.join(__dirname, 'config', 'devices.json');
        this.initialized = false;
    }

    async init() {
        try {
            // Create config directory if it doesn't exist
            const configDir = path.dirname(this.configPath);
            try {
                await fs.mkdir(configDir, { recursive: true });
            } catch (err) {
                if (err.code !== 'EEXIST') throw err;
            }

            // Load devices from config file
            try {
                const data = await fs.readFile(this.configPath, 'utf8');
                this.devices = JSON.parse(data);
                console.log(`Loaded ${this.devices.length} devices from config`);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    // Config file doesn't exist yet, create with default device
                    this.devices = [{
                        id: 'scale1',
                        name: 'HF2211 Scale',
                        type: 'scale',
                        model: 'HF2211',
                        host: '192.168.1.11',
                        port: 9999,
                        isDefault: true
                    }];
                    await this.saveConfig();
                    console.log('Created default device configuration');
                } else {
                    throw err;
                }
            }

            this.initialized = true;
            return this.devices;
        } catch (err) {
            console.error('Error initializing device manager:', err);
            throw err;
        }
    }

    async saveConfig() {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(this.devices, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error('Error saving device configuration:', err);
            return false;
        }
    }

    getDevices() {
        return this.devices;
    }

    getDevice(id) {
        return this.devices.find(device => device.id === id);
    }

    getDefaultDevice() {
        return this.devices.find(device => device.isDefault) ||
            (this.devices.length > 0 ? this.devices[0] : null);
    }

    async addDevice(device) {
        // Generate ID if not provided
        if (!device.id) {
            device.id = `device_${Date.now()}`;
        }

        // If this is the first device, set it as default
        if (this.devices.length === 0) {
            device.isDefault = true;
        }

        this.devices.push(device);
        await this.saveConfig();
        return device;
    }

    async updateDevice(id, updates) {
        const index = this.devices.findIndex(device => device.id === id);
        if (index === -1) return null;

        // Update the device
        this.devices[index] = { ...this.devices[index], ...updates };

        // If this device is being set as default, unset other defaults
        if (updates.isDefault) {
            this.devices.forEach((device, i) => {
                if (i !== index && device.isDefault) {
                    device.isDefault = false;
                }
            });
        }

        await this.saveConfig();
        return this.devices[index];
    }

    async removeDevice(id) {
        const index = this.devices.findIndex(device => device.id === id);
        if (index === -1) return false;

        const wasDefault = this.devices[index].isDefault;
        this.devices.splice(index, 1);

        // If we removed the default device, set a new default if there are any devices left
        if (wasDefault && this.devices.length > 0) {
            this.devices[0].isDefault = true;
        }

        await this.saveConfig();
        return true;
    }
}

module.exports = new DeviceManager();