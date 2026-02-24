// ================================================
// Connection Status UI
// ================================================

import { getIsConnected, onConnectionChange } from './dataManager.js';

/**
 * Update the connection status display
 */
export function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    const connected = getIsConnected();
    
    statusElement.innerHTML = `
        <span class="status-indicator"></span>
        <span>${connected ? 'Connected' : 'Disconnected'}</span>
    `;
    
    statusElement.className = connected ? 'status-connected' : 'status-disconnected';
}

/**
 * Initialize connection status updates
 */
export function initConnectionStatus() {
    // Initial update
    updateConnectionStatus();
    
    // Subscribe to changes
    onConnectionChange(updateConnectionStatus);
}