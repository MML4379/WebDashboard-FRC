// ================================================
// DriveBoard - A FRC Dashboard by Michael
// Main Entry Point
// ================================================

import { router, navigateTo } from './router.js';
import { startDataPolling, getRobotData, getIsConnected, fetchRobotData, fetchStatus } from './dataManager.js';
import { initConnectionStatus } from './connectionStatus.js';
import { initDisplay } from './display.js';

// ================================================
// Initialization
// ================================================

function init() {
    // Setup navigation
    setupNavigation();
    
    // Initialize router
    router();
    
    // Initialize UI components
    initConnectionStatus();
    initDisplay();
    
    // Start data polling
    startDataPolling();
    
    // Log startup
    logStartup();
}

function setupNavigation() {
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            navigateTo(link.href);
        }
    });
    
    window.addEventListener('popstate', router);
}

function logStartup() {
    console.log('%cDriveBoard', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
    console.log('%cField2D visualization ready', 'color: #888;');
}

// ================================================
// Start DriveBoard
// ================================================

document.addEventListener('DOMContentLoaded', init);

// ================================================
// Exports (for external access if needed)
// ================================================

export {
    getRobotData as robotData,
    getIsConnected as isConnected,
    fetchRobotData,
    fetchStatus
};