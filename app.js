// Application Data
const appData = {
    participants: [],
    currentTab: 'agregar',
    nextId: 1,
    previewData: []
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeExcelImport();
    initializeManualEntry();
    initializeAttendance();
    initializeSummary();
    updateUI();
});

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).setAttribute('aria-selected', 'true');
    
    // Update active tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    
    appData.currentTab = tabId;
    
    // Update content based on active tab
    if (tabId === 'asistencia') {
        renderAttendanceList();
    } else if (tabId === 'resumen') {
        updateSummary();
    }
}

// Excel Import Functionality
function initializeExcelImport() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('excelFile');
    const confirmBtn = document.getElementById('confirmImport');
    const cancelBtn = document.getElementById('cancelImport');
    
    // Drag and Drop Events
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processExcelFile(files[0]);
        }
    });
    
    // File Input Event
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processExcelFile(e.target.files[0]);
        }
    });
    
    // Preview Actions
    confirmBtn.addEventListener('click', confirmImport);
    cancelBtn.addEventListener('click', cancelImport);
}

function processExcelFile(file) {
    // Validate file
    const validation = validateExcelFile(file);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }
    
    showProcessing(true);
    hideError();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first worksheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Process data
            const processedData = processWorksheetData(jsonData);
            
            if (processedData.length === 0) {
                showError('No se encontraron datos válidos en el archivo Excel.');
                showProcessing(false);
                return;
            }
            
            // Show preview
            appData.previewData = processedData;
            showPreview(processedData);
            showProcessing(false);
            
        } catch (error) {
            console.error('Error processing Excel file:', error);
            showError('Error al procesar el archivo Excel. Verifique que el formato sea correcto.');
            showProcessing(false);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function validateExcelFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel' // xls
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        return { valid: false, message: 'Formato de archivo no válido. Solo se permiten archivos .xlsx y .xls' };
    }
    
    if (file.size > maxSize) {
        return { valid: false, message: 'El archivo es muy grande. Tamaño máximo permitido: 5MB' };
    }
    
    return { valid: true };
}

function processWorksheetData(jsonData) {
    const processedData = [];
    
    // Skip empty rows and header
    const dataRows = jsonData.slice(1).filter(row => row && row.length >= 2);
    
    for (let i = 0; i < dataRows.length && i < 1000; i++) {
        const row = dataRows[i];
        const nombre = row[0] ? String(row[0]).trim() : '';
        const entidad = row[1] ? String(row[1]).trim() : '';
        
        if (nombre && entidad) {
            processedData.push({
                nombre: nombre,
                entidad: entidad
            });
        }
    }
    
    return processedData;
}

function showPreview(data) {
    const previewSection = document.getElementById('previewSection');
    const previewCount = document.getElementById('previewCount');
    const previewTableBody = document.getElementById('previewTableBody');
    
    previewCount.textContent = `${data.length} participantes encontrados`;
    
    // Clear and populate table
    previewTableBody.innerHTML = '';
    
    data.forEach((participant, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(participant.nombre)}</td>
            <td>${escapeHtml(participant.entidad)}</td>
        `;
        previewTableBody.appendChild(row);
    });
    
    previewSection.classList.remove('hidden');
}

function confirmImport() {
    if (appData.previewData.length === 0) return;
    
    // Add participants to main list
    let addedCount = 0;
    appData.previewData.forEach(participant => {
        // Check for duplicates (by name and entity)
        const isDuplicate = appData.participants.some(p => 
            p.nombre.toLowerCase() === participant.nombre.toLowerCase() && 
            p.entidad.toLowerCase() === participant.entidad.toLowerCase()
        );
        
        if (!isDuplicate) {
            appData.participants.push({
                id: appData.nextId++,
                nombre: participant.nombre,
                entidad: participant.entidad,
                asistencia: null
            });
            addedCount++;
        }
    });
    
    // Show success message
    showSuccessMessage(`Se importaron ${addedCount} participantes correctamente.`);
    
    // Clean up
    cancelImport();
    updateUI();
    
    // Clear file input
    document.getElementById('excelFile').value = '';
}

function cancelImport() {
    document.getElementById('previewSection').classList.add('hidden');
    appData.previewData = [];
}

function showProcessing(show) {
    const processingStatus = document.getElementById('processingStatus');
    if (show) {
        processingStatus.classList.remove('hidden');
    } else {
        processingStatus.classList.add('hidden');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}

function showSuccessMessage(message) {
    // Remove existing success messages
    const existingMessages = document.querySelectorAll('.success-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Insert after excel import section
    const importSection = document.querySelector('.excel-import-section');
    importSection.parentNode.insertBefore(successDiv, importSection.nextSibling);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Manual Entry Functionality
function initializeManualEntry() {
    const form = document.getElementById('addParticipantForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const nombre = formData.get('nombre').trim();
        const entidad = formData.get('entidad').trim();
        
        if (nombre && entidad) {
            // Check for duplicates
            const isDuplicate = appData.participants.some(p => 
                p.nombre.toLowerCase() === nombre.toLowerCase() && 
                p.entidad.toLowerCase() === entidad.toLowerCase()
            );
            
            if (isDuplicate) {
                alert('Este participante ya está registrado.');
                return;
            }
            
            appData.participants.push({
                id: appData.nextId++,
                nombre: nombre,
                entidad: entidad,
                asistencia: null
            });
            
            form.reset();
            updateUI();
        }
    });
}

// Attendance Functionality
function initializeAttendance() {
    const searchInput = document.getElementById('searchParticipant');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterAttendanceList(searchTerm);
    });
}

function renderAttendanceList(searchTerm = '') {
    const attendanceList = document.getElementById('attendanceList');
    
    const filteredParticipants = appData.participants.filter(participant => 
        participant.nombre.toLowerCase().includes(searchTerm) || 
        participant.entidad.toLowerCase().includes(searchTerm)
    );
    
    attendanceList.innerHTML = '';
    
    if (filteredParticipants.length === 0) {
        attendanceList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-20);">No hay participantes registrados.</p>';
        return;
    }
    
    filteredParticipants.forEach(participant => {
        const attendanceItem = document.createElement('div');
        attendanceItem.className = 'attendance-item';
        
        attendanceItem.innerHTML = `
            <div class="attendance-info">
                <h4>${escapeHtml(participant.nombre)}</h4>
                <p>${escapeHtml(participant.entidad)}</p>
            </div>
            <div class="attendance-actions">
                <button class="btn btn--sm ${participant.asistencia === true ? 'btn--primary' : 'btn--outline'}" 
                        onclick="markAttendance(${participant.id}, true)">
                    ✅ Presente
                </button>
                <button class="btn btn--sm ${participant.asistencia === false ? 'btn--primary' : 'btn--outline'}" 
                        onclick="markAttendance(${participant.id}, false)">
                    ❌ Ausente
                </button>
            </div>
        `;
        
        attendanceList.appendChild(attendanceItem);
    });
}

function filterAttendanceList(searchTerm) {
    renderAttendanceList(searchTerm);
}

function markAttendance(participantId, isPresent) {
    const participant = appData.participants.find(p => p.id === participantId);
    if (participant) {
        participant.asistencia = isPresent;
        updateAttendanceCounters();
        updateSummary();
    }
}

function updateAttendanceCounters() {
    const presentCount = appData.participants.filter(p => p.asistencia === true).length;
    const absentCount = appData.participants.filter(p => p.asistencia === false).length;
    
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
}

// Summary Functionality
function initializeSummary() {
    const exportBtn = document.getElementById('exportBtn');
    
    exportBtn.addEventListener('click', function() {
        exportAttendanceList();
    });
}

function updateSummary() {
    const total = appData.participants.length;
    const present = appData.participants.filter(p => p.asistencia === true).length;
    const absent = appData.participants.filter(p => p.asistencia === false).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    document.getElementById('summaryTotal').textContent = total;
    document.getElementById('summaryPresent').textContent = present;
    document.getElementById('summaryAbsent').textContent = absent;
    document.getElementById('summaryPercentage').textContent = `${percentage}%`;
    
    renderFinalAttendanceList();
}

function renderFinalAttendanceList() {
    const finalList = document.getElementById('finalAttendanceList');
    
    finalList.innerHTML = '';
    
    if (appData.participants.length === 0) {
        finalList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-20);">No hay participantes registrados.</p>';
        return;
    }
    
    appData.participants.forEach(participant => {
        const listItem = document.createElement('div');
        listItem.className = `final-list-item ${
            participant.asistencia === true ? 'final-list-item--present' : 
            participant.asistencia === false ? 'final-list-item--absent' : ''
        }`;
        
        const statusText = participant.asistencia === true ? 'Presente' : 
                          participant.asistencia === false ? 'Ausente' : 'Sin marcar';
        
        const statusClass = participant.asistencia === true ? 'status--success' : 
                           participant.asistencia === false ? 'status--error' : 'status--info';
        
        listItem.innerHTML = `
            <div>
                <strong>${escapeHtml(participant.nombre)}</strong><br>
                <small style="color: var(--color-text-secondary);">${escapeHtml(participant.entidad)}</small>
            </div>
            <span class="status ${statusClass}">${statusText}</span>
        `;
        
        finalList.appendChild(listItem);
    });
}

function exportAttendanceList() {
    let exportText = 'LISTA DE ASISTENCIA\n';
    exportText += '===================\n\n';
    
    const present = appData.participants.filter(p => p.asistencia === true);
    const absent = appData.participants.filter(p => p.asistencia === false);
    const unmarked = appData.participants.filter(p => p.asistencia === null);
    
    exportText += `PRESENTES (${present.length}):\n`;
    exportText += '------------------------\n';
    present.forEach(p => {
        exportText += `• ${p.nombre} - ${p.entidad}\n`;
    });
    
    exportText += `\nAUSENTES (${absent.length}):\n`;
    exportText += '----------------------\n';
    absent.forEach(p => {
        exportText += `• ${p.nombre} - ${p.entidad}\n`;
    });
    
    if (unmarked.length > 0) {
        exportText += `\nSIN MARCAR (${unmarked.length}):\n`;
        exportText += '-------------------------\n';
        unmarked.forEach(p => {
            exportText += `• ${p.nombre} - ${p.entidad}\n`;
        });
    }
    
    const total = appData.participants.length;
    const percentage = total > 0 ? Math.round((present.length / total) * 100) : 0;
    
    exportText += `\nRESUMEN:\n`;
    exportText += '--------\n';
    exportText += `Total participantes: ${total}\n`;
    exportText += `Presentes: ${present.length}\n`;
    exportText += `Ausentes: ${absent.length}\n`;
    exportText += `Porcentaje de asistencia: ${percentage}%\n`;
    
    navigator.clipboard.writeText(exportText).then(() => {
        alert('Lista copiada al portapapeles');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = exportText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Lista copiada al portapapeles');
    });
}

// Participants List Management
function renderParticipantsList() {
    const participantsList = document.getElementById('participantsList');
    
    participantsList.innerHTML = '';
    
    if (appData.participants.length === 0) {
        participantsList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-20);">No hay participantes registrados aún.</p>';
        return;
    }
    
    appData.participants.forEach(participant => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        
        participantItem.innerHTML = `
            <div class="participant-info">
                <h4>${escapeHtml(participant.nombre)}</h4>
                <p>${escapeHtml(participant.entidad)}</p>
            </div>
            <div class="participant-actions">
                <button class="btn btn--sm btn--outline" onclick="removeParticipant(${participant.id})">
                    🗑️ Eliminar
                </button>
            </div>
        `;
        
        participantsList.appendChild(participantItem);
    });
}

function removeParticipant(participantId) {
    if (confirm('¿Estás seguro de que deseas eliminar este participante?')) {
        appData.participants = appData.participants.filter(p => p.id !== participantId);
        updateUI();
    }
}

// UI Updates
function updateUI() {
    // Update participants count
    document.getElementById('totalParticipants').textContent = `${appData.participants.length} participantes`;
    
    // Render participants list
    renderParticipantsList();
    
    // Update attendance counters
    updateAttendanceCounters();
    
    // Update summary if on that tab
    if (appData.currentTab === 'resumen') {
        updateSummary();
    }
    
    // Update attendance list if on that tab
    if (appData.currentTab === 'asistencia') {
        renderAttendanceList();
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}