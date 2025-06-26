// Application Data
const appData = {
    participants: [],
    currentTab: 'agregar',
    nextId: 1,
    previewData: []
};

// ============================================
// FUNCIONES DE PERSISTENCIA PARA LOCALSTORAGE
// Agregar este código después de la definición de appData
// ============================================

// Constante para la clave de almacenamiento
const STORAGE_KEY = 'gestion_asistencia_datos';

// Función 1: Guardar datos en localStorage
function saveToStorage() {
    try {
        // Verificar si localStorage está disponible
        if (typeof(Storage) === "undefined") {
            console.warn('localStorage no está disponible en este navegador');
            return false;
        }
        
        // Convertir appData a JSON y guardarlo
        const dataToSave = JSON.stringify(appData);
        localStorage.setItem(STORAGE_KEY, dataToSave);
        
        console.log('Datos guardados exitosamente');
        return true;
        
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('Error: No hay suficiente espacio en localStorage');
            alert('No se pueden guardar los datos. El almacenamiento está lleno.');
        } else {
            console.error('Error al guardar datos:', error);
        }
        return false;
    }
}

// Función 2: Cargar datos desde localStorage
function loadFromStorage() {
    try {
        // Verificar si localStorage está disponible
        if (typeof(Storage) === "undefined") {
            console.warn('localStorage no está disponible en este navegador');
            return false;
        }
        
        // Obtener datos del localStorage
        const savedData = localStorage.getItem(STORAGE_KEY);
        
        if (savedData) {
            // Convertir JSON de vuelta a objeto
            const parsedData = JSON.parse(savedData);
            
            // Validar que los datos tienen la estructura correcta
            if (parsedData && typeof parsedData === 'object') {
                // Restaurar los datos a appData
                if (parsedData.participants && Array.isArray(parsedData.participants)) {
                    appData.participants = parsedData.participants;
                }
                if (parsedData.currentEvent && typeof parsedData.currentEvent === 'string') {
                    appData.currentEvent = parsedData.currentEvent;
                }
                if (parsedData.eventDate && typeof parsedData.eventDate === 'string') {
                    appData.eventDate = parsedData.eventDate;
                }
                
                // Actualizar la interfaz con los datos cargados
                updateUI();
                if (typeof updateSummary === 'function') {
                    updateSummary();
                }
                
                // Mostrar mensaje de confirmación
                console.log('Datos cargados exitosamente');
                
                // Opcional: Mostrar notificación al usuario
                if (appData.participants.length > 0) {
                    showNotification(`✓ Se restauraron ${appData.participants.length} participantes`);
                }
                
                return true;
            }
        }
        
        console.log('No se encontraron datos guardados');
        return false;
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        
        // Si los datos están corruptos, limpiar el localStorage
        if (error instanceof SyntaxError) {
            console.warn('Datos corruptos detectados, limpiando localStorage');
            localStorage.removeItem(STORAGE_KEY);
        }
        
        return false;
    }
}

// Función 3: Limpiar todos los datos guardados
function clearStorage() {
    try {
        // Mostrar confirmación al usuario
        const confirmClear = confirm(
            '¿Estás seguro de que quieres eliminar todos los datos guardados?\n\n' +
            'Esta acción no se puede deshacer y perderás:\n' +
            '• Todos los participantes\n' +
            '• Todas las marcas de asistencia\n' +
            '• La información del evento'
        );
        
        if (!confirmClear) {
            return false;
        }
        
        // Limpiar localStorage
        localStorage.removeItem(STORAGE_KEY);
        
        // Reiniciar appData a su estado inicial
        appData.participants = [];
        appData.currentEvent = '';
        appData.eventDate = '';
        
        // Actualizar la interfaz
        updateUI();
        if (typeof updateSummary === 'function') {
            updateSummary();
        }
        
        // Mostrar confirmación
        alert('✓ Todos los datos han sido eliminados exitosamente');
        console.log('Datos limpiados exitosamente');
        
        return true;
        
    } catch (error) {
        console.error('Error al limpiar datos:', error);
        alert('Error al limpiar los datos. Inténtalo de nuevo.');
        return false;
    }
}

// Función auxiliar para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 16px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover notificación después de 3 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Función auxiliar para verificar el estado del almacenamiento
function getStorageInfo() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            return {
                hasData: true,
                participantsCount: data.participants ? data.participants.length : 0,
                eventName: data.currentEvent || 'Sin nombre',
                eventDate: data.eventDate || 'Sin fecha',
                dataSize: new Blob([savedData]).size
            };
        }
        return { hasData: false };
    } catch (error) {
        return { hasData: false, error: error.message };
    }
}

// ============================================
// FIN DE FUNCIONES DE PERSISTENCIA
// ============================================


// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage(); // Tu función existente
    verificarDatosEnURL(); // Detecta datos en URL automáticamente
    agregarBotonesSincronizacion(); // Agrega interfaz de sincronización
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
        saveToStorage();
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
        saveToStorage();
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
        saveToStorage();
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

function verificarDatosEnURL() {
    try {
        // Obtenemos la URL actual y sus parámetros
        const url = new URL(window.location.href);
        const params = url.searchParams;

        // Verificamos si existe el parámetro con los datos
        if (params.has('data')) {
            const datosCodificados = params.get('data');
            if (datosCodificados) {
                // Decodificamos los datos
                const datosJSON = decodeURIComponent(datosCodificados);
                const datos = JSON.parse(datosJSON);

                // Validamos la estructura básica de los datos
                if (datos && typeof datos === 'object' && Array.isArray(datos.participants)) {
                    // Importamos los datos al estado de la aplicación
                    appData.participants = datos.participants;
                    if (datos.currentEvent) appData.currentEvent = datos.currentEvent;
                    if (datos.eventDate) appData.eventDate = datos.eventDate;

                    // Actualizamos la interfaz
                    updateUI();
                    if (typeof updateSummary === 'function') updateSummary();

                    // Notificamos al usuario
                    showNotification(`✓ Se importaron ${datos.participants.length} participantes desde la URL`);
                }
            }
        }
    } catch (error) {
        console.error('Error al verificar datos en URL:', error);
    }
}

function agregarBotonesSincronizacion() {
    // Buscamos el contenedor donde agregar los botones (ajusta el selector según tu HTML)
    const container = document.querySelector('.container-buttons') || 
                      document.querySelector('.header') ||
                      document.body;

    if (!container) return;

    // Botón para exportar datos como URL
    const btnExportarURL = document.createElement('button');
    btnExportarURL.className = 'btn btn--outline btn--sm';
    btnExportarURL.textContent = '🔗 Exportar como URL';
    btnExportarURL.onclick = exportarComoURL;
    container.appendChild(btnExportarURL);

    // Botón para importar datos desde URL (opcional, normalmente se detecta automáticamente)
    // const btnImportarURL = document.createElement('button');
    // btnImportarURL.className = 'btn btn--outline btn--sm';
    // btnImportarURL.textContent = 'Importar desde URL';
    // btnImportarURL.onclick = importarDesdeURL;
    // container.appendChild(btnImportarURL);

    // Botón para exportar datos como archivo JSON
    const btnExportarJSON = document.createElement('button');
    btnExportarJSON.className = 'btn btn--outline btn--sm';
    btnExportarJSON.textContent = '📁 Exportar como JSON';
    btnExportarJSON.onclick = exportarComoJSON;
    container.appendChild(btnExportarJSON);

    // Botón para importar datos desde archivo JSON
    const btnImportarJSON = document.createElement('button');
    btnImportarJSON.className = 'btn btn--outline btn--sm';
    btnImportarJSON.textContent = 'Importar desde JSON';
    btnImportarJSON.onclick = importarDesdeJSON;
    container.appendChild(btnImportarJSON);
}

// Función auxiliar para exportar datos como URL
function exportarComoURL() {
    try {
        // Convertimos appData a JSON y lo codificamos para la URL
        const datosJSON = JSON.stringify(appData);
        const datosCodificados = encodeURIComponent(datosJSON);

        // Creamos la URL con el parámetro data
        const url = new URL(window.location.href);
        url.searchParams.set('data', datosCodificados);

        // Copiamos la URL al portapapeles
        navigator.clipboard.writeText(url.href)
            .then(() => {
                showNotification('✓ URL copiada al portapapeles');
            })
            .catch(() => {
                prompt('Copie esta URL para compartir los datos:', url.href);
            });
    } catch (error) {
        console.error('Error al exportar como URL:', error);
        showNotification('❌ Error al exportar como URL', 'error');
    }
}

// Función auxiliar para exportar datos como archivo JSON
function exportarComoJSON() {
    const datosJSON = JSON.stringify(appData, null, 2);
    const blob = new Blob([datosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asistencia.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Función auxiliar para importar datos desde archivo JSON
function importarDesdeJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const datos = JSON.parse(event.target.result);
                if (datos && typeof datos === 'object' && Array.isArray(datos.participants)) {
                    appData.participants = datos.participants;
                    if (datos.currentEvent) appData.currentEvent = datos.currentEvent;
                    if (datos.eventDate) appData.eventDate = datos.eventDate;
                    updateUI();
                    if (typeof updateSummary === 'function') updateSummary();
                    showNotification(`✓ Se importaron ${datos.participants.length} participantes desde el archivo`);
                }
            } catch (error) {
                showNotification('❌ Error al importar el archivo', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

