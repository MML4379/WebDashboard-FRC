// ================================================
// Display Update
// ================================================

import { getRobotData, onDataChange } from './dataManager.js';
import { isField2d } from './widgetDetection.js';
import { createField2dCard } from './field2d.js';
import { createCategoryCard } from './cardBuilder.js';

/**
 * Update the main display with current robot data
 */
export function updateDisplay() {
    const container = document.getElementById('robot-data-container');
    if (!container) return;
    
    const robotData = getRobotData();
    
    // Handle empty state
    if (Object.keys(robotData).length === 0) {
        renderEmptyState(container);
        return;
    }
    
    console.log('[DriveBoard] Processing robot data:', Object.keys(robotData));
    
    // Clear and rebuild
    container.innerHTML = '';
    
    // Sort categories (Field2D first, then alphabetically)
    const sortedCategories = sortCategories(robotData);
    
    // Render each category
    for (const [categoryName, categoryData] of sortedCategories) {
        const card = createCardForCategory(categoryName, categoryData);
        container.appendChild(card);
    }
}

/**
 * Render empty state message
 */
function renderEmptyState(container) {
    container.innerHTML = `
        <div class="no-data">
            <div class="no-data-title">No Robot Data</div>
            <div class="no-data-subtitle">Waiting for NetworkTables connection...</div>
        </div>
    `;
}

/**
 * Sort categories with Field2D entries first
 */
function sortCategories(robotData) {
    return Object.entries(robotData).sort(([a, dataA], [b, dataB]) => {
        const aIsField = isField2d(dataA);
        const bIsField = isField2d(dataB);
        
        if (aIsField && !bIsField) return -1;
        if (!aIsField && bIsField) return 1;
        
        return a.localeCompare(b);
    });
}

/**
 * Create the appropriate card type for category data
 */
function createCardForCategory(categoryName, categoryData) {
    const isField = typeof categoryData === 'object' && isField2d(categoryData);
    
    console.log(`[DriveBoard] Category "${categoryName}" isField2d: ${isField}`);
    
    if (isField) {
        return createField2dCard(categoryName, categoryData);
    }
    
    return createCategoryCard(categoryName, categoryData);
}

/**
 * Initialize display updates
 */
export function initDisplay() {
    // Initial render
    updateDisplay();
    
    // Subscribe to data changes
    onDataChange(updateDisplay);
}