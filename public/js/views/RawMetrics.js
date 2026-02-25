// ================================================
// Raw Metrics View - Pretty JSON Display
// ================================================

import { getRobotData, onDataChange } from '../dataManager.js';

let unsubscribe = null;

/**
 * Syntax highlight JSON
 */
function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    
    // Escape HTML
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Add syntax highlighting spans
    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        }
    );
}

/**
 * Update the JSON display
 */
function updateJsonDisplay() {
    const container = document.getElementById('json-container');
    if (!container) return;
    
    const data = getRobotData();
    
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<span class="json-null">No data available</span>';
        return;
    }
    
    container.innerHTML = syntaxHighlight(data);
}

/**
 * Set up button event handlers
 */
function setupEventHandlers() {
    const copyBtn = document.getElementById('copy-json-btn');
    const downloadBtn = document.getElementById('download-json-btn');
    
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const container = document.getElementById('json-container');
            
            try {
                const text = container.textContent;
                await navigator.clipboard.writeText(text);
                
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('success');
                
                setTimeout(() => {
                    copyBtn.textContent = 'Copy JSON';
                    copyBtn.classList.remove('success');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const container = document.getElementById('json-container');
            const text = container.textContent;
            
            const blob = new Blob([text], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'robot-data-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

/**
 * Generate the view HTML
 */
export default function RawMetrics() {
    // Clean up previous subscription if exists
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    
    // Set up subscription and event handlers after DOM is ready
    setTimeout(() => {
        updateJsonDisplay();
        setupEventHandlers();
        unsubscribe = onDataChange(updateJsonDisplay);
    }, 0);
    
    return `
        <style>
            .raw-metrics-view {
                padding: 20px;
                height: calc(100vh - 120px);
                display: flex;
                flex-direction: column;
            }
            
            .raw-metrics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .raw-metrics-header h2 {
                margin: 0;
                color: #e0e0e0;
                font-size: 1.5rem;
            }
            
            .raw-metrics-actions {
                display: flex;
                gap: 8px;
            }
            
            .metrics-btn {
                background: #2a2a2a;
                border: 1px solid #444;
                color: #e0e0e0;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.15s ease;
            }
            
            .metrics-btn:hover {
                background: #3a3a3a;
                border-color: #666;
            }
            
            .metrics-btn:active {
                transform: scale(0.98);
            }
            
            .metrics-btn.success {
                background: #2e7d32;
                border-color: #4caf50;
            }
            
            .json-display {
                flex: 1;
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 16px;
                margin: 0;
                overflow: auto;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.5;
                color: #e0e0e0;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            /* JSON Syntax Highlighting */
            .json-key {
                color: #9cdcfe;
            }
            
            .json-string {
                color: #ce9178;
            }
            
            .json-number {
                color: #b5cea8;
            }
            
            .json-boolean {
                color: #569cd6;
            }
            
            .json-null {
                color: #808080;
            }
            
            /* Scrollbar styling */
            .json-display::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            
            .json-display::-webkit-scrollbar-track {
                background: #1a1a1a;
            }
            
            .json-display::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 4px;
            }
            
            .json-display::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        </style>
        
        <div class="raw-metrics-view">
            <div class="raw-metrics-header">
                <h2>Raw Robot Data</h2>
                <div class="raw-metrics-actions">
                    <button id="copy-json-btn" class="metrics-btn">Copy JSON</button>
                    <button id="download-json-btn" class="metrics-btn">Download</button>
                </div>
            </div>
            <pre id="json-container" class="json-display">Loading...</pre>
        </div>
    `;
}