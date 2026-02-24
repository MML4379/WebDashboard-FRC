// ================================================
// Card Builder
// ================================================

import { detectWidgetType } from './widgetDetection.js';
import {
    createBooleanIndicator,
    createNumberGauge,
    createProgressBar,
    createChooserWidget,
    createDataRow
} from './widgets.js';

/**
 * Check if data represents a SendableChooser
 */
function isChooser(data) {
    if (!data || typeof data !== 'object') return false;
    return data['.type'] === 'String Chooser' || 
           (data.options && Array.isArray(data.options));
}

/**
 * Check if value is a primitive (not an object/array)
 */
function isPrimitive(value) {
    return value === null || 
           typeof value !== 'object' || 
           Array.isArray(value);
}

/**
 * Create a category card with data
 */
export function createCategoryCard(categoryName, categoryData) {
    const card = document.createElement('div');
    card.className = 'category-card';
    
    card.innerHTML = `
        <div class="card-header">${categoryName}</div>
        <div class="card-content"></div>
    `;
    
    const content = card.querySelector('.card-content');
    
    // Check if this entire category is a chooser
    if (isChooser(categoryData)) {
        content.appendChild(createChooserWidget(categoryName, categoryData, categoryName));
    } 
    // Handle primitive values (string, number, boolean) at category level
    else if (isPrimitive(categoryData)) {
        const widgetType = detectWidgetType(categoryName, categoryData);
        
        switch (widgetType) {
            case 'boolean-indicator':
                content.appendChild(createBooleanIndicator(categoryName, categoryData));
                break;
            case 'progress-bar':
                content.appendChild(createProgressBar(categoryName, categoryData));
                break;
            case 'number-gauge':
                content.appendChild(createNumberGauge(categoryName, categoryData));
                break;
            default:
                content.appendChild(createDataRow(categoryName, categoryData));
        }
    } 
    else {
        renderDataInCard(categoryData, content, 0, categoryName);
    }
    
    return card;
}

/**
 * Render data inside a card, organizing by widget type
 * @param {object} data - Data to render
 * @param {HTMLElement} parentElement - Container element
 * @param {number} depth - Nesting depth for indentation
 * @param {string} keyPath - NetworkTables key path (e.g., "SmartDashboard/Auto")
 */
export function renderDataInCard(data, parentElement, depth = 0, keyPath = '') {
    const categorized = categorizeData(data);
    
    // Render gauges in a grid
    if (categorized.gauges.length > 0) {
        const gaugeContainer = createGaugeGrid();
        categorized.gauges.forEach(({ key, value }) => {
            gaugeContainer.appendChild(createNumberGauge(key, value));
        });
        parentElement.appendChild(gaugeContainer);
    }
    
    // Render boolean indicators
    if (categorized.indicators.length > 0) {
        const indicatorContainer = createIndicatorGrid();
        categorized.indicators.forEach(({ key, value }) => {
            indicatorContainer.appendChild(createBooleanIndicator(key, value));
        });
        parentElement.appendChild(indicatorContainer);
    }
    
    // Render progress bars
    categorized.progressBars.forEach(({ key, value }) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '8px';
        wrapper.appendChild(createProgressBar(key, value));
        parentElement.appendChild(wrapper);
    });
    
    // Render regular data rows
    categorized.regularData.forEach(({ key, value }) => {
        const row = createDataRow(key, value);
        row.style.marginLeft = `${depth * 12}px`;
        parentElement.appendChild(row);
    });
    
    // Render subsections
    categorized.subsections.forEach(({ key, value }) => {
        renderSubsection(key, value, parentElement, depth, keyPath);
    });
}

/**
 * Categorize data into different widget types
 */
function categorizeData(data) {
    const result = {
        gauges: [],
        indicators: [],
        progressBars: [],
        regularData: [],
        subsections: []
    };
    
    for (const [key, value] of Object.entries(data)) {
        // Handle nested objects
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result.subsections.push({ key, value });
            continue;
        }
        
        // Categorize by widget type
        const widgetType = detectWidgetType(key, value);
        
        switch (widgetType) {
            case 'boolean-indicator':
                result.indicators.push({ key, value });
                break;
            case 'number-gauge':
                result.gauges.push({ key, value });
                break;
            case 'progress-bar':
                result.progressBars.push({ key, value });
                break;
            default:
                result.regularData.push({ key, value });
        }
    }
    
    return result;
}

/**
 * Create a grid container for gauges
 */
function createGaugeGrid() {
    const container = document.createElement('div');
    container.className = 'gauge-grid';
    container.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
    `;
    return container;
}

/**
 * Create a flex container for indicators
 */
function createIndicatorGrid() {
    const container = document.createElement('div');
    container.className = 'indicator-grid';
    container.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
    `;
    return container;
}

/**
 * Render a collapsible subsection
 */
function renderSubsection(key, value, parentElement, depth, keyPath = '') {
    // Build the full key path for this subsection
    const fullKeyPath = keyPath ? `${keyPath}/${key}` : key;
    
    // Handle chooser widgets specially
    if (isChooser(value)) {
        const wrapper = document.createElement('div');
        wrapper.className = 'data-subsection';
        wrapper.innerHTML = `<div class="subsection-header">${key}</div>`;
        wrapper.appendChild(createChooserWidget(key, value, fullKeyPath));
        parentElement.appendChild(wrapper);
        return;
    }
    
    // Create collapsible subsection
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
    
    // Recursively render content with updated key path
    renderDataInCard(value, content, depth + 1, fullKeyPath);
    
    // Add collapse/expand functionality
    const header = subsection.querySelector('.subsection-header');
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
        const toggle = header.querySelector('.subsection-toggle');
        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? 'flex' : 'none';
        toggle.textContent = isCollapsed ? '▼' : '▶';
    });
}