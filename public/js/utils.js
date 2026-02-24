// ================================================
// Utility Functions
// ================================================

/**
 * Format a value for display
 */
export function formatValue(value) {
    if (value === null || value === undefined) {
        return 'null';
    }
    
    if (typeof value === 'number') {
        return Number.isInteger(value) ? value.toString() : value.toFixed(3);
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

/**
 * Get the appropriate unit for a given key
 */
export function getUnit(key) {
    const lowerKey = key.toLowerCase();
    
    const unitMap = {
        voltage: 'V',
        current: 'A',
        temperature: '°C',
        temp: '°C',
        velocity: 'm/s',
        speed: 'm/s',
        angle: '°',
        rotation: '°',
        heading: '°',
        distance: 'm',
        position: 'm',
        percent: '%',
        battery: '%',
        pressure: 'PSI',
    };
    
    for (const [keyword, unit] of Object.entries(unitMap)) {
        if (lowerKey.includes(keyword)) {
            return unit;
        }
    }
    
    return '';
}

/**
 * Remove forbidden keys from data object
 */
export function scrubData(data) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => scrubData(item));
    }

    const cleaned = {};
    for (const key in data) {
        const lowerKey = key.toLowerCase();
        const forbidden = lowerKey.includes('module') || lowerKey.includes('pathplanner') || 
            lowerKey.includes('drivestate') || lowerKey.includes('command');

        if (!forbidden) {
            cleaned[key] = scrubData(data[key]);
        }
    }
    return cleaned;
}