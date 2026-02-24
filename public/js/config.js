// ================================================
// DriveBoard Configuration
// ================================================

export const WIDGET_CONFIG = {
    maxGraphHistory: 100,
    progressBarKeys: ['percent', 'battery', 'pressure', 'capacity', 'level', 'progress'],
    booleanDisplayKeys: ['enabled', 'active', 'ready', 'aligned', 'detected', 'connected', 'limit', 'switch'],
    gaugeKeys: ['speed', 'velocity', 'angle', 'position', 'distance', 'voltage', 'current', 'temperature'],
};

export const FIELD_CONFIG = {
    // Field dimensions in meters
    fieldLength: 16.5354,  // 54'3"
    fieldWidth: 8.001,     // 26'3"
    
    // Robot dimensions in meters
    robotLength: 0.9086,   // ~35.8 inches with bumpers
    robotWidth: 0.9086,    // robot is a square
    
    // Colors
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