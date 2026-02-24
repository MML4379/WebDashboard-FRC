// ================================================
// DriveBoard Configuration
// ================================================

export const WIDGET_CONFIG = {
    maxGraphHistory: 100,
    progressBarKeys: ['percent', 'battery', 'pressure', 'capacity', 'level', 'progress', '%'],
    booleanDisplayKeys: ['enabled', 'active', 'ready', 'aligned', 'detected', 'connected', 'limit', 'switch'],
    gaugeKeys: ['speed', 'velocity', 'angle', 'position', 'distance', 'voltage', 'current', 'temperature'],
};

export const FIELD_CONFIG = {
    // Field dimensions in meters
    fieldLength: 16.5354,  // 54'3"
    fieldWidth: 8.001,     // 26'3"
    
    // Robot dimensions in meters (visual size, not actual)
    robotLength: 0.5,
    robotWidth: 0.5,
    
    // Rotation offset in radians (adjust if robot orientation doesn't match)
    // Try: 0, Math.PI/2, Math.PI, or -Math.PI/2
    rotationOffset: 0,
    
    // Background image path (set to your field image)
    backgroundImage: '/assets/2026field.png',
    
    flipX: false,
    flipY: true,

    // Colors
    colors: {
        background: '#1e1e1e',  // Fallback if image fails to load
        gridLines: 'rgba(255, 255, 255, 0.15)',
        border: '#4CAF50',
        robot: '#1565C0',
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