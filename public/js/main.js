import { router, navigateTo } from './router.js';

// ================================================
// DriveBoard - A FRC Dashboard by Michael
// ================================================

// Store for robot data
let robotData = {};
let isConnected = false;
let dataHistory = {};

// Widget type detection thresholds
const WIDGET_CONFIG = {
    maxGraphHistory: 100,
    progressBarKeys: ['percent', 'battery', 'pressure', 'capacity', 'level', 'progress'],
    booleanDisplayKeys: ['enabled', 'active', 'ready', 'aligned', 'detected', 'connected', 'limit', 'switch'],
    gaugeKeys: ['speed', 'velocity', 'angle', 'position', 'distance', 'voltage', 'current', 'temperature'],
};

// Field configuration
const FIELD_CONFIG = {
    // Field dimensions in meters
    fieldLength: 16.5354,  // 54'3"
    fieldWidth: 8.001,     // 26'3"
    
    // Robot dimensions in meters
    robotLength: 0.9086,   // ~35.8 inches with bumpers
    robotWidth: 0.9086,    // robot is a square
    
    // Colors (simplified - no field colors)
    colors: {
        background: '#1e1e1e',
        gridLines: 'rgba(255, 255, 255, 0.1)',
        border: '#4CAF50',
        robotBlue: '#1565C0',
        robotRed: '#C62828',
        robotOutline: '#42A5F5',
        robotDirection: '#FFD600',
        trajectory: '#64B5F6',
        trajectoryPoint: '#90CAF9',
        gamePiece: '#FF9800',
        target: '#E91E63',
        text: '#e0e0e0',
        textMuted: '#666666',
    }
};

// ================================================
// Data Fetching & Management
// ================================================

function hasDataChanged(newData) {
    return JSON.stringify(newData) !== JSON.stringify(robotData);
}

function scrubData(data) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => scrubData(item));
    }

    const cleaned = {};
    for (const key in data) {
        const lowerKey = key.toLowerCase();
        const forbidden = lowerKey.includes('module') || lowerKey.includes('pathplanner');

        if (!forbidden) {
            cleaned[key] = scrubData(data[key]);
        }
    }
    return cleaned;
}

async function fetchRobotData() {
    try {
        const response = await fetch('/api/robot-data');
        if (response.ok) {
            let rawData = await response.json();
            const cleanedData = scrubData(rawData);

            if (hasDataChanged(cleanedData)) {
                robotData = cleanedData;
                updateDataHistory(cleanedData);
                updateDisplay();
            }
        }
    } catch (error) {
        console.error("Error fetching robot data:", error);
    }
}

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

function updateDataHistory(data, prefix = '') {
    for (const [key, value] of Object.entries(data)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'number') {
            if (!dataHistory[fullKey]) {
                dataHistory[fullKey] = [];
            }
            dataHistory[fullKey].push({ time: Date.now(), value });
            
            if (dataHistory[fullKey].length > WIDGET_CONFIG.maxGraphHistory) {
                dataHistory[fullKey].shift();
            }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            updateDataHistory(value, fullKey);
        }
    }
}

// ================================================
// Connection Status
// ================================================

function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.innerHTML = `
            <span class="status-indicator"></span>
            <span>${isConnected ? 'Connected' : 'Disconnected'}</span>
        `;
        statusElement.className = isConnected ? 'status-connected' : 'status-disconnected';
    }
}

// ================================================
// Widget Type Detection
// ================================================

