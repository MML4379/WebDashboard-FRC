import { router, navigateTo } from './router.js';

// Store for robot data
let robotData = {};
let isConnected = false;

// Fetch robot data from the API
async function fetchRobotData() {
    try {
        const response = await fetch('/api/robot-data');
        if (response.ok) {
            robotData = await response.json();
            updateDisplay();
        }
    } catch (error) {
        console.error('Error fetching robot data:', error);
    }
}

// Fetch connection status
async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const status = await response.json();
            isConnected = status.connected;
            updateConnectionStatus();
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        isConnected = false;
        updateConnectionStatus();
    }
}

// Update connection status indicator
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
        statusElement.className = isConnected ? 'status-connected' : 'status-disconnected';
    }
}

// Check if data is a Field2d object
function isField2d(data) {
    return data && (data['.type'] === 'Field2d' || data['Robot'] !== undefined);
}

// Create a Field2d visualization card
function createField2dCard(categoryName, field2dData) {
    const card = document.createElement('div');
    card.className = 'category-card field2d-card';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.textContent = categoryName + ' (Field2d)';
    card.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'card-content field2d-content';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'field2d-canvas';
    canvas.width = 800;
    canvas.height = 400;
    content.appendChild(canvas);
    
    card.appendChild(content);
    
    // Draw the field
    drawField2d(canvas, field2dData);
    
    return card;
}

// Draw Field2d visualization
function drawField2d(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    // Field dimensions (FRC field is 54ft x 27ft or 16.46m x 8.23m)
    const fieldWidth = 16.46; // meters
    const fieldHeight = 8.23; // meters
    const padding = 40;
    
    // Calculate scale to fit field in canvas
    const scaleX = (width - 2 * padding) / fieldWidth;
    const scaleY = (height - 2 * padding) / fieldHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the field
    const offsetX = (width - fieldWidth * scale) / 2;
    const offsetY = (height - fieldHeight * scale) / 2;
    
    // Draw field outline
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, fieldWidth * scale, fieldHeight * scale);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= fieldWidth; i++) {
        const x = offsetX + i * scale;
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, offsetY + fieldHeight * scale);
        ctx.stroke();
    }
    for (let i = 0; i <= fieldHeight; i++) {
        const y = offsetY + i * scale;
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + fieldWidth * scale, y);
        ctx.stroke();
    }
    
    // Helper function to convert field coordinates to canvas coordinates
    function fieldToCanvas(x, y) {
        return {
            x: offsetX + x * scale,
            y: offsetY + (fieldHeight - y) * scale // Flip Y axis
        };
    }
    
    // Draw trajectories if present
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('.') || key === 'Robot') continue;
        
        if (Array.isArray(value) && value.length > 0) {
            // Check if it's an array of poses
            if (Array.isArray(value[0])) {
                ctx.strokeStyle = '#64B5F6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                for (let i = 0; i < value.length; i++) {
                    const pose = value[i];
                    if (pose.length >= 2) {
                        const pos = fieldToCanvas(pose[0], pose[1]);
                        if (i === 0) {
                            ctx.moveTo(pos.x, pos.y);
                        } else {
                            ctx.lineTo(pos.x, pos.y);
                        }
                    }
                }
                ctx.stroke();
                
                // Draw points along trajectory
                ctx.fillStyle = '#64B5F6';
                for (const pose of value) {
                    if (pose.length >= 2) {
                        const pos = fieldToCanvas(pose[0], pose[1]);
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }
    }
    
    // Draw robot pose
    if (data.Robot && Array.isArray(data.Robot) && data.Robot.length >= 2) {
        const x = data.Robot[0];
        const y = data.Robot[1];
        const rotation = data.Robot[2] || 0; // Rotation in radians
        
        const pos = fieldToCanvas(x, y);
        
        // Draw robot body (rectangle)
        const robotWidth = 0.8 * scale; // ~0.8m
        const robotHeight = 0.8 * scale;
        
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(-rotation); // Negative because canvas Y is flipped
        
        // Robot body
        ctx.fillStyle = '#FF6B6B';
        ctx.fillRect(-robotWidth / 2, -robotHeight / 2, robotWidth, robotHeight);
        
        // Robot direction indicator (arrow)
        ctx.fillStyle = '#FFD54F';
        ctx.beginPath();
        ctx.moveTo(robotWidth / 2, 0);
        ctx.lineTo(robotWidth / 2 - 10, -8);
        ctx.lineTo(robotWidth / 2 - 10, 8);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Draw coordinate text
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '12px monospace';
        ctx.fillText(`X: ${x.toFixed(2)}m`, offsetX + 10, offsetY + 20);
        ctx.fillText(`Y: ${y.toFixed(2)}m`, offsetX + 10, offsetY + 35);
        ctx.fillText(`θ: ${(rotation * 180 / Math.PI).toFixed(1)}°`, offsetX + 10, offsetY + 50);
    }
    
    // Draw other objects/poses
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('.') || key === 'Robot') continue;
        
        if (Array.isArray(value) && value.length >= 2 && !Array.isArray(value[0])) {
            // Single pose
            const pos = fieldToCanvas(value[0], value[1]);
            
            ctx.fillStyle = '#81C784';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Label
            ctx.fillStyle = '#e0e0e0';
            ctx.font = '10px sans-serif';
            ctx.fillText(key, pos.x + 10, pos.y - 10);
        }
    }
}

