// ================================================
// Field2D Visualization
// ================================================

import { FIELD_CONFIG } from './config.js';

// Cache for loaded background image
let backgroundImage = null;
let imageLoadPromise = null;

// ================================================
// Image Loading
// ================================================

function loadBackgroundImage() {
    if (imageLoadPromise) return imageLoadPromise;
    
    imageLoadPromise = new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
            backgroundImage = img;
            console.log('[Field2D] Background image loaded');
            resolve(img);
        };
        
        img.onerror = () => {
            console.warn('[Field2D] Failed to load background image, using fallback');
            backgroundImage = null;
            resolve(null);
        };
        
        img.src = FIELD_CONFIG.backgroundImage;
    });
    
    return imageLoadPromise;
}

// ================================================
// Card Creation
// ================================================

/**
 * Create a Field2D visualization card
 */
export function createField2dCard(categoryName, field2dData) {
    console.log(`[Field2D] Creating card for "${categoryName}"`, field2dData);
    
    const card = document.createElement('div');
    card.className = 'category-card field2d-card';
    
    const cardId = `field2d-${categoryName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    card.innerHTML = `
        <div class="card-header">${categoryName}</div>
        <div class="card-content field2d-content">
            <canvas id="${cardId}" class="field2d-canvas"></canvas>
        </div>
    `;
    
    // Setup canvas after DOM insertion
    setTimeout(async () => {
        const canvas = document.getElementById(cardId);
        if (canvas) {
            console.log('[Field2D] Canvas found, setting up...');
            await loadBackgroundImage();
            setupField2dCanvas(canvas, field2dData);
        } else {
            console.error(`[Field2D] Canvas not found: ${cardId}`);
        }
    }, 0);
    
    return card;
}

// ================================================
// Canvas Setup
// ================================================

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
        let width = Math.max(rect.width - 20, 400);
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

// ================================================
// Main Drawing Function
// ================================================

function drawField2d(canvas, data, dimensions) {
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    const colors = FIELD_CONFIG.colors;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate field positioning
    const padding = 30;
    const { fieldLength, fieldWidth } = FIELD_CONFIG;
    
    const scaleX = (width - 2 * padding) / fieldLength;
    const scaleY = (height - 2 * padding) / fieldWidth;
    const scale = Math.min(scaleX, scaleY);
    
    const fieldPixelWidth = fieldLength * scale;
    const fieldPixelHeight = fieldWidth * scale;
    const offsetX = (width - fieldPixelWidth) / 2;
    const offsetY = (height - fieldPixelHeight) / 2;
    
    // Coordinate conversion helpers
    const fieldToCanvas = (x, y) => ({
        x: offsetX + x * scale,
        y: offsetY + (fieldWidth - y) * scale  // Flip Y axis
    });
    
    const metersToPixels = (m) => m * scale;
    
    // Draw layers
    drawBackground(ctx, width, height, offsetX, offsetY, fieldPixelWidth, fieldPixelHeight, colors);
    drawGridLines(ctx, offsetX, offsetY, fieldPixelWidth, fieldPixelHeight, scale, colors);
    drawFieldBorder(ctx, offsetX, offsetY, fieldPixelWidth, fieldPixelHeight, colors);
    drawAxisLabels(ctx, offsetX, offsetY, fieldPixelWidth, fieldPixelHeight, scale, colors);
    
    // Parse and draw field objects
    const objects = parseField2dData(data);
    console.log('[Field2D] Parsed objects:', objects);
    
    objects.trajectories.forEach(t => drawTrajectory(ctx, t, fieldToCanvas, colors));
    objects.gamePieces.forEach(p => drawGamePiece(ctx, p, fieldToCanvas, colors));
    objects.targets.forEach(t => drawTarget(ctx, t, fieldToCanvas, colors));
    objects.robots.forEach(r => drawRobot(ctx, r, fieldToCanvas, metersToPixels, colors));
}

// ================================================
// Drawing Helpers
// ================================================

function drawBackground(ctx, width, height, offsetX, offsetY, fieldPixelWidth, fieldPixelHeight, colors) {
    // Fill entire canvas with fallback color
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
    
    // Draw background image if loaded
    if (backgroundImage) {
        ctx.drawImage(
            backgroundImage,
            offsetX,
            offsetY,
            fieldPixelWidth,
            fieldPixelHeight
        );
    }
}

function drawGridLines(ctx, offsetX, offsetY, width, height, scale, colors) {
    const { fieldLength, fieldWidth } = FIELD_CONFIG;
    
    ctx.strokeStyle = colors.gridLines;
    ctx.lineWidth = 1;
    
    // Vertical lines (every meter)
    for (let x = 0; x <= fieldLength; x++) {
        const px = offsetX + x * scale;
        ctx.beginPath();
        ctx.moveTo(px, offsetY);
        ctx.lineTo(px, offsetY + height);
        ctx.stroke();
    }
    
    // Horizontal lines (every meter)
    for (let y = 0; y <= fieldWidth; y++) {
        const py = offsetY + y * scale;
        ctx.beginPath();
        ctx.moveTo(offsetX, py);
        ctx.lineTo(offsetX + width, py);
        ctx.stroke();
    }
}

function drawFieldBorder(ctx, offsetX, offsetY, width, height, colors) {
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, width, height);
}

function drawAxisLabels(ctx, offsetX, offsetY, fieldPixelWidth, fieldPixelHeight, scale, colors) {
    const { fieldLength, fieldWidth } = FIELD_CONFIG;
    
    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = colors.textMuted;
    
    // X-axis labels (bottom)
    ctx.textAlign = 'center';
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
}

// ================================================
// Object Drawing
// ================================================

function drawRobot(ctx, robot, fieldToCanvas, metersToPixels, colors) {
    const pos = fieldToCanvas(robot.x, robot.y);
    const robotWidth = metersToPixels(FIELD_CONFIG.robotWidth);
    const robotLength = metersToPixels(FIELD_CONFIG.robotLength);
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-robot.rotation);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-robotLength / 2 + 1, -robotWidth / 2 + 1, robotLength, robotWidth);
    
    // Body
    ctx.fillStyle = colors.robot;
    ctx.fillRect(-robotLength / 2, -robotWidth / 2, robotLength, robotWidth);
    
    // Border
    ctx.strokeStyle = colors.robotOutline;
    ctx.lineWidth = 2;
    ctx.strokeRect(-robotLength / 2, -robotWidth / 2, robotLength, robotWidth);
    
    // Bumpers
    const bumperWidth = 2;
    ctx.fillStyle = colors.robotOutline;
    ctx.fillRect(-robotLength / 2 - bumperWidth, -robotWidth / 2, bumperWidth, robotWidth);
    ctx.fillRect(robotLength / 2, -robotWidth / 2, bumperWidth, robotWidth);
    ctx.fillRect(-robotLength / 2, -robotWidth / 2 - bumperWidth, robotLength, bumperWidth);
    ctx.fillRect(-robotLength / 2, robotWidth / 2, robotLength, bumperWidth);
    
    // Direction arrow
    ctx.fillStyle = colors.robotDirection;
    ctx.shadowColor = colors.robotDirection;
    ctx.shadowBlur = 4;
    
    const arrowSize = Math.min(robotLength, robotWidth) * 0.4;
    ctx.beginPath();
    ctx.moveTo(robotLength / 2 + 5, 0);
    ctx.lineTo(robotLength / 2 - arrowSize * 0.2, -arrowSize * 0.35);
    ctx.lineTo(robotLength / 2 - arrowSize * 0.2, arrowSize * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const crossSize = 4;
    ctx.beginPath();
    ctx.moveTo(-crossSize, 0);
    ctx.lineTo(crossSize, 0);
    ctx.moveTo(0, -crossSize);
    ctx.lineTo(0, crossSize);
    ctx.stroke();
    
    ctx.restore();
}

function drawTrajectory(ctx, trajectory, fieldToCanvas, colors) {
    const points = trajectory.points;
    if (points.length < 2) return;
    
    // Path line
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
    
    // Waypoints
    ctx.fillStyle = colors.trajectoryPoint;
    const waypointInterval = Math.max(1, Math.floor(points.length / 15));
    
    for (let i = 0; i < points.length; i += waypointInterval) {
        const pos = fieldToCanvas(points[i].x, points[i].y);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Start point (green)
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // End point (red)
    const endPos = fieldToCanvas(points[points.length - 1].x, points[points.length - 1].y);
    ctx.fillStyle = '#F44336';
    ctx.beginPath();
    ctx.arc(endPos.x, endPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawGamePiece(ctx, piece, fieldToCanvas, colors) {
    const pos = fieldToCanvas(piece.x, piece.y);
    
    // Glow and main circle
    ctx.shadowColor = colors.gamePiece;
    ctx.shadowBlur = 8;
    ctx.fillStyle = colors.gamePiece;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Highlight
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
    const size = 12;
    
    ctx.strokeStyle = colors.target;
    ctx.lineWidth = 2;
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(pos.x - size - 4, pos.y);
    ctx.lineTo(pos.x + size + 4, pos.y);
    ctx.moveTo(pos.x, pos.y - size - 4);
    ctx.lineTo(pos.x, pos.y + size + 4);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = colors.target;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
    ctx.fill();
}

// ================================================
// Data Parsing
// ================================================

function parseField2dData(data) {
    const result = {
        robots: [],
        trajectories: [],
        gamePieces: [],
        targets: []
    };
    
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('.')) continue;
        
        const lowerKey = key.toLowerCase();
        
        // Robots
        if (lowerKey.includes('robot') || lowerKey === 'pose' || lowerKey === 'position') {
            const pose = parsePose(value);
            if (pose) {
                result.robots.push({ name: key, ...pose });
                console.log(`[Field2D] Found robot "${key}":`, pose);
            }
            continue;
        }
        
        // Trajectories
        if (lowerKey.includes('trajectory') || lowerKey.includes('path') || lowerKey.includes('route')) {
            if (Array.isArray(value) && value.length > 0) {
                const trajectory = parseTrajectory(value);
                if (trajectory) {
                    result.trajectories.push({ name: key, points: trajectory });
                }
            }
            continue;
        }
        
        // Game pieces
        if (matchesGamePieceKey(lowerKey)) {
            const pose = parsePose(value);
            if (pose) {
                result.gamePieces.push({ name: key, ...pose });
            }
            continue;
        }
        
        // Targets
        if (matchesTargetKey(lowerKey)) {
            const pose = parsePose(value);
            if (pose) {
                result.targets.push({ name: key, ...pose });
            }
            continue;
        }
        
        // Generic array handling
        if (Array.isArray(value)) {
            if (value.length > 0 && Array.isArray(value[0])) {
                const trajectory = parseTrajectory(value);
                if (trajectory) {
                    result.trajectories.push({ name: key, points: trajectory });
                }
            } else {
                const pose = parsePose(value);
                if (pose) {
                    result.gamePieces.push({ name: key, ...pose });
                }
            }
        }
    }
    
    return result;
}

function matchesGamePieceKey(lowerKey) {
    const keywords = ['note', 'piece', 'game', 'coral', 'algae', 'cube', 'cone'];
    return keywords.some(k => lowerKey.includes(k));
}

function matchesTargetKey(lowerKey) {
    const keywords = ['target', 'waypoint', 'goal', 'aim', 'setpoint'];
    return keywords.some(k => lowerKey.includes(k));
}

function parsePose(value) {
    if (!Array.isArray(value) || value.length < 2) return null;
    
    const x = parseFloat(value[0]);
    const y = parseFloat(value[1]);
    const rotation = value.length >= 3 ? parseFloat(value[2]) : 0;
    
    if (isNaN(x) || isNaN(y)) return null;
    
    // Validate coordinates are reasonable for FRC field
    if (x < -2 || x > 20 || y < -2 || y > 12) {
        console.warn(`[Field2D] Pose out of bounds: (${x}, ${y})`);
        return null;
    }
    
    return { x, y, rotation };
}

function parseTrajectory(value) {
    if (!Array.isArray(value) || value.length === 0) return null;
    
    const points = value.map(parsePose).filter(Boolean);
    return points.length > 0 ? points : null;
}