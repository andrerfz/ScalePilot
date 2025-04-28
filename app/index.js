console.log('Current directory:', __dirname);
const fs = require('fs');
console.log('Files in directory:', fs.readdirSync(__dirname));

try {
    const server = require('./server');
    console.log('Server loaded successfully');
} catch (error) {
    console.error('Error loading server:', error);
    process.exit(1);
}