// Create a regular category card
function createCategoryCard(categoryName, categoryData) {
    const card = document.createElement('div');
    card.className = 'category-card';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.textContent = categoryName;
    card.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    renderDataInCard(categoryData, content);
    
    card.appendChild(content);
    return card;
}

// Render data within a card
function renderDataInCard(data, parentElement, depth = 0) {
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            // Nested object - create a subsection
            const subsection = document.createElement('div');
            subsection.className = 'data-subsection';
            subsection.style.marginLeft = `${depth * 15}px`;
            
            const subheader = document.createElement('div');
            subheader.className = 'subsection-header';
            subheader.textContent = key;
            subsection.appendChild(subheader);
            
            const container = document.createElement('div');
            container.className = 'subsection-content';
            subsection.appendChild(container);
            
            parentElement.appendChild(subsection);
            
            // Recursively render nested data
            renderDataInCard(value, container, depth + 1);
        } else {
            // Leaf node - create a data row
            const row = document.createElement('div');
            row.className = 'data-row';
            row.style.marginLeft = `${depth * 15}px`;
            
            const label = document.createElement('span');
            label.className = 'data-label';
            label.textContent = key;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'data-value';
            valueSpan.textContent = formatValue(value);
            valueSpan.setAttribute('data-type', typeof value);
            
            row.appendChild(label);
            row.appendChild(valueSpan);
            parentElement.appendChild(row);
        }
    }
}

// Format values for display
function formatValue(value) {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'number') {
        // Round numbers to 3 decimal places
        return value.toFixed(3);
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (Array.isArray(value)) {
        return `[${value.join(', ')}]`;
    }
    return String(value);
}

// Update the display with current data
function updateDisplay() {
    const container = document.getElementById('robot-data-container');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    if (Object.keys(robotData).length === 0) {
        container.innerHTML = '<p class="no-data">No data available</p>';
        return;
    }
    
    // Create a card for each top-level category
    for (const [categoryName, categoryData] of Object.entries(robotData)) {
        let card;
        
        // Check if this is a Field2d object
        if (typeof categoryData === 'object' && isField2d(categoryData)) {
            card = createField2dCard(categoryName, categoryData);
        } else {
            card = createCategoryCard(categoryName, categoryData);
        }
        
        container.appendChild(card);
    }
}

// Start polling for data
function startDataPolling(interval = 100) {
    // Fetch immediately
    fetchRobotData();
    fetchStatus();
    
    // Then poll at regular intervals
    setInterval(fetchRobotData, interval);
    setInterval(fetchStatus, 1000); // Check connection less frequently
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Handle link clicks
    document.body.addEventListener("click", e => {
        if (e.target.closest("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });//a

    // Initialize router
    router();
    
    // Start fetching robot data
    startDataPolling();
});

// Handle forward/back buttons
window.addEventListener('popstate', router);

// Export for use in other modules if needed
export { robotData, isConnected, fetchRobotData, fetchStatus };