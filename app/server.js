const net = require('net');
const express = require('express');
const app = express();
const deviceManager = require('./deviceManager');
const HTTP_PORT = process.env.PORT || 4000;

// Commands for HF2211 scales
const COMMANDS = {
    weight: Buffer.from([0x02, 0x30, 0x30, 0x46, 0x46, 0x52, 0x30, 0x31, 0x30, 0x37, 0x30, 0x30, 0x30, 0x30, 0x03, 0x0D, 0x0A]),
    tare: Buffer.from([0x02, 0x30, 0x30, 0x46, 0x46, 0x45, 0x31, 0x31, 0x30, 0x33, 0x30, 0x30, 0x30, 0x30, 0x03, 0x0D, 0x0A]),
    status: Buffer.from([0x02, 0x30, 0x30, 0x46, 0x46, 0x52, 0x30, 0x31, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x03, 0x0D, 0x0A]),
    clearPresetTare: Buffer.from([0x02, 0x30, 0x30, 0x46, 0x46, 0x57, 0x30, 0x31, 0x30, 0x38, 0x30, 0x38, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x03, 0x0D, 0x0A])
};

// Serve static files
app.use(express.static('public'));
app.use(express.json());

function calculateLRC(data, start, end) {
    let lrc = 0;
    for (let i = start; i < end; i++) {
        lrc ^= data[i];
    }
    return lrc.toString(16).padStart(2, '0').toUpperCase();
}

function formatPresetTareValue(value) {
    // Convert kg to grams (XXXXXX.XX format, grams)
    const grams = Math.round(parseFloat(value) * 1000);
    if (isNaN(grams) || grams < 0 || grams > 30000) {
        throw new Error('Value must be between 0.0 and 30.0 kg');
    }
    // Format as 8-digit ASCII (e.g., 1.0kg -> "00010000")
    return grams.toString().padStart(8, '0');
}

async function sendCommand(command, deviceId = null) {
    // Get the device to use
    let device;
    if (deviceId) {
        device = deviceManager.getDevice(deviceId);
        if (!device) {
            return { type: 'error', error: 'Device not found' };
        }
    } else {
        device = deviceManager.getDefaultDevice();
        if (!device) {
            return { type: 'error', error: 'No devices configured' };
        }
    }

    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let responseData = {};
        let rawResponse = '';

        client.connect(device.port, device.host, () => {
            console.log(`Connected to ${device.name} (${device.host}:${device.port})`);
            console.log('Sending command:', command.toString('hex'));
            client.write(command);
        });

        client.on('data', (data) => {
            rawResponse += data.toString('hex');
            console.log('Raw response:', data.toString('hex'));

            // Weight response
            if (data.length >= 43 && data[5] === 0x72 && data.slice(6, 10).toString('ascii') === '0107') {
                responseData.type = 'weight';
                responseData.gross = data.slice(12, 23).toString('ascii');
                responseData.tare = data.slice(23, 34).toString('ascii');
                responseData.flags = data.slice(34, 38).toString('ascii');
                responseData.lrc = data.slice(38, 40).toString('ascii');
                const computedLRC = calculateLRC(data, 1, 38);
                responseData.lrcValid = computedLRC === responseData.lrc;
                console.log(`Weight LRC: computed=${computedLRC}, received=${responseData.lrc}`);
                const grossVal = parseFloat(responseData.gross.replace('W', '').trim());
                const tareVal = parseFloat(responseData.tare.replace('T', '').trim());
                responseData.net = isNaN(grossVal) || isNaN(tareVal) ? null : grossVal - tareVal;
                const flagsValue = parseInt(responseData.flags.slice(1), 16);
                responseData.statusFlags = {
                    zero: (flagsValue & 0x001) > 0,
                    tare: (flagsValue & 0x002) > 0,
                    stable: (flagsValue & 0x004) > 0,
                    net: (flagsValue & 0x008) > 0,
                    tareMode: (flagsValue & 0x010) > 0 ? 'preset' : 'normal',
                    highResolution: (flagsValue & 0x020) > 0,
                    initialZero: (flagsValue & 0x040) > 0,
                    overload: (flagsValue & 0x080) > 0,
                    negative: (flagsValue & 0x100) > 0,
                    range: (flagsValue & 0x200) > 0 ? 2 : 1,
                    presetTare: (flagsValue & 0x400) > 0
                };
            }
            // Status response
            else if (data.length >= 16 && data[5] === 0x72 && data.slice(6, 10).toString('ascii') === '0100') {
                responseData.type = 'status';
                const dataLength = parseInt(data.slice(10, 12).toString('ascii'), 16);
                if (data.length >= 12 + dataLength + 3) {
                    const statusCode = parseInt(data.slice(12, 12 + dataLength).toString('ascii'), 16);
                    responseData.status = {
                        code: statusCode,
                        description: {
                            0x00: 'No error',
                            0x01: 'Error reading configuration from flash',
                            0x02: 'A/D converter failure',
                            0x03: 'Load cell signal out of range',
                            0x04: 'Load cell signal > 30mV',
                            0x05: 'Load cell signal < -30mV',
                            0x06: 'Load cell power supply failure',
                            0x07: 'Overload (> Max + 9e)',
                            0x08: 'Negative weight (< -19e)',
                            0x40: 'Calibration or mode warning (firmware-specific)'
                        }[statusCode] || 'Unknown'
                    };
                    responseData.lrc = data.slice(12 + dataLength, 14 + dataLength).toString('ascii');
                    const computedLRC = calculateLRC(data, 1, 12 + dataLength);
                    responseData.lrcValid = computedLRC === responseData.lrc;
                    console.log(`Status LRC: computed=${computedLRC}, received=${responseData.lrc}`);
                } else {
                    responseData.type = 'error';
                    responseData.error = 'Incomplete status response';
                }
            }
            // Tare response
            else if (command === COMMANDS.tare && data.length >= 16) {
                responseData.type = 'tare';
                const functionCode = data[5] === 0x65 ? 'execute' : data[5] === 0x77 ? 'write' : 'unknown';
                if (data[5] === 0x65 && data.slice(6, 10).toString('ascii') === '1103') {
                    const resultCode = data.slice(12, 13).toString('ascii');
                    responseData.message = resultCode === '0' ? 'tare executed successfully' :
                        resultCode === '1' ? 'tare failed: Sealing switch locked' :
                            `tare failed: Error code ${resultCode}`;
                    responseData.lrc = data.slice(13, 15).toString('ascii');
                    const computedLRC = calculateLRC(data, 1, 13);
                    responseData.lrcValid = computedLRC === responseData.lrc;
                    console.log(`Tare LRC: computed=${computedLRC}, received=${responseData.lrc}`);
                    if (resultCode === '0') {
                        console.log('Sending clearPresetTareCmd after tare');
                        client.write(COMMANDS.clearPresetTare);
                    }
                } else {
                    responseData.type = 'error';
                    responseData.error = `Unexpected response: function=${functionCode}, address=${data.slice(6, 10).toString('ascii')}`;
                }
            }
            // Clear preset tare or preset tare response
            else if ((command === COMMANDS.clearPresetTare || command.slice(5, 13).toString('ascii') === 'W010808') && data.length >= 16 && data[5] === 0x77) {
                responseData.type = command === COMMANDS.clearPresetTare ? 'clearPreset' : 'presetTare';
                const resultCode = data.slice(12, 13).toString('ascii');
                responseData.message = resultCode === '0' ? `${responseData.type === 'clearPreset' ? 'Preset tare cleared' : 'Preset tare set'} successfully` :
                    resultCode === '1' ? `${responseData.type} failed: Sealing switch locked` :
                        resultCode === '5' ? `${responseData.type} already set/clear or firmware quirk` :
                            `${responseData.type} failed: Error code ${resultCode}`;
                responseData.lrc = data.slice(13, 15).toString('ascii');
                const computedLRC = calculateLRC(data, 1, 13);
                responseData.lrcValid = computedLRC === responseData.lrc;
                console.log(`${responseData.type} LRC: computed=${computedLRC}, received=${responseData.lrc}`);
            }
            else {
                responseData.type = 'error';
                responseData.error = 'Invalid response';
            }
            client.end();
        });

        client.on('error', (err) => {
            console.error(`Connection error for ${device.name} (${device.host}:${device.port}):`, err.message);
            responseData.type = 'error';
            responseData.error = err.message;
            client.end();
        });

        client.on('close', () => {
            if (!responseData.type && rawResponse) {
                responseData.type = 'error';
                responseData.error = `No response parsed, raw: ${rawResponse}`;
            }
            responseData.deviceId = device.id;
            responseData.deviceName = device.name;
            resolve(responseData);
        });

        setTimeout(() => {
            if (!responseData.type) {
                responseData.type = 'error';
                responseData.error = `No response from scale, raw: ${rawResponse || 'none'}`;
                client.end();
            }
        }, 2000);
    });
}

