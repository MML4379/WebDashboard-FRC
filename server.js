const express = require('express');

const path = require('path');

const cors = require('cors');

const { NetworkTables, NetworkTablesTypeInfos } = require('ntcore-ts-client');

const colors = require('colors');

const os = require('os');

require('dotenv').config();



const app = express();

const PORT = process.env.PORT || 3000;

const TEAM = process.env.TEAM || 0;

const LOCAL = '127.0.0.1';



const args = process.argv.slice(2);



app.use(cors());

app.use(express.json());



// --- CRITICAL: GLOBAL ERROR HANDLER ---

// WPILib 2026/NT4.1 can sometimes send packets that trigger Zod validation failures

// in the client. This prevents the "ZodError: Number must be >= 0" crash.

process.on('uncaughtException', (error) => {

    const isZodError = error?.name === 'ZodError' || error?.stack?.includes('ntcore-ts-client');

   

    if (isZodError) {

        // Silently catch or log a warning instead of crashing

        console.warn('[NT-Client] Ignored a malformed packet (ZodError). Continuing...'.yellow);

        return;

    }

   

    console.error('CRITICAL ERROR:'.red.bold, error);

    process.exit(1);

});



// Create NetworkTables client

let nt;

if (args[0] === "local") {

    nt = NetworkTables.getInstanceByURI(LOCAL, 5810);

    console.log(`Connecting to NetworkTables at ${LOCAL}:5810`.cyan);

} else {

    console.log(`Connecting to NetworkTables for team ${TEAM}`.cyan);

    nt = NetworkTables.getInstanceByTeam(parseInt(TEAM));

}



const dataCache = {

    DriveState: {

        Pose: { x: 0, y: 0, rotation: 0 },

        Speeds: { vx: 0, vy: 0, omega: 0 }

    }

};



let isConnected = false;



nt.addRobotConnectionListener((connected) => {

    isConnected = connected;

    if (connected) {

        console.log('✓ Connected to robot!'.green.bold);

    } else {

        console.log('✗ Not Connected to robot'.red);

    }

}, true); // 'true' triggers immediate check of current state



// Recursive Cache Builder

const updateCache = (name, value) => {

    let key = name;

    if (key.startsWith('/SmartDashboard/')) {

        key = key.substring('/SmartDashboard/'.length);

    }

    if (!key) return;



    const keyParts = key.split('/');

    let current = dataCache;



    for (let i = 0; i < keyParts.length - 1; i++) {

        if (!current[keyParts[i]] || typeof current[keyParts[i]] !== 'object') {

            current[keyParts[i]] = {};

        }

        current = current[keyParts[i]];

    }

    current[keyParts[keyParts.length - 1]] = value;

};



// Generic SmartDashboard Subscriber

try {

    const sdPrefix = nt.createPrefixTopic('/SmartDashboard/');

    sdPrefix.subscribe((value, params) => {

        try {

            updateCache(params.name, value);

        } catch (e) {

            // Ignore processing errors for individual topics

        }

    });

} catch (e) {

    console.log('Prefix subscription failed:'.yellow, e.message);

}



// Specific Listeners for Pose/Speeds

// Note: Ensure robot is sending double[] and not a "Struct" type

const poseTopic = nt.createTopic('/SmartDashboard/DriveState/PoseArray', NetworkTablesTypeInfos.kDoubleArray);

poseTopic.subscribe((value) => {

    if (Array.isArray(value) && value.length >= 3) {

        dataCache.DriveState.Pose = { x: value[0], y: value[1], rotation: value[2] };

    }

});



const speedsTopic = nt.createTopic('/SmartDashboard/DriveState/SpeedsArray', NetworkTablesTypeInfos.kDoubleArray);

speedsTopic.subscribe((value) => {

    if (Array.isArray(value) && value.length >= 3) {

        dataCache.DriveState.Speeds = { vx: value[0], vy: value[1], omega: value[2] };

    }

});



// API Routes

app.get('/api/status', (req, res) => {

    res.json({

        connected: nt.isRobotConnected() || isConnected,

        team: TEAM,

        mode: args[0] || 'robot'

    });

});



app.get('/api/robot-data', (req, res) => {

    res.status(200).json(dataCache);

});



// SendableChooser Handler

app.post('/api/chooser', (req, res) => {

    const { key, value } = req.body;

    if (!key || value === undefined) return res.status(400).send('Missing key/value');



    const ntPath = key.startsWith('/') ? `${key}/selected` : `/SmartDashboard/${key}/selected`;

    const topic = nt.createTopic(ntPath, NetworkTablesTypeInfos.kString);

    topic.publish();

    topic.setValue(value);

   

    res.json({ success: true });

});



app.use(express.static(path.join(__dirname, "public")));



app.get("*Dashboard", (req, res) => {

    res.sendFile(path.join(__dirname, 'public', 'index.html'));

});



// Helper for IP Logging

function getIP() {

    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {

        for (const iface of interfaces[name]) {

            if (iface.family === 'IPv4' && !iface.internal) return iface.address;

        }

    }

    return 'localhost';

}



app.listen(PORT, () => {

    console.log(`\nServer active at: http://${getIP()}:${PORT}`.green);

    console.log(`Mode: ${args[0] === 'local' ? 'Simulation' : 'Robot'}`.bgWhite.blue);

});