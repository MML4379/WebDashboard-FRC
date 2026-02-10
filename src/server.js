const express = require('express');
const path = require('path');
const cors = require('cors');
const { NetworkTables, NetworkTablesTypeInfos } = require('ntcore-ts-client');
const colors = require('colors');
const os = require('os');

const app = express();
const PORT = 5809;
const TEAM = 7250;
const TEAM_IP = '10.72.50.2';
const LOCAL = '127.0.0.1';
const args = process.argv.slice(2);

app.use(cors());
app.use(express.json());

// Create NetworkTables client
const serverAddress = args[0] === "local" ? LOCAL : TEAM_IP;
const nt = NetworkTables.getInstanceByURI(serverAddress, 5810);

console.log(`Connecting to NetworkTables at ${serverAddress}:5810`.cyan);

// Cache to store all NetworkTables data
const dataCache = {};

// Create a prefix topic for SmartDashboard to get all subtopics
const smartDashboardTopic = nt.createPrefixTopic('/SmartDashboard/');

// Subscribe to all topics under SmartDashboard
smartDashboardTopic.subscribe((value, params) => {
    try {
        // Remove the /SmartDashboard/ prefix from the topic name
        let key = params.name;
        if (key.startsWith('/SmartDashboard/')) {
            key = key.substring('/SmartDashboard/'.length);
        }
        
        // Skip if key is empty
        if (!key) return;
        
        // Parse nested keys (e.g., "subsystem/value" -> dataCache.subsystem.value)
        const keyParts = key.split('/');
        let current = dataCache;
        
        for (let i = 0; i < keyParts.length - 1; i++) {
            if (!current[keyParts[i]]) {
                current[keyParts[i]] = {};
            }
            current = current[keyParts[i]];
        }
        
        // Set the value at the final key
        current[keyParts[keyParts.length - 1]] = value;
    } catch (e) {
        console.error(`Error processing topic ${params.name}:`, e.message);
    }
});

// Add connection listener
nt.addRobotConnectionListener((connected) => {
    if (connected) {
        console.log('Connected to robot!'.green);
    } else {
        console.log('Disconnected from robot'.red);
    }
});

app.use(express.static(path.join(__dirname, "public")));

app.get('/api/status', (req, res) => {
    let status = {
        version: '1.0',
        message: "OK",
        status: 200,
        port: PORT,
        team: TEAM,
        connected: nt.isRobotConnected()
    };

    res.status(200).json(status);
});

function getIP(type) {
    const interfaces = os.networkInterfaces();
    switch (type) {
        case "IPv4":
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    // skip loopback addresses
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
            break;
        case "IPv6":
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    // skip loopback addresses
                    if (iface.family === 'IPv6' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
            break;
        default:
            console.log("Could not fetch IP address - invalid IP Version!".yellow);
    }
    
    return '0.0.0.0'; // fallback if none are found
}

app.get('/api/robot-data', (req, res) => {
    try {
        // Return the cached data
        res.status(200).json(dataCache);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message
        });
    }
});

app.get("*Dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log("Listening for requests on:", `http://${getIP(args[1])}:${PORT}`.green);
    if (args[0] === "local") {
        console.log("Using AdvantageScope!".bgWhite.blue);
    } else if (args[0] === "robot") {
        console.log("Using Robot!".bgWhite.blue);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});