// Initialize device manager before starting the server
(async () => {
    try {
        await deviceManager.init();

        // API Endpoints

        // Device control endpoints
        app.get('/weight', async (req, res) => {
            const deviceId = req.query.deviceId;
            res.json(await sendCommand(COMMANDS.weight, deviceId));
        });

        app.get('/tare', async (req, res) => {
            const deviceId = req.query.deviceId;
            res.json(await sendCommand(COMMANDS.tare, deviceId));
        });

        app.get('/status', async (req, res) => {
            const deviceId = req.query.deviceId;
            res.json(await sendCommand(COMMANDS.status, deviceId));
        });

        app.get('/clearPreset', async (req, res) => {
            const deviceId = req.query.deviceId;
            res.json(await sendCommand(COMMANDS.clearPresetTare, deviceId));
        });

        app.get('/presetTare', async (req, res) => {
            try {
                const value = req.query.value;
                const deviceId = req.query.deviceId;

                if (!value) {
                    return res.json({ type: 'error', error: 'Value query parameter required' });
                }

                const formattedValue = formatPresetTareValue(value);
                const presetTareCmd = Buffer.from(`023030464657303130383038${formattedValue}03`, 'ascii');
                const cmdBuffer = Buffer.concat([presetTareCmd, Buffer.from([0x0D, 0x0A])]);

                res.json(await sendCommand(cmdBuffer, deviceId));
            } catch (error) {
                res.json({ type: 'error', error: error.message });
            }
        });

        // Device management endpoints
        app.get('/api/devices', (req, res) => {
            res.json(deviceManager.getDevices());
        });

        app.get('/api/devices/:id', (req, res) => {
            const device = deviceManager.getDevice(req.params.id);
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            res.json(device);
        });

        app.post('/api/devices', async (req, res) => {
            try {
                const device = await deviceManager.addDevice(req.body);
                res.status(201).json(device);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.put('/api/devices/:id', async (req, res) => {
            try {
                const device = await deviceManager.updateDevice(req.params.id, req.body);
                if (!device) {
                    return res.status(404).json({ error: 'Device not found' });
                }
                res.json(device);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.delete('/api/devices/:id', async (req, res) => {
            const success = await deviceManager.removeDevice(req.params.id);
            if (!success) {
                return res.status(404).json({ error: 'Device not found' });
            }
            res.status(204).send();
        });

        // Start HTTP server
        app.listen(HTTP_PORT, () => {
            console.log(`Server running at http://localhost:${HTTP_PORT}`);
            console.log(`Devices configured: ${deviceManager.getDevices().length}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
})();