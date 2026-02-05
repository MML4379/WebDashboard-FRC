const express = require('express');
const path = require('path');
const cors = require('cors');
const ntcore = require('node-ntcore');

const app = express();
const PORT = 5810;
const TEAM = 7250;
const TEAM_IP = '10.72.50.2'

app.use(cors());
app.use(express.json());

const inst = ntcore.NetworkTableInstance.getDefault();
inst.startClient(TEAM_IP, 1735);

app.use(express.static(path.join(__dirname, "public")));

app.get('/api/status', (req, res) => {
    let status = {
        version: '1.0',
        message: "OK",
        status: 200,
        port: PORT,
        team: TEAM
    };

    res.status(200).json(status);
});

const table = inst.getTable('SmartDashboard');

// Helper function to recursively get all data
function getTableData(ntTable) {
    const data = {};
    
    // Get all keys in this table
    const keys = ntTable.getKeys();
    
    // Get the value for each key
    keys.forEach(key => {
        try {
            const entry = ntTable.getEntry(key);
            const value = entry.getValue();
            data[key] = value;
        } catch (e) {
            console.error(`Error reading key ${key}:`, e.message);
        }
    });
    
    // Get all subtables recursively
    const subtables = ntTable.getSubTables();
    subtables.forEach(subtableName => {
        try {
            const subtable = ntTable.getSubTable(subtableName);
            data[subtableName] = getTableData(subtable);
        } catch (e) {
            console.error(`Error reading subtable ${subtableName}:`, e.message);
        }
    });
    
    return data;
}

app.get('/api/robot-data', (req, res) => {
    try {
        const data = getTableData(table);
        res.status(200).json(data);
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
    console.log(`Server is listening on http://localhost:${PORT}.`);
});