function isField2d(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Check for explicit type marker
    if (data['.type'] === 'Field2d') {
        console.log('[Field2D] Detected via .type marker');
        return true;
    }
    
    const keys = Object.keys(data);
    
    // Check each key for pose-like data
    for (const key of keys) {
        if (key.startsWith('.')) continue;
        
        const value = data[key];
        const lowerKey = key.toLowerCase();
        
        // Check if key suggests it's field data
        const isFieldKey = lowerKey.includes('robot') || 
                          lowerKey.includes('trajectory') || 
                          lowerKey.includes('path') ||
                          lowerKey.includes('pose') ||
                          lowerKey.includes('position');
        
        if (isFieldKey) {
            // Check if value is a pose [x, y] or [x, y, theta]
            if (Array.isArray(value) && value.length >= 2 && 
                typeof value[0] === 'number' && typeof value[1] === 'number') {
                console.log(`[Field2D] Detected via key "${key}" with pose data:`, value);
                return true;
            }
            
            // Check for trajectory (array of poses)
            if (Array.isArray(value) && value.length > 0 && 
                Array.isArray(value[0]) && value[0].length >= 2) {
                console.log(`[Field2D] Detected via key "${key}" with trajectory data`);
                return true;
            }
        }
    }
    
    // Also check if ANY key has a "Robot" value that's a pose
    if (data['Robot'] || data['robot']) {
        const robotPose = data['Robot'] || data['robot'];
        if (Array.isArray(robotPose) && robotPose.length >= 2) {
            console.log('[Field2D] Detected via Robot key');
            return true;
        }
    }
    
    return false;
}

function detectWidgetType(key, value) {
    const lowerKey = key.toLowerCase();
    
    if (typeof value === 'boolean') {
        return 'boolean-indicator';
    }
    
    if (typeof value === 'number') {
        if (WIDGET_CONFIG.progressBarKeys.some(k => lowerKey.includes(k))) {
            return 'progress-bar';
        }
        
        if (WIDGET_CONFIG.gaugeKeys.some(k => lowerKey.includes(k))) {
            return 'number-gauge';
        }
    }
    
    if (typeof value === 'object' && value !== null) {
        if (value['.type'] === 'String Chooser' || value['options'] || value['selected']) {
            return 'chooser';
        }
    }
    
    return 'default';
}

function getUnit(key) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('voltage')) return 'V';
    if (lowerKey.includes('current')) return 'A';
    if (lowerKey.includes('temperature') || lowerKey.includes('temp')) return '°C';
    if (lowerKey.includes('velocity') || lowerKey.includes('speed')) return 'm/s';
    if (lowerKey.includes('angle') || lowerKey.includes('rotation') || lowerKey.includes('heading')) return '°';
    if (lowerKey.includes('distance') || lowerKey.includes('position')) return 'm';
    if (lowerKey.includes('percent') || lowerKey.includes('battery')) return '%';
    if (lowerKey.includes('pressure')) return 'PSI';
    return '';
}

// ================================================
// Widget Creators
// ================================================

function createBooleanIndicator(key, value) {
    const widget = document.createElement('div');
    widget.className = 'data-row boolean-indicator-row';
    
    widget.innerHTML = `
        <span class="data-label">${key}</span>
        <div class="boolean-indicator">
            <div class="boolean-light ${value ? 'on' : 'off'}"></div>
            <span class="data-value" data-type="boolean" data-value="${value}">
                ${value ? 'TRUE' : 'FALSE'}
            </span>
        </div>
    `;
    
    return widget;
}

function createNumberGauge(key, value) {
    const unit = getUnit(key);
    const widget = document.createElement('div');
    widget.className = 'number-display';
    
    widget.innerHTML = `
        <span class="number-display-value">${formatValue(value)}<span class="number-display-unit">${unit}</span></span>
        <span class="number-display-label">${key}</span>
    `;
    
    return widget;
}

function createProgressBar(key, value) {
    let percent = value;
    if (value <= 1 && value >= 0) {
        percent = value * 100;
    }
    percent = Math.max(0, Math.min(100, percent));
    
    let fillClass = '';
    if (percent < 20) fillClass = 'danger';
    else if (percent < 50) fillClass = 'warning';
    
    const widget = document.createElement('div');
    widget.className = 'progress-widget';
    
    widget.innerHTML = `
        <div class="progress-header">
            <span class="progress-label">${key}</span>
            <span class="progress-value">${percent.toFixed(1)}%</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill ${fillClass}" style="width: ${percent}%"></div>
        </div>
    `;
    
    return widget;
}

function createChooserWidget(key, data) {
    const widget = document.createElement('div');
    widget.className = 'chooser-widget';
    
    const options = data.options || Object.keys(data).filter(k => !k.startsWith('.'));
    const selected = data.selected || data.active || data.default || '';
    
    let optionsHtml = options.map(opt => `
        <div class="chooser-option ${opt === selected ? 'selected' : ''}" data-value="${opt}">
            ${opt}
        </div>
    `).join('');
    
    widget.innerHTML = `
        <div class="chooser-options">
            ${optionsHtml}
        </div>
    `;
    
    return widget;
}

function createDataRow(key, value) {
    const row = document.createElement('div');
    row.className = 'data-row';
    
    const valueType = typeof value;
    const formattedValue = formatValue(value);
    const dataValue = valueType === 'boolean' ? value.toString() : '';
    
    row.innerHTML = `
        <span class="data-label">${key}</span>
        <span class="data-value" data-type="${valueType}" ${dataValue ? `data-value="${dataValue}"` : ''}>
            ${formattedValue}
        </span>
    `;
    
    return row;
}

// ================================================
// Field2D Visualization
// ================================================

function createField2dCard(categoryName, field2dData) {
    console.log(`[Field2D] Creating card for "${categoryName}"`, field2dData);
    
    const card = document.createElement('div');
    card.className = 'category-card field2d-card';
    
    const cardId = `field2d-${categoryName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    card.innerHTML = `
        <div class="card-header">
            ${categoryName}
        </div>
        <div class="card-content field2d-content">
            <canvas id="${cardId}" class="field2d-canvas"></canvas>
        </div>
    `;
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const canvas = document.getElementById(cardId);
        if (canvas) {
            console.log(`[Field2D] Canvas found, setting up...`);
            setupField2dCanvas(canvas, field2dData);
        } else {
            console.error(`[Field2D] Canvas not found: ${cardId}`);
        }
    }, 0);
    
    return card;
}

function setupField2dCanvas(canvas, data) {
    const container = canvas.parentElement;
    if (!container) {
        console.error('[Field2D] No parent container found');
        return;
    }
    
    const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Maintain aspect ratio of field
        const aspectRatio = FIELD_CONFIG.fieldLength / FIELD_CONFIG.fieldWidth;
        let width = Math.max(rect.width - 20, 400); // minimum 400px width
        let height = width / aspectRatio;
        
        // Cap height
        const maxHeight = 400;
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        console.log(`[Field2D] Canvas resized to ${width}x${height}`);
        return { width, height };
    };
    
    const dimensions = resizeCanvas();
    drawField2d(canvas, data, dimensions);
    
    // Store reference for updates
    canvas._field2dData = data;
    canvas._dimensions = dimensions;
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        const newDimensions = resizeCanvas();
        canvas._dimensions = newDimensions;
        drawField2d(canvas, canvas._field2dData, newDimensions);
    });
    resizeObserver.observe(container);
}

function drawField2d(canvas, data, dimensions) {
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    const colors = FIELD_CONFIG.colors;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate field positioning
    const padding = 30;
    const fieldLength = FIELD_CONFIG.fieldLength;
    const fieldWidth = FIELD_CONFIG.fieldWidth;
    
    const scaleX = (width - 2 * padding) / fieldLength;
    const scaleY = (height - 2 * padding) / fieldWidth;
    const scale = Math.min(scaleX, scaleY);
    
    const fieldPixelWidth = fieldLength * scale;
    const fieldPixelHeight = fieldWidth * scale;
    const offsetX = (width - fieldPixelWidth) / 2;
    const offsetY = (height - fieldPixelHeight) / 2;
    
    // Coordinate conversion helper
    const fieldToCanvas = (x, y) => ({
        x: offsetX + x * scale,
        y: offsetY + (fieldWidth - y) * scale  // Flip Y axis
    });
    
    const metersToPixels = (m) => m * scale;
    
    // ========== Draw Background ==========
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // ========== Draw Field Area ==========
    ctx.fillStyle = '#252525';
    ctx.fillRect(offsetX, offsetY, fieldPixelWidth, fieldPixelHeight);
    
    // ========== Draw Grid Lines ==========
    ctx.strokeStyle = colors.gridLines;
    ctx.lineWidth = 1;
    
    // Vertical lines (every meter)
    for (let x = 0; x <= fieldLength; x++) {
        const px = offsetX + x * scale;
        ctx.beginPath();
        ctx.moveTo(px, offsetY);
        ctx.lineTo(px, offsetY + fieldPixelHeight);
        ctx.stroke();
    }
    
    // Horizontal lines (every meter)
    for (let y = 0; y <= fieldWidth; y++) {
        const py = offsetY + y * scale;
        ctx.beginPath();
        ctx.moveTo(offsetX, py);
        ctx.lineTo(offsetX + fieldPixelWidth, py);
        ctx.stroke();
    }
    
    // ========== Draw Field Border ==========
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, fieldPixelWidth, fieldPixelHeight);
    
    // ========== Draw Axis Labels ==========
    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = 'center';
    
    // X-axis labels (bottom)
    for (let x = 0; x <= fieldLength; x += 2) {
        const px = offsetX + x * scale;
        ctx.fillText(`${x}`, px, offsetY + fieldPixelHeight + 14);
    }
    
    // Y-axis labels (left)
    ctx.textAlign = 'right';
    for (let y = 0; y <= fieldWidth; y += 2) {
        const py = offsetY + (fieldWidth - y) * scale;
        ctx.fillText(`${y}`, offsetX - 6, py + 4);
    }
    
    // ========== Parse and Draw Field Objects ==========
    const objects = parseField2dData(data);
    console.log('[Field2D] Parsed objects:', objects);
    
    // Draw trajectories first (underneath everything)
    for (const obj of objects.trajectories) {
        drawTrajectory(ctx, obj, fieldToCanvas, scale, colors);
    }
    
    // Draw game pieces
    for (const obj of objects.gamePieces) {
        drawGamePiece(ctx, obj, fieldToCanvas, colors);
    }
    
    // Draw targets/waypoints
    for (const obj of objects.targets) {
        drawTarget(ctx, obj, fieldToCanvas, colors);
    }
    
    // Draw robot(s) last (on top)
    for (const robot of objects.robots) {
        drawRobot(ctx, robot, fieldToCanvas, metersToPixels, colors);
    }
}

function parseField2dData(data) {
    const result = {
        robots: [],
        trajectories: [],
        gamePieces: [],
        targets: []
    };
    
    for (const [key, value] of Object.entries(data)) {
        // Skip metadata keys
        if (key.startsWith('.')) continue;
        
        const lowerKey = key.toLowerCase();
        
        // Detect robots
        if (lowerKey.includes('robot') || lowerKey === 'pose' || lowerKey === 'position') {
            const pose = parsePose(value);
            if (pose) {
                result.robots.push({
                    name: key,
                    ...pose,
                    alliance: detectAlliance(key, pose)
                });
                console.log(`[Field2D] Found robot "${key}":`, pose);
            }
            continue;
        }
        
        // Detect trajectories (array of poses)
        if (lowerKey.includes('trajectory') || lowerKey.includes('path') || lowerKey.includes('route')) {
            if (Array.isArray(value) && value.length > 0) {
                const trajectory = parseTrajectory(value);
                if (trajectory) {
                    result.trajectories.push({
                        name: key,
                        points: trajectory
                    });
                }
            }
            continue;
        }
        
        // Detect game pieces
        if (lowerKey.includes('note') || lowerKey.includes('piece') || lowerKey.includes('game') || 
            lowerKey.includes('coral') || lowerKey.includes('algae') || lowerKey.includes('cube') || 
            lowerKey.includes('cone')) {
            const pose = parsePose(value);
            if (pose) {
                result.gamePieces.push({
                    name: key,
                    ...pose
                });
            }
            continue;
        }
        
        // Detect targets/waypoints
        if (lowerKey.includes('target') || lowerKey.includes('waypoint') || lowerKey.includes('goal') ||
            lowerKey.includes('aim') || lowerKey.includes('setpoint')) {
            const pose = parsePose(value);
            if (pose) {
                result.targets.push({
                    name: key,
                    ...pose
                });
            }
            continue;
        }
        
        // Generic pose detection - could be anything
        if (Array.isArray(value)) {
            // Check if it's a trajectory (array of arrays)
            if (value.length > 0 && Array.isArray(value[0])) {
                const trajectory = parseTrajectory(value);
                if (trajectory) {
                    result.trajectories.push({
                        name: key,
                        points: trajectory
                    });
                }
            } else {
                // Single pose - treat as game piece
                const pose = parsePose(value);
                if (pose) {
                    result.gamePieces.push({
                        name: key,
                        ...pose
                    });
                }
            }
        }
    }
    
    return result;
}

function parsePose(value) {
    if (!Array.isArray(value)) return null;
    if (value.length < 2) return null;
    
    const x = parseFloat(value[0]);
    const y = parseFloat(value[1]);
    const rotation = value.length >= 3 ? parseFloat(value[2]) : 0;
    
    if (isNaN(x) || isNaN(y)) return null;
    
    // Validate coordinates are reasonable for FRC field (allow some margin)
    if (x < -2 || x > 20 || y < -2 || y > 12) {
        console.warn(`[Field2D] Pose out of bounds: (${x}, ${y})`);
        return null;
    }
    
    return { x, y, rotation };
}

function parseTrajectory(value) {
    if (!Array.isArray(value) || value.length === 0) return null;
    
    const points = [];
    for (const point of value) {
        const pose = parsePose(point);
        if (pose) {
            points.push(pose);
        }
    }
    
    return points.length > 0 ? points : null;
}

function detectAlliance(key, pose) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('blue')) return 'blue';
    if (lowerKey.includes('red')) return 'red';
    
    // Detect based on position (left half = blue, right half = red)
    if (pose.x < FIELD_CONFIG.fieldLength / 2) {
        return 'blue';
    }
    return 'red';
}

function drawRobot(ctx, robot, fieldToCanvas, metersToPixels, colors) {
    const pos = fieldToCanvas(robot.x, robot.y);
    const robotWidth = metersToPixels(FIELD_CONFIG.robotWidth);
    const robotLength = metersToPixels(FIELD_CONFIG.robotLength);
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-robot.rotation); // Negative because canvas Y is flipped
    
    // Robot shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(
        -robotLength / 2 + 2,
        -robotWidth / 2 + 2,
        robotLength,
        robotWidth
    );
    
    // Robot body
    const bodyColor = robot.alliance === 'red' ? colors.robotRed : colors.robotBlue;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-robotLength / 2, -robotWidth / 2, robotLength, robotWidth);
    
    // Robot border
    ctx.strokeStyle = colors.robotOutline;
    ctx.lineWidth = 2;
    ctx.strokeRect(-robotLength / 2, -robotWidth / 2, robotLength, robotWidth);
    
    // Bumpers
    const bumperWidth = 3;
    ctx.fillStyle = robot.alliance === 'red' ? '#EF5350' : '#42A5F5';
    ctx.fillRect(-robotLength / 2 - bumperWidth, -robotWidth / 2, bumperWidth, robotWidth);
    ctx.fillRect(robotLength / 2, -robotWidth / 2, bumperWidth, robotWidth);
    ctx.fillRect(-robotLength / 2, -robotWidth / 2 - bumperWidth, robotLength, bumperWidth);
    ctx.fillRect(-robotLength / 2, robotWidth / 2, robotLength, bumperWidth);
    
    // Direction indicator (front arrow)
    ctx.fillStyle = colors.robotDirection;
    ctx.shadowColor = colors.robotDirection;
    ctx.shadowBlur = 6;
    
    const arrowSize = Math.min(robotLength, robotWidth) * 0.35;
    ctx.beginPath();
    ctx.moveTo(robotLength / 2 + 8, 0);
    ctx.lineTo(robotLength / 2 - arrowSize * 0.2, -arrowSize * 0.4);
    ctx.lineTo(robotLength / 2 - arrowSize * 0.2, arrowSize * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const crossSize = 6;
    ctx.beginPath();
    ctx.moveTo(-crossSize, 0);
    ctx.lineTo(crossSize, 0);
    ctx.moveTo(0, -crossSize);
    ctx.lineTo(0, crossSize);
    ctx.stroke();
    
    ctx.restore();
}

function drawTrajectory(ctx, trajectory, fieldToCanvas, scale, colors) {
    const points = trajectory.points;
    if (points.length < 2) return;
    
    // Draw path line
    ctx.strokeStyle = colors.trajectory;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    const start = fieldToCanvas(points[0].x, points[0].y);
    ctx.moveTo(start.x, start.y);
    
    for (let i = 1; i < points.length; i++) {
        const pos = fieldToCanvas(points[i].x, points[i].y);
        ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    
    // Draw waypoints
    ctx.fillStyle = colors.trajectoryPoint;
    const waypointInterval = Math.max(1, Math.floor(points.length / 15));
    
    for (let i = 0; i < points.length; i += waypointInterval) {
        const pos = fieldToCanvas(points[i].x, points[i].y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Always draw start and end points
    const endPos = fieldToCanvas(points[points.length - 1].x, points[points.length - 1].y);
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.arc(endPos.x, endPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawGamePiece(ctx, piece, fieldToCanvas, colors) {
    const pos = fieldToCanvas(piece.x, piece.y);
    
    // Outer glow
    ctx.shadowColor = colors.gamePiece;
    ctx.shadowBlur = 8;
    
    // Main circle
    ctx.fillStyle = colors.gamePiece;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Inner highlight
    ctx.fillStyle = '#FFE082';
    ctx.beginPath();
    ctx.arc(pos.x - 2, pos.y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'left';
    ctx.fillText(piece.name, pos.x + 14, pos.y + 4);
}

function drawTarget(ctx, target, fieldToCanvas, colors) {
    const pos = fieldToCanvas(target.x, target.y);
    
    // Crosshair target
    ctx.strokeStyle = colors.target;
    ctx.lineWidth = 2;
    
    const size = 12;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(pos.x - size - 4, pos.y);
    ctx.lineTo(pos.x + size + 4, pos.y);
    ctx.moveTo(pos.x, pos.y - size - 4);
    ctx.lineTo(pos.x, pos.y + size + 4);
    ctx.stroke();
    
    ctx.fillStyle = colors.target;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
}

// ================================================
// Card Creation
// ================================================

function createCategoryCard(categoryName, categoryData) {
    const card = document.createElement('div');
    card.className = 'category-card';
    
    card.innerHTML = `
        <div class="card-header">
            ${categoryName}
        </div>
        <div class="card-content"></div>
    `;
    
    const content = card.querySelector('.card-content');
    renderDataInCard(categoryData, content);
    
    return card;
}

function renderDataInCard(data, parentElement, depth = 0) {
    const gauges = [];
    const indicators = [];
    const progressBars = [];
    const regularData = [];
    const subsections = [];
    
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            subsections.push({ key, value });
        } else {
            const widgetType = detectWidgetType(key, value);
            
            switch (widgetType) {
                case 'boolean-indicator':
                    indicators.push({ key, value });
                    break;
                case 'number-gauge':
                    gauges.push({ key, value });
                    break;
                case 'progress-bar':
                    progressBars.push({ key, value });
                    break;
                default:
                    regularData.push({ key, value });
            }
        }
    }
    
    if (gauges.length > 0) {
        const gaugeContainer = document.createElement('div');
        gaugeContainer.className = 'gauge-grid';
        gaugeContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 12px;';
        
        gauges.forEach(({ key, value }) => {
            gaugeContainer.appendChild(createNumberGauge(key, value));
        });
        parentElement.appendChild(gaugeContainer);
    }
    
    if (indicators.length > 0) {
        const indicatorContainer = document.createElement('div');
        indicatorContainer.className = 'indicator-grid';
        indicatorContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;';
        
        indicators.forEach(({ key, value }) => {
            indicatorContainer.appendChild(createBooleanIndicator(key, value));
        });
        parentElement.appendChild(indicatorContainer);
    }
    
    progressBars.forEach(({ key, value }) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '8px';
        wrapper.appendChild(createProgressBar(key, value));
        parentElement.appendChild(wrapper);
    });
    
    regularData.forEach(({ key, value }) => {
        const row = createDataRow(key, value);
        row.style.marginLeft = `${depth * 12}px`;
        parentElement.appendChild(row);
    });
    
    subsections.forEach(({ key, value }) => {
        if (value['.type'] === 'String Chooser' || value['options']) {
            const wrapper = document.createElement('div');
            wrapper.className = 'data-subsection';
            wrapper.innerHTML = `<div class="subsection-header">${key}</div>`;
            wrapper.appendChild(createChooserWidget(key, value));
            parentElement.appendChild(wrapper);
            return;
        }
        
        const subsection = document.createElement('div');
        subsection.className = 'data-subsection';
        subsection.style.marginLeft = `${depth * 12}px`;
        
        subsection.innerHTML = `
            <div class="subsection-header">
                <span class="subsection-toggle">▼</span>
                ${key}
            </div>
            <div class="subsection-content"></div>
        `;
        
        const content = subsection.querySelector('.subsection-content');
        parentElement.appendChild(subsection);
        
        renderDataInCard(value, content, depth + 1);
        
        const header = subsection.querySelector('.subsection-header');
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const toggle = header.querySelector('.subsection-toggle');
            const isCollapsed = content.style.display === 'none';
            content.style.display = isCollapsed ? 'flex' : 'none';
            toggle.textContent = isCollapsed ? '▼' : '▶';
        });
    });
}

// ================================================
// Utility Functions
// ================================================

function formatValue(value) {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return value.toString();
        }
        return value.toFixed(3);
    }
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    if (Array.isArray(value)) {
        if (value.length <= 4) {
            return `[${value.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}]`;
        }
        return `Array[${value.length}]`;
    }
    return String(value);
}

// ================================================
// Display Update
// ================================================

function updateDisplay() {
    const container = document.getElementById('robot-data-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (Object.keys(robotData).length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <div class="no-data-title">No Robot Data</div>
                <div class="no-data-subtitle">Waiting for NetworkTables connection...</div>
            </div>
        `;
        return;
    }
    
    // Debug: log what we're processing
    console.log('[DriveBoard] Processing robot data:', Object.keys(robotData));
    
    const sortedCategories = Object.entries(robotData).sort(([a, dataA], [b, dataB]) => {
        const aIsField = isField2d(dataA);
        const bIsField = isField2d(dataB);
        if (aIsField && !bIsField) return -1;
        if (!aIsField && bIsField) return 1;
        return a.localeCompare(b);
    });
    
    for (const [categoryName, categoryData] of sortedCategories) {
        let card;
        
        const isField = typeof categoryData === 'object' && isField2d(categoryData);
        console.log(`[DriveBoard] Category "${categoryName}" isField2d: ${isField}`);
        
        if (isField) {
            card = createField2dCard(categoryName, categoryData);
        } else {
            card = createCategoryCard(categoryName, categoryData);
        }
        
        container.appendChild(card);
    }
}

// ================================================
// Initialization
// ================================================

function startDataPolling(interval = 100) {
    fetchRobotData();
    fetchStatus();
    
    setInterval(fetchRobotData, interval);
    setInterval(fetchStatus, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    document.body.addEventListener("click", e => {
        if (e.target.closest("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    router();
    startDataPolling();
    
    console.log('%cDriveBoard', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
    console.log('%cField2D visualization ready', 'color: #888;');
});

window.addEventListener('popstate', router);

export { robotData, isConnected, fetchRobotData, fetchStatus };