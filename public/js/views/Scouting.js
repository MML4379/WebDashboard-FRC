export default function Scouting() {
    let scoutingData = null; 

    async function populateTable(filterText = "") {
        try {
            if (!scoutingData) {
                const response = await fetch('/assets/scouting/finaldata.json');
                scoutingData = await response.json();
            }
            
            const headerRow = document.getElementById('table-header');
            const bodyRows = document.getElementById('table-body');

            const columns = Object.keys(scoutingData);
            const rowIndices = Object.keys(scoutingData[columns[0]]); // Fixed index access

            headerRow.innerHTML = columns.map(col => `<th>${col}</th>`).join('');

            const filteredIndices = rowIndices.filter(idx => {
                const matchVal = String(scoutingData['Match']?.[idx] || "");
                const teamVal = String(scoutingData['Team Number']?.[idx] || "");
                const search = filterText.toLowerCase();
                return matchVal.toLowerCase().includes(search) || teamVal.toLowerCase().includes(search);
            });

            bodyRows.innerHTML = filteredIndices.map(idx => {
                const teamColor = (scoutingData['Alliance'][idx] === "Red") ? '#9b514b' : '#313872';
                
                const cells = columns.map(col => {
                    const rawValue = scoutingData[col][idx];
                    let displayValue = rawValue !== null ? rawValue : '';
                    
                    const strCheck = String(displayValue).toLowerCase().trim();
                    
                    if (strCheck === "true" || strCheck === "false") {
                        const isTrue = strCheck === "true";
                        const circleColor = isTrue ? '#22c55e' : '#ef4444';
                        const icon = isTrue ? '✓' : '✕';
                        
                        // Centering fix: flexbox + line-height: 0
                        displayValue = `<span style="
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            width: 22px;
                            height: 22px;
                            background-color: ${circleColor};
                            border-radius: 50%;
                            color: white;
                            font-weight: bold;
                            font-size: 14px;
                            line-height: 0;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        ">${icon}</span>`;
                    }

                    return `<td style="background-color: ${teamColor};">${displayValue}</td>`;
                }).join('');

                return `<tr>${cells}</tr>`;
            }).join('');

        } catch (err) {
            console.error("Failed to load scouting data:", err);
        }
    }

    window.filterScouting = (val) => populateTable(val);
    setTimeout(() => populateTable(), 0);

    return `
        <style>
            html, body { overflow: visible; font-family: system-ui, sans-serif; }
            
            
        </style>
        <div class="table-container">
            <h2>Scouting Data</h2>
            <input type="text" class="search-box" placeholder="Search Match or Team..." oninput="window.filterScouting(this.value)">
            <table id="json-table" class='table'>
                <thead><tr id="table-header"></tr></thead>
                <tbody id="table-body"></tbody>
            </table>
        </div>
    `;
}
