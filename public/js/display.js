// ================================================
// Display Update
// ================================================

import { getRobotData, onDataChange } from './dataManager.js';
import { isField2d } from './widgetDetection.js';
import { createField2dCard, drawField2d } from './field2d.js';
import { createCategoryCard } from './cardBuilder.js';
import { 
    initLayoutManager, 
    applySavedOrder, 
    makeCardDraggable, 
    setupDropZone,
    getOrder
} from './layoutManager.js';

let dropZoneInitialized = false;
let previousData = {};

/**
 * Update the main display with current robot data
 */
export function updateDisplay() {
    const container = document.getElementById('robot-data-container');
    if (!container) return;
    
    const robotData = getRobotData();
    
    // Handle empty state
    if (Object.keys(robotData).length === 0) {
        if (container.querySelector('.no-data')) return; // Already showing empty state
        renderEmptyState(container);
        previousData = {};
        return;
    }
    
    // Remove empty state if present
    const emptyState = container.querySelector('.no-data');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Set up drop zone once
    if (!dropZoneInitialized) {
        setupDropZone(container);
        dropZoneInitialized = true;
    }
    
    // Get current cards in DOM
    const existingCards = new Map();
    container.querySelectorAll('.category-card').forEach(card => {
        if (card.dataset.category) {
            existingCards.set(card.dataset.category, card);
        }
    });
    
    // Determine categories to render
    const savedOrder = getOrder();
    let sortedCategories;
    
    if (savedOrder.length > 0 && existingCards.size > 0) {
        // Use existing DOM order (user may have dragged)
        sortedCategories = [];
        const remaining = new Map(Object.entries(robotData));
        
        // First, add cards in their current DOM order
        container.querySelectorAll('.category-card').forEach(card => {
            const name = card.dataset.category;
            if (name && remaining.has(name)) {
                sortedCategories.push([name, remaining.get(name)]);
                remaining.delete(name);
            }
        });
        
        // Then add any new categories
        remaining.forEach((data, name) => {
            sortedCategories.push([name, data]);
        });
    } else {
        // Initial load - sort with Field2D first, then apply saved order
        sortedCategories = sortCategories(robotData);
        sortedCategories = applySavedOrder(sortedCategories);
    }
    
    // Track which categories are still present
    const currentCategories = new Set(sortedCategories.map(([name]) => name));
    
    // Remove cards that no longer exist in data
    existingCards.forEach((card, name) => {
        if (!currentCategories.has(name)) {
            card.remove();
            delete previousData[name];
        }
    });
    
    // Update or create cards
    for (const [categoryName, categoryData] of sortedCategories) {
        const card = existingCards.get(categoryName);
        const prevData = previousData[categoryName];
        const dataChanged = JSON.stringify(categoryData) !== JSON.stringify(prevData);
        
        if (card) {
            // Only update if data changed
            if (dataChanged) {
                updateCardContent(card, categoryName, categoryData);
                previousData[categoryName] = JSON.parse(JSON.stringify(categoryData));
            }
        } else {
            // Create new card
            const newCard = createCardForCategory(categoryName, categoryData);
            newCard.dataset.category = categoryName;
            makeCardDraggable(newCard, categoryName);
            container.appendChild(newCard);
            previousData[categoryName] = JSON.parse(JSON.stringify(categoryData));
        }
    }
}

/**
 * Update card content without recreating the card
 */
function updateCardContent(card, categoryName, categoryData) {
    // For Field2D, update the canvas directly
    if (isField2d(categoryData)) {
        const canvas = card.querySelector('canvas');
        if (canvas && canvas._dimensions) {
            canvas._field2dData = categoryData;
            drawField2d(canvas, categoryData, canvas._dimensions);
        }
        return;
    }
    
    // For other cards, recreate the content
    // This is simpler than diffing and handles all widget types
    const content = card.querySelector('.card-content');
    if (!content) return;
    
    const newCard = createCardForCategory(categoryName, categoryData);
    const newContent = newCard.querySelector('.card-content');
    
    if (newContent) {
        // Replace content while preserving card wrapper
        content.replaceWith(newContent);
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
    
    if (isField) {
        return createField2dCard(categoryName, categoryData);
    }
    
    return createCategoryCard(categoryName, categoryData);
}

/**
 * Initialize display updates
 */
export function initDisplay() {
    // Initialize layout manager
    initLayoutManager();
    
    // Initial render
    updateDisplay();
    
    // Subscribe to data changes
    onDataChange(updateDisplay);
}