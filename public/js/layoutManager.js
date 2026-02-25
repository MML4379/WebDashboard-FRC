// ================================================
// Layout Manager - Drag & Drop with Persistence
// ================================================

const STORAGE_KEY = 'driveboard-layout';

// Current layout state
let layout = {
    order: [],      // Array of category names in display order
    positions: {},  // Optional: for grid positions { categoryName: { col, row, width, height } }
};

// ================================================
// Persistence
// ================================================

/**
 * Load layout from localStorage
 */
export function loadLayout() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            layout = JSON.parse(saved);
            console.log('[Layout] Loaded saved layout:', layout);
        }
    } catch (e) {
        console.warn('[Layout] Failed to load layout:', e);
    }
    return layout;
}

/**
 * Save layout to localStorage
 */
export function saveLayout() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
        console.log('[Layout] Saved layout');
    } catch (e) {
        console.warn('[Layout] Failed to save layout:', e);
    }
}

/**
 * Clear saved layout
 */
export function clearLayout() {
    localStorage.removeItem(STORAGE_KEY);
    layout = { order: [], positions: {} };
    console.log('[Layout] Cleared layout');
}

// ================================================
// Order Management
// ================================================

/**
 * Get the saved order of categories
 */
export function getOrder() {
    return layout.order;
}

/**
 * Update the order of categories
 */
export function setOrder(newOrder) {
    layout.order = newOrder;
    saveLayout();
}

/**
 * Sort categories based on saved order, putting new ones at the end
 */
export function applySavedOrder(categories) {
    const savedOrder = layout.order;
    
    if (savedOrder.length === 0) {
        return categories; // No saved order, return as-is
    }
    
    // Separate into known and new categories
    const known = [];
    const unknown = [];
    
    for (const [name, data] of categories) {
        if (savedOrder.includes(name)) {
            known.push([name, data]);
        } else {
            unknown.push([name, data]);
        }
    }
    
    // Sort known by saved order
    known.sort((a, b) => {
        return savedOrder.indexOf(a[0]) - savedOrder.indexOf(b[0]);
    });
    
    // Append new categories at the end
    return [...known, ...unknown];
}

// ================================================
// Drag & Drop Setup
// ================================================

let draggedElement = null;
let draggedCategory = null;
let placeholder = null;

/**
 * Make a card draggable
 */
export function makeCardDraggable(card, categoryName) {
    card.setAttribute('draggable', 'true');
    card.dataset.category = categoryName;
    
    // Add drag handle styling
    const header = card.querySelector('.card-header');
    if (header) {
        header.classList.add('drag-handle');
    }
    
    // Drag start
    card.addEventListener('dragstart', (e) => {
        draggedElement = card;
        draggedCategory = categoryName;
        
        card.classList.add('dragging');
        
        // Set drag image (optional - use the card itself)
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', categoryName);
        
        // Create placeholder
        placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';
        placeholder.style.height = `${card.offsetHeight}px`;
    });
    
    // Drag end
    card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
        
        // Remove placeholder
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        
        // Save new order
        saveCurrentOrder();
        
        draggedElement = null;
        draggedCategory = null;
        placeholder = null;
    });
    
    // Drag over (for drop targets)
    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (!draggedElement || draggedElement === card) return;
        
        const container = card.parentNode;
        const cards = [...container.querySelectorAll('.category-card:not(.dragging)')];
        const cardIndex = cards.indexOf(card);
        const draggedIndex = cards.indexOf(draggedElement);
        
        // Determine if we should insert before or after
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
            // Insert before
            if (card.previousElementSibling !== placeholder) {
                container.insertBefore(placeholder, card);
            }
        } else {
            // Insert after
            if (card.nextElementSibling !== placeholder) {
                container.insertBefore(placeholder, card.nextElementSibling);
            }
        }
    });
    
    // Drop
    card.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (!draggedElement || draggedElement === card) return;
        
        const container = card.parentNode;
        
        // Insert the dragged element where the placeholder is
        if (placeholder && placeholder.parentNode) {
            container.insertBefore(draggedElement, placeholder);
        }
    });
}

/**
 * Set up the container for drag and drop
 */
export function setupDropZone(container) {
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        
        if (!draggedElement) return;
        
        // If dragging over empty space at the end
        const cards = [...container.querySelectorAll('.category-card:not(.dragging)')];
        if (cards.length === 0) return;
        
        const lastCard = cards[cards.length - 1];
        const lastRect = lastCard.getBoundingClientRect();
        
        if (e.clientY > lastRect.bottom) {
            // Append placeholder at the end
            if (placeholder && placeholder.parentNode !== container) {
                container.appendChild(placeholder);
            } else if (placeholder && placeholder.nextElementSibling !== null) {
                container.appendChild(placeholder);
            }
        }
    });
    
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (!draggedElement) return;
        
        // If dropping in empty space, move to end
        if (placeholder && placeholder.parentNode === container) {
            container.insertBefore(draggedElement, placeholder);
        }
    });
}

/**
 * Save the current DOM order to layout
 */
function saveCurrentOrder() {
    const container = document.getElementById('robot-data-container');
    if (!container) return;
    
    const cards = container.querySelectorAll('.category-card');
    const order = [];
    
    cards.forEach(card => {
        if (card.dataset.category) {
            order.push(card.dataset.category);
        }
    });
    
    layout.order = order;
    saveLayout();
    
    console.log('[Layout] Saved order:', order);
}

// ================================================
// Grid Position Management (for future use)
// ================================================

/**
 * Set a card's grid position
 */
export function setCardPosition(categoryName, position) {
    layout.positions[categoryName] = position;
    saveLayout();
}

/**
 * Get a card's grid position
 */
export function getCardPosition(categoryName) {
    return layout.positions[categoryName] || null;
}

// ================================================
// Initialization
// ================================================

/**
 * Initialize the layout manager
 */
export function initLayoutManager() {
    loadLayout();
    
    // Add keyboard shortcut to reset layout (Ctrl+Shift+R)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (confirm('Reset widget layout to default?')) {
                clearLayout();
                window.location.reload();
            }
        }
    });
    
    console.log('[Layout] Layout manager initialized');
}