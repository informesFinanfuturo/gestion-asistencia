import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js';

// Application Data
const appData = {
    participants: [],
    currentTab: 'agregar',
    nextId: 1,
    previewData: []
};

const EVENT_ID = 'evento_actual';

const firebaseConfig = {
  apiKey: "AIzaSyAdUT0PWZCmnrUllDsog4wv_jvbhAVNl",
  authDomain: "gestion-de-asistencia-11fb2.firebaseapp.com",
  databaseURL: "https://gestion-de-asistencia-11fb2-default-rtdb.firebaseio.com",
  projectId: "gestion-de-asistencia-11fb2",
  storageBucket: "gestion-de-asistencia-11fb2.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Guardar datos en Firebase
function saveToFirebase() {
  set(ref(database, 'eventos/' + EVENT_ID), appData)
    .then(() => {
      console.log('Datos sincronizados con Firebase');
    })
    .catch((error) => {
      console.error('Error al sincronizar:', error);
    });
}

function loadFromFirebase() {
  onValue(ref(database, 'eventos/' + EVENT_ID), (snapshot) => {
    const data = snapshot.val();
    if (data) {
      appData.participants = data.participants || [];
      // Asegurarse de que nextId sea mayor que cualquier ID existente
      appData.nextId = Math.max(...appData.participants.map(p => p.id), 0) + 1;
      updateUI();
      showNotification(`✓ Datos sincronizados: ${appData.participants.length} participantes`);
    } else {
        // Si no hay datos en Firebase, inicializar appData y guardar
        appData.participants = [];
        appData.nextId = 1;
        saveToFirebase();
        updateUI();
        showNotification('✓ Base de datos de Firebase inicializada.');
    }
  });
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

        // Reiniciar appData a su estado inicial
        appData.participants = [];
        appData.currentEvent = '';
        appData.eventDate = '';
        appData.nextId = 1;

        // Guardar el estado vacío en Firebase para borrar los datos remotos
        set(ref(database, 'eventos/' + EVENT_ID), null) // Establecer a null para eliminar el nodo
            .then(() => {
                console.log('Datos eliminados de Firebase exitosamente.');
                // Actualizar la interfaz después de la eliminación exitosa
                updateUI();
                if (typeof updateSummary === 'function') {
                    updateSummary();
                }
                showNotification('✓ Todos los datos han sido eliminados exitosamente.');
            })
            .catch((error) => {
                console.error('Error al eliminar datos de Firebase:', error);
                showError('Error al eliminar los datos de Firebase. Inténtalo de nuevo.');
            });

        return true;

    } catch (error) {
        console.error('Error al limpiar datos (local):', error);
        showError('Error al limpiar los datos. Inténtalo de nuevo.');
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

// Funciones de validación y procesamiento de Excel
function validateExcelFile(file) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_PARTICIPANTS = 1000;

    if (!file) {
        return { valid: false, message: 'No se ha seleccionado ningún archivo.' };
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension)) {
        return { valid: false, message: 'Formato de archivo no soportado. Por favor, sube un archivo .xlsx o .xls.' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, message: `El archivo es demasiado grande. El tamaño máximo permitido es de ${MAX_FILE_SIZE / (1024 * 1024)} MB.` };
    }

    return { valid: true };
}

function processExcelData(jsonData) {
    const participants = [];
    if (jsonData.length <= 1) return participants; // Skip header row

    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const nombre = row[0];
        const entidad = row[1];

        if (nombre && entidad) {
            participants.push({
                id: appData.nextId++,
                nombre: String(nombre).trim(),
                entidad: String(entidad).trim(),
                asistencia: false
            });
        }
    }
    return participants;
}

function renderPreviewTable(participants) {
    const tableBody = document.getElementById('previewTableBody');
    tableBody.innerHTML = '';
    participants.forEach(p => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = p.nombre;
        row.insertCell().textContent = p.entidad;
    });
    document.getElementById('previewCount').textContent = `${participants.length} participantes encontrados`;
}

function confirmImport() {
    appData.participants = appData.participants.concat(appData.previewData);
    appData.previewData = [];
    document.getElementById('previewSection').classList.add('hidden');
    updateUI();
    saveToFirebase(); // Guardar en Firebase después de la importación
    showNotification('✓ Participantes importados exitosamente desde Excel.');
}

function cancelImport() {
    appData.previewData = [];
    document.getElementById('previewSection').classList.add('hidden');
    showNotification('Importación de Excel cancelada.', 'error');
}

function processExcelFile(file) {
    // Validate file
    const validation = validateExcelFile(file);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }

    // Show processing status
    document.getElementById('processingStatus').classList.remove('hidden');
    document.getElementById('errorMessage').classList.add('hidden');

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Process JSON data
        const processedParticipants = processExcelData(json);

        if (processedParticipants.length === 0) {
            showError('No se encontraron participantes válidos en el archivo Excel.');
            document.getElementById('processingStatus').classList.add('hidden');
            return;
        }

        appData.previewData = processedParticipants;
        renderPreviewTable(processedParticipants);
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
    };
    reader.readAsArrayBuffer(file);
}

// Initialize application
document.addEventListener('DOMContentLoaded', function () {
    loadFromFirebase(); // Tu función existente
    // Las siguientes funciones se han comentado porque no están definidas en el código proporcionado
    // verificarDatosEnURL(); // Detecta datos en URL automáticamente
    // agregarBotonesSincronizacion(); // Agrega interfaz de sincronización
    initializeTabs();
    initializeExcelImport();
    initializeManualEntry();
    initializeAttendance();
    initializeSummary();
    // updateUI(); // Se llama dentro de loadFromFirebase
});

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
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

// Manual Entry Functionality
function initializeManualEntry() {
    const form = document.getElementById('addParticipantForm');
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const nombreInput = document.getElementById('nombre');
        const entidadInput = document.getElementById('entidad');

        const nombre = nombreInput.value.trim();
        const entidad = entidadInput.value.trim();

        if (nombre && entidad) {
            addParticipant(nombre, entidad);
            nombreInput.value = '';
            entidadInput.value = '';
            showNotification('✓ Participante agregado manualmente.');
        } else {
            showError('Por favor, completa todos los campos para agregar un participante.');
        }
    });
}

function addParticipant(nombre, entidad) {
    const newParticipant = {
        id: appData.nextId++,
        nombre: nombre,
        entidad: entidad,
        asistencia: false
    };
    appData.participants.push(newParticipant);
    updateUI();
    saveToFirebase(); // Guardar en Firebase después de agregar manualmente
}

// Update UI
function updateUI() {
    renderParticipantsList();
    updateTotalParticipantsCount();
    if (appData.currentTab === 'asistencia') {
        renderAttendanceList();
    } else if (appData.currentTab === 'resumen') {
        updateSummary();
    }
}

function renderParticipantsList() {
    const participantsListDiv = document.getElementById('participantsList');
    participantsListDiv.innerHTML = '';
    if (appData.participants.length === 0) {
        participantsListDiv.innerHTML = '<p class="no-data-message">Aún no hay participantes registrados.</p>';
        return;
    }

    appData.participants.forEach(p => {
        const participantCard = document.createElement('div');
        participantCard.className = 'participant-card';
        participantCard.innerHTML = `
            <div class="participant-info">
                <span class="participant-name">${p.nombre}</span>
                <span class="participant-entity">${p.entidad}</span>
            </div>
            <button class="btn btn--danger btn--sm delete-participant-btn" data-id="${p.id}">
                🗑️
            </button>
        `;
        participantsListDiv.appendChild(participantCard);
    });

    // Attach event listeners after rendering
    document.querySelectorAll('.delete-participant-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            removeParticipant(id);
        });
    });
}

function removeParticipant(id) {
    appData.participants = appData.participants.filter(p => p.id !== id);
    updateUI();
    saveToFirebase(); // Guardar en Firebase después de eliminar
    showNotification('✓ Participante eliminado.');
}

function updateTotalParticipantsCount() {
    document.getElementById('totalParticipants').textContent = `${appData.participants.length} participantes`;
}

// Attendance Functionality
function initializeAttendance() {
    const searchInput = document.getElementById('searchParticipant');
    searchInput.addEventListener('input', renderAttendanceList);
}

function renderAttendanceList() {
    const attendanceListDiv = document.getElementById('attendanceList');
    attendanceListDiv.innerHTML = '';
    const searchTerm = document.getElementById('searchParticipant').value.toLowerCase();

    const filteredParticipants = appData.participants.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm) ||
        p.entidad.toLowerCase().includes(searchTerm)
    );

    if (filteredParticipants.length === 0) {
        attendanceListDiv.innerHTML = '<p class="no-data-message">No se encontraron participantes que coincidan con la búsqueda.</p>';
        updateAttendanceCounters();
        return;
    }

    filteredParticipants.forEach(p => {
        const attendanceItem = document.createElement('div');
        attendanceItem.className = `attendance-item ${p.asistencia ? 'present' : 'absent'}`;
        attendanceItem.innerHTML = `
            <div class="attendance-info">
                <span class="attendance-name">${p.nombre}</span>
                <span class="participant-entity">${p.entidad}</span>
            </div>
            <div class="attendance-actions">
                <button class="btn btn--icon ${p.asistencia ? 'btn--success' : 'btn--outline'}" data-id="${p.id}">
                    ${p.asistencia ? '✅' : '❌'}
                </button>
            </div>
        `;
        attendanceListDiv.appendChild(attendanceItem);
    });
    updateAttendanceCounters();

    // Attach event listeners after rendering
    document.querySelectorAll('.attendance-actions button').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            toggleAttendance(id);
        });
    });
}

function toggleAttendance(id) {
    const participant = appData.participants.find(p => p.id === id);
    if (participant) {
        participant.asistencia = !participant.asistencia;
        updateUI();
        saveToFirebase(); // Guardar en Firebase después de cambiar asistencia
        showNotification(`Asistencia de ${participant.nombre} actualizada.`);
    }
}

function updateAttendanceCounters() {
    const presentCount = appData.participants.filter(p => p.asistencia).length;
    const absentCount = appData.participants.length - presentCount;

    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
}

// Summary Functionality
function initializeSummary() {
    document.getElementById('exportBtn').addEventListener('click', copyAttendanceList);
}

function updateSummary() {
    const total = appData.participants.length;
    const present = appData.participants.filter(p => p.asistencia).length;
    const absent = total - present;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    document.getElementById('summaryTotal').textContent = total;
    document.getElementById('summaryPresent').textContent = present;
    document.getElementById('summaryAbsent').textContent = absent;
    document.getElementById('summaryPercentage').textContent = `${percentage}%`;

    renderFinalAttendanceList();
}

function renderFinalAttendanceList() {
    const finalAttendanceListDiv = document.getElementById('finalAttendanceList');
    finalAttendanceListDiv.innerHTML = '';

    if (appData.participants.length === 0) {
        finalAttendanceListDiv.innerHTML = '<p class="no-data-message">No hay participantes para mostrar en el resumen.</p>';
        return;
    }

    appData.participants.forEach(p => {
        const item = document.createElement('div');
        item.className = 'final-list-item';
        item.textContent = `${p.nombre} - ${p.entidad} (${p.asistencia ? 'Presente' : 'Ausente'})`;
        finalAttendanceListDiv.appendChild(item);
    });
}

function copyAttendanceList() {
    const finalAttendanceListDiv = document.getElementById('finalAttendanceList');
    const range = document.createRange();
    range.selectNode(finalAttendanceListDiv);
    window.getSelection().removeAllRanges(); // Clear current selection
    window.getSelection().addRange(range); // Select the text
    try {
        document.execCommand('copy');
        showNotification('Lista copiada al portapapeles.');
    } catch (err) {
        console.error('Error al copiar la lista:', err);
        showError('No se pudo copiar la lista.');
    }
    window.getSelection().removeAllRanges(); // Deselect the text
}

function showError(message) {
    const errorMessageDiv = document.getElementById('errorMessage');
    document.getElementById('errorText').textContent = message;
    errorMessageDiv.classList.remove('hidden');
    // Ocultar el mensaje de error después de 5 segundos
    setTimeout(() => {
        errorMessageDiv.classList.add('hidden');
    }, 5000);
}

// Funciones que estaban comentadas y no se usan actualmente
/*
function verificarDatosEnURL() {
    // Lógica para verificar datos en URL
}

function agregarBotonesSincronizacion() {
    // Lógica para agregar botones de sincronización
}
*/

// Event listener para el botón de limpiar datos
document.addEventListener('DOMContentLoaded', () => {
    const clearButton = document.querySelector('button[onclick="clearStorage()"]');
    if (clearButton) {
        clearButton.addEventListener('click', clearStorage);
    }
});


