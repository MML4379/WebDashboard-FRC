// ================================================
// Data Fetching & State Management
// ================================================

import { WIDGET_CONFIG } from './config.js';
import { scrubData } from './utils.js';

// Application state
let robotData = {};
let isConnected = false;
let dataHistory = {};

// Subscribers for state changes
const subscribers = {
    dataChange: [],
    connectionChange: [],
};

// ================================================
// State Accessors
// ================================================

export function getRobotData() {
    return robotData;
}

export function getIsConnected() {
    return isConnected;
}

export function getDataHistory() {
    return dataHistory;
}

// ================================================
// Event Subscription
// ================================================

export function onDataChange(callback) {
    subscribers.dataChange.push(callback);
    return () => {
        const index = subscribers.dataChange.indexOf(callback);
        if (index > -1) subscribers.dataChange.splice(index, 1);
    };
}

export function onConnectionChange(callback) {
    subscribers.connectionChange.push(callback);
    return () => {
        const index = subscribers.connectionChange.indexOf(callback);
        if (index > -1) subscribers.connectionChange.splice(index, 1);
    };
}

function notifyDataChange() {
    subscribers.dataChange.forEach(cb => cb(robotData));
}

function notifyConnectionChange() {
    subscribers.connectionChange.forEach(cb => cb(isConnected));
}

// ================================================
// Data Comparison
// ================================================

function hasDataChanged(newData) {
    return JSON.stringify(newData) !== JSON.stringify(robotData);
}

// ================================================
// History Tracking
// ================================================

function updateDataHistory(data, prefix = '') {
    for (const [key, value] of Object.entries(data)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'number') {
            if (!dataHistory[fullKey]) {
                dataHistory[fullKey] = [];
            }
            
            dataHistory[fullKey].push({ time: Date.now(), value });
            
            // Trim history to max length
            if (dataHistory[fullKey].length > WIDGET_CONFIG.maxGraphHistory) {
                dataHistory[fullKey].shift();
            }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            updateDataHistory(value, fullKey);
        }
    }
}

// ================================================
// API Fetching
// ================================================

export async function fetchRobotData() {
    try {
        const response = await fetch('/api/robot-data');
        
        if (response.ok) {
            const rawData = await response.json();
            const cleanedData = scrubData(rawData);

            if (hasDataChanged(cleanedData)) {
                robotData = cleanedData;
                updateDataHistory(cleanedData);
                notifyDataChange();
            }
        }
    } catch (error) {
        console.error('Error fetching robot data:', error);
    }
}

export async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        
        if (response.ok) {
            const status = await response.json();
            const wasConnected = isConnected;
            isConnected = status.connected;
            
            if (wasConnected !== isConnected) {
                notifyConnectionChange();
            }
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        
        if (isConnected) {
            isConnected = false;
            notifyConnectionChange();
        }
    }
}

// ================================================
// Polling
// ================================================

export function startDataPolling(dataInterval = 100, statusInterval = 1000) {
    // Initial fetch
    fetchRobotData();
    fetchStatus();
    
    // Set up intervals
    setInterval(fetchRobotData, dataInterval);
    setInterval(fetchStatus, statusInterval);
}