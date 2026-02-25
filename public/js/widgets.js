// ================================================
// Widget Creators
// ================================================

import { formatValue, getUnit } from './utils.js';

/**
 * Create a boolean indicator widget
 */
export function createBooleanIndicator(key, value) {
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

/**
 * Create a number gauge display
 */
export function createNumberGauge(key, value) {
    const unit = getUnit(key);
    const widget = document.createElement('div');
    widget.className = 'number-display';
    
    widget.innerHTML = `
        <span class="number-display-value">
            ${formatValue(value)}
            <span class="number-display-unit">${unit}</span>
        </span>
        <span class="number-display-label">${key}</span>
    `;
    
    return widget;
}

/**
 * Create a progress bar widget
 */
export function createProgressBar(key, value) {
    // Normalize percentage value
    let percent = value;
    if (value <= 1 && value >= 0) {
        percent = value * 100;
    }
    percent = Math.max(0, Math.min(100, percent));
    
    // Determine fill color class
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

/**
 * Create a chooser/selector widget (dropdown)
 */
export function createChooserWidget(key, data, ntKey = null) {
    const widget = document.createElement('div');
    widget.className = 'chooser-widget';
    
    const options = data.options || Object.keys(data).filter(k => !k.startsWith('.'));
    const selected = data.selected || data.active || data.default || '';
    
    // Build the full NT key for this chooser
    const chooserKey = ntKey || key;
    
    const optionsHtml = options.map(opt => `
        <option value="${opt}" ${opt === selected ? 'selected' : ''}>${opt}</option>
    `).join('');
    
    widget.innerHTML = `
        <select class="chooser-select" data-chooser-key="${chooserKey}">
            ${optionsHtml}
        </select>
    `;
    
    const select = widget.querySelector('.chooser-select');
    
    // Add change handler
    select.addEventListener('change', async (e) => {
        const value = e.target.value;
        const key = e.target.dataset.chooserKey;
        const previousValue = selected;
        
        // Add loading state
        select.classList.add('loading');
        select.disabled = true;
        
        // Send to robot
        try {
            await sendChooserSelection(key, value);
            select.classList.remove('loading');
            select.disabled = false;
            console.log(`[Chooser] Selection confirmed: ${key} = ${value}`);
        } catch (error) {
            console.error('[Chooser] Failed to send selection:', error);
            
            // Rollback on failure
            select.value = previousValue;
            select.classList.remove('loading');
            select.disabled = false;
        }
    });
    
    return widget;
}

/**
 * Send chooser selection to the robot
 */
async function sendChooserSelection(key, value) {
    console.log(`[Chooser] Sending selection: ${key} = ${value}`);
    
    const response = await fetch('/api/chooser', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
}

/**
 * Create a simple data row
 */
export function createDataRow(key, value) {
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