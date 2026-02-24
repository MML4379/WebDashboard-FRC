// ================================================
// Widget Type Detection
// ================================================

import { WIDGET_CONFIG, FIELD_CONFIG } from './config.js';

/**
 * Detect if data represents a Field2D visualization
 */
export function isField2d(data) {
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
            if (isPoseArray(value)) {
                console.log(`[Field2D] Detected via key "${key}" with pose data:`, value);
                return true;
            }
            
            // Check for trajectory (array of poses)
            if (isTrajectoryArray(value)) {
                console.log(`[Field2D] Detected via key "${key}" with trajectory data`);
                return true;
            }
        }
    }
    
    // Check for "Robot" key with pose data
    const robotPose = data['Robot'] || data['robot'];
    if (robotPose && isPoseArray(robotPose)) {
        console.log('[Field2D] Detected via Robot key');
        return true;
    }
    
    return false;
}

/**
 * Check if value is a valid pose array [x, y] or [x, y, theta]
 */
function isPoseArray(value) {
    return Array.isArray(value) && 
           value.length >= 2 && 
           typeof value[0] === 'number' && 
           typeof value[1] === 'number';
}

/**
 * Check if value is a trajectory (array of poses)
 */
function isTrajectoryArray(value) {
    return Array.isArray(value) && 
           value.length > 0 && 
           Array.isArray(value[0]) && 
           value[0].length >= 2;
}

/**
 * Detect the appropriate widget type for a key-value pair
 */
export function detectWidgetType(key, value) {
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