const express = require('express');
const path = require('path');
const cors = require('cors');
const { NetworkTables, NetworkTablesTypeInfos } = require('ntcore-ts-client');
const colors = require('colors');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;
const TEAM = process.env.TEAM;
const TEAM_IP = process.env.RIO;
const LOCAL = '127.0.0.1';

const USER = process.env.API_USER;
const TOKEN = process.env.API_TOKEN;

const args = process.argv.slice(2);

app.use(cors());
app.use(express.json());

var API_HEADERS = new Headers();
API_HEADERS.append("Authorization", `Basic ${USER} ${TOKEN}`);
API_HEADERS.append("If-Modified-Since", "");

var REQ_OPTIONS = {
    method: 'GET',
    headers: API_HEADERS,
    redirect: 'follow'
};

// Create NetworkTables client
let nt;
if (args[0] === "local") {
    nt = NetworkTables.getInstanceByURI(LOCAL, 5810);
    console.log(`Connecting to NetworkTables at ${LOCAL}:5810`.cyan);
} else {
    console.log(`Connecting to NetworkTables for team ${TEAM}`.cyan);
    nt = NetworkTables.getInstanceByTeam(parseInt(TEAM));
}

// Cache to store all NetworkTables data
const dataCache = {
    DriveState: {
        Pose: null,
        Speeds: null
    }
};

// Track connection state
let isConnected = false;

// Handle uncaught exceptions from struct validation
process.on('uncaughtException', (error) => {
    if (error && error.name === 'ZodError') {
        const errorMessage = error.message || '';
        if (errorMessage.includes('struct:') || 
            (error.issues && error.issues.some(issue => 
                issue.received && typeof issue.received === 'string' && 
                issue.received.startsWith('struct:')
            ))) {
            return;
        }
    }
    
    console.error('Uncaught Exception:'.red);
    console.error('Name:'.red, error.name);
    console.error('Message:'.red, error.message);
    if (error.stack) {
        console.error('Stack:'.red, error.stack);
    }
    process.exit(1);
});

// Add connection listener
nt.addRobotConnectionListener((connected) => {
    isConnected = connected;
    if (connected) {
        console.log('✓ Connected to robot!'.green.bold);
    } else {
        console.log('✗ Disconnected from robot'.red);
    }
});

console.log('Waiting for connection...'.yellow);

// Subscribe to SmartDashboard prefix for general data
try {
    const sdPrefix = nt.createPrefixTopic('/SmartDashboard/');
    sdPrefix.subscribe((value, params) => {
        try {
            let key = params.name;
            if (key.startsWith('/SmartDashboard/')) {
                key = key.substring('/SmartDashboard/'.length);
            }
            
            if (!key) return;
            
            const keyParts = key.split('/');
            let current = dataCache;
            
            for (let i = 0; i < keyParts.length - 1; i++) {
                if (!current[keyParts[i]]) {
                    current[keyParts[i]] = {};
                }
                current = current[keyParts[i]];
            }
            
            current[keyParts[keyParts.length - 1]] = value;
        } catch (e) {
            console.error(`Error processing topic ${params.name}:`, e.message);
        }
    });
} catch (e) {
    console.log('Could not create SmartDashboard prefix subscription:'.yellow, e.message);
}

// Subscribe to PoseArray (double[]) - published from robot as primitive array
const poseTopic = nt.createTopic('/SmartDashboard/DriveState/PoseArray', NetworkTablesTypeInfos.kDoubleArray);
poseTopic.subscribe((value) => {
    if (Array.isArray(value) && value.length >= 3) {
        dataCache.DriveState.Pose = {
            x: value[0],
            y: value[1],
            rotation: value[2]
        };
        console.log(`✓ Pose: x=${value[0].toFixed(2)}, y=${value[1].toFixed(2)}, θ=${(value[2] * 180 / Math.PI).toFixed(1)}°`.green);
    }
});

// Subscribe to SpeedsArray (double[]) - published from robot as primitive array
const speedsTopic = nt.createTopic('/SmartDashboard/DriveState/SpeedsArray', NetworkTablesTypeInfos.kDoubleArray);
speedsTopic.subscribe((value) => {
    if (Array.isArray(value) && value.length >= 3) {
        dataCache.DriveState.Speeds = {
            vx: value[0],
            vy: value[1],
            omega: value[2]
        };
        console.log(`✓ Speeds: vx=${value[0].toFixed(2)}, vy=${value[1].toFixed(2)}, ω=${value[2].toFixed(2)}`.blue);
    }
});

app.use(express.static(path.join(__dirname, "public")));

app.get('/api/status', (req, res) => {
    const connected = nt.isRobotConnected() || isConnected;
    
    let status = {
        version: '1.0',
        message: "OK",
        status: 200,
        port: parseInt(PORT),
        team: parseInt(TEAM),
        connected: connected
    };

    res.status(200).json(status);
});

function getIP(type) {
    const interfaces = os.networkInterfaces();
    switch (type) {
        case "IPv4":
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
            break;
        case "IPv6":
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv6' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
            break;
        default:
            console.log("Could not fetch IP address - invalid IP Version!".yellow);
    }
    
    return '0.0.0.0';
}

app.get('/api/robot-data', (req, res) => {
    try {
        res.status(200).json(dataCache);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message
        });
    }
});

app.get('/api/debug/topics', (req, res) => {
    res.status(200).json({
        connected: nt.isRobotConnected() || isConnected,
        cache: dataCache,
        cacheKeys: Object.keys(dataCache)
    });
});

app.get('/api/frc-events/events', (req, res) => {
    const eventData = fetch("https://frc-api.firstinspires.org/v3.0/2025/events?districtCode=FIM", REQ_OPTIONS)
                        .then(response => response.text())
                        .then(result => console.log(result))
                        .catch(error => console.log("Error!".red, `${error}`.red));
    if (eventData) res.status(200).json(eventData);
    else res.status(500).json({
        'message': "An error has occured!",
        'code': 500
    });
});

app.get("*Dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log("Listening for requests on:", `http://${getIP(args[1])}:${PORT}`.green);
    if (args[0] === "local") {
        console.log("Mode: AdvantageScope/Simulation".bgWhite.blue);
    } else if (args[0] === "robot") {
        console.log("Mode: Robot".bgWhite.blue);
    }
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});