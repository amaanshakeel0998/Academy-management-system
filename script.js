// Theme Management
const themeToggle = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("theme");

if (currentTheme === "dark") {
    document.body.classList.add("dark-theme");
    if (themeToggle) themeToggle.innerText = "☀️";
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
        let theme = "light";
        if (document.body.classList.contains("dark-theme")) {
            theme = "dark";
            themeToggle.innerText = "☀️";
        } else {
            themeToggle.innerText = "🌙";
        }
        localStorage.setItem("theme", theme);
    });
}

const addBtn = document.querySelector(".add-btn");
const typeModal = document.getElementById("typeModal");
const formModal = document.getElementById("formModal");
const detailsModal = document.getElementById("detailsModal");
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const formTitle = document.getElementById("formTitle");
const savedList = document.getElementById("savedList");
const entryForm = document.getElementById("entryForm");
const deleteEntryBtn = document.getElementById("deleteEntryBtn");

const studentFields = document.getElementById("studentFields");
const teacherFields = document.getElementById("teacherFields");

// Details modal elements
const detailsTitle = document.getElementById("detailsTitle");
const detailsBody = document.getElementById("detailsBody");
const editBtnDetails = document.getElementById("editBtnDetails");
const deleteBtnDetails = document.getElementById("deleteBtnDetails");

let currentType = "";
let editingId = null;
let currentViewingId = null;
let db;
let currentFilter = "student"; // Default filter

const searchInput = document.getElementById("searchInput");
const listTitle = document.querySelector(".saved-list h2");
const studentStatCard = document.getElementById("studentStatCard");
const teacherStatCard = document.getElementById("teacherStatCard");
const alertsModal = document.getElementById("alertsModal");
const alertsList = document.getElementById("alertsList");
const fabMainBtn = document.getElementById("fabMainBtn");
const fabMenu = document.getElementById("fabMenu");
const fabBadge = document.getElementById("fabBadge");
const openAlertsBtn = document.getElementById("openAlertsBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const importDataBtn = document.getElementById("importDataBtn");
const restoreFileInput = document.getElementById("restoreFileInput");
const openAnalyticsBtn = document.getElementById("openAnalyticsBtn");
const analyticsModal = document.getElementById("analyticsModal");

let allEntries = [];
const notifiedIds = new Set();
let enrollmentChartInstance = null;
let currentChartType = 'student';

const studentChartBtn = document.getElementById('studentChartBtn');
const teacherChartBtn = document.getElementById('teacherChartBtn');

if (studentChartBtn) {
    studentChartBtn.addEventListener('click', () => {
        currentChartType = 'student';
        studentChartBtn.classList.add('active');
        teacherChartBtn.classList.remove('active');
        updateEnrollmentChart();
    });
}
if (teacherChartBtn) {
    teacherChartBtn.addEventListener('click', () => {
        currentChartType = 'teacher';
        teacherChartBtn.classList.add('active');
        studentChartBtn.classList.remove('active');
        updateEnrollmentChart();
    });
}

// Request Notification Permission
if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// IndexedDB Initialization
const request = indexedDB.open("IlmSphereDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("entries")) {
        db.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    updateActiveCard(); // Set initial active state
    loadEntries();
};

request.onerror = (e) => console.error("Database error:", e.target.error);

// Floating Action Menu Toggle
fabMainBtn.addEventListener("click", () => {
    fabMainBtn.classList.toggle("active");
    fabMenu.classList.toggle("show");
});

openAlertsBtn.addEventListener("click", () => {
    openModal(alertsModal);
    fabMainBtn.classList.remove("active");
    fabMenu.classList.remove("show");
});

if (openAnalyticsBtn) {
    openAnalyticsBtn.addEventListener('click', () => {
        openModal(analyticsModal);
        updateEnrollmentChart();
        fabMainBtn.classList.remove('active');
        fabMenu.classList.remove('show');
    });
}

exportPdfBtn.addEventListener("click", () => {
    generatePDF();
    fabMainBtn.classList.remove("active");
    fabMenu.classList.remove("show");
});

if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
        backupToJSON();
        fabMainBtn.classList.remove('active');
        fabMenu.classList.remove('show');
    });
}
if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
        exportToCSV();
        fabMainBtn.classList.remove('active');
        fabMenu.classList.remove('show');
    });
}
if (importDataBtn) {
    importDataBtn.addEventListener('click', () => {
        restoreFileInput.click();
        fabMainBtn.classList.remove('active');
        fabMenu.classList.remove('show');
    });
}
if (restoreFileInput) {
    restoreFileInput.addEventListener('change', handleRestoreFile, false);
}

// Helper to open modal
function openModal(modal) {
    modal.classList.add("show");
}

// Helper to close modal
function closeModal(modal) {
    modal.classList.remove("show");
    if (modal === formModal) {
        entryForm.reset();
        editingId = null;
        deleteEntryBtn.style.display = "none";
    }
}

function closeDetails() {
    closeModal(detailsModal);
    currentViewingId = null;
}

// Open first modal
addBtn.addEventListener("click", () => {
    openModal(typeModal);
});

// Open form based on type
function openForm(type, data = null) {
    currentType = type;
    closeModal(typeModal);
    closeModal(detailsModal); // Close details if we're moving to edit
    closeModal(alertsModal); // Close alerts if opening form
    openModal(formModal);

    if (type === "student") {
        formTitle.innerText = data ? "Edit Student" : "Add Student";
        studentFields.style.display = "grid";
        teacherFields.style.display = "none";
        document.getElementById("name").required = true;
        document.getElementById("teacherName").required = false;
        if (data) fillStudentForm(data);
    } else {
        formTitle.innerText = data ? "Edit Teacher" : "Add Teacher";
        studentFields.style.display = "none";
        teacherFields.style.display = "grid";
        document.getElementById("name").required = false;
        document.getElementById("teacherName").required = true;
        
        // Populate Students list
        const studentSelect = document.getElementById("teacherStudents");
        studentSelect.innerHTML = "";
        allEntries.filter(e => e.type === "student").sort((a,b) => a.name.localeCompare(b.name)).forEach(s => {
            const option = document.createElement("option");
            option.value = s.id;
            option.text = s.name;
            studentSelect.appendChild(option);
        });

        if (data) fillTeacherForm(data);
    }

    if (data) {
        editingId = data.id;
        deleteEntryBtn.style.display = "block";
    }
}

function fillStudentForm(data) {
    document.getElementById("name").value = data.name;
    document.getElementById("classType").value = data.classType;
    document.getElementById("classTime").value = data.classTime;
    document.getElementById("enrollDate").value = data.enrollDate;
    document.getElementById("currency").value = data.currency || "PKR";
    document.getElementById("fees").value = data.fees;
    document.getElementById("feesDueDate").value = data.feesDueDate;
    document.getElementById("guardianName").value = data.guardianName;
    document.getElementById("guardianContact").value = data.guardianContact;
}

function fillTeacherForm(data) {
    document.getElementById("teacherName").value = data.name;
    document.getElementById("teacherSubject").value = data.subject;
    document.getElementById("teacherQualification").value = data.qualification || "";
    document.getElementById("teacherContact").value = data.contact || "";
    document.getElementById("teacherCurrency").value = data.currency || "PKR";
    document.getElementById("teacherSalary").value = data.salary || "";
    document.getElementById("teacherJoinDate").value = data.joinDate || "";
    
    // Select assigned students
    const studentSelect = document.getElementById("teacherStudents");
    const assignedIds = data.assignedStudents || [];
    Array.from(studentSelect.options).forEach(opt => {
        opt.selected = assignedIds.includes(Number(opt.value));
    });
}

// Close form
function closeForm() {
    closeModal(formModal);
}

// Close modals on background click
window.addEventListener("click", (e) => {
    if (e.target === typeModal) closeModal(typeModal);
    if (e.target === formModal) closeModal(formModal);
    if (e.target === detailsModal) closeDetails();
    if (e.target === deleteConfirmModal) closeModal(deleteConfirmModal);
});

// Delete confirmation logic
let idToDelete = null;

function showDeleteConfirm(id) {
    idToDelete = id;
    openModal(deleteConfirmModal);
}

confirmDeleteBtn.addEventListener("click", () => {
    if (idToDelete) {
        deleteFromDB(idToDelete);
        idToDelete = null;
        closeModal(deleteConfirmModal);
    }
});

cancelDeleteBtn.addEventListener("click", () => {
    idToDelete = null;
    closeModal(deleteConfirmModal);
});

// Save entry
entryForm.addEventListener("submit", function (e) {
    e.preventDefault();

    let entryData = {
        type: currentType,
        timestamp: Date.now()
    };

    if (editingId) entryData.id = editingId;

    if (currentType === "student") {
        Object.assign(entryData, {
            name: document.getElementById("name").value,
            classType: document.getElementById("classType").value,
            classTime: document.getElementById("classTime").value,
            enrollDate: document.getElementById("enrollDate").value,
            currency: document.getElementById("currency").value,
            fees: document.getElementById("fees").value,
            feesDueDate: document.getElementById("feesDueDate").value,
            guardianName: document.getElementById("guardianName").value,
            guardianContact: document.getElementById("guardianContact").value
        });
    } else {
        const studentSelect = document.getElementById("teacherStudents");
        const assignedStudents = Array.from(studentSelect.selectedOptions).map(opt => Number(opt.value));
        
        Object.assign(entryData, {
            name: document.getElementById("teacherName").value,
            subject: document.getElementById("teacherSubject").value,
            qualification: document.getElementById("teacherQualification").value,
            contact: document.getElementById("teacherContact").value,
            currency: document.getElementById("teacherCurrency").value,
            salary: document.getElementById("teacherSalary").value,
            joinDate: document.getElementById("teacherJoinDate").value,
            assignedStudents: assignedStudents
        });
    }

    const transaction = db.transaction(["entries"], "readwrite");
    const store = transaction.objectStore("entries");
    store.put(entryData);

    transaction.oncomplete = () => {
        loadEntries();
        closeModal(formModal);
    };
});

// Delete entry from modal
deleteEntryBtn.addEventListener("click", () => {
    if (editingId) {
        showDeleteConfirm(editingId);
    }
});

function deleteFromDB(id) {
    const transaction = db.transaction(["entries"], "readwrite");
    const store = transaction.objectStore("entries");
    store.delete(id);
    transaction.oncomplete = () => {
        loadEntries();
        closeModal(formModal);
        closeDetails();
    };
}

function loadEntries() {
    const transaction = db.transaction(["entries"], "readonly");
    const store = transaction.objectStore("entries");
    const request = store.getAll();

    request.onsuccess = () => {
        allEntries = request.result;
        applyFilters(); // Use filtered view on load
        // Chart is updated when analytics modal is opened
    };
}

studentStatCard.addEventListener("click", () => {
    currentFilter = "student";
    updateActiveCard();
    applyFilters();
});

teacherStatCard.addEventListener("click", () => {
    currentFilter = "teacher";
    updateActiveCard();
    applyFilters();
});

function updateActiveCard() {
    studentStatCard.classList.toggle("active", currentFilter === "student");
    teacherStatCard.classList.toggle("active", currentFilter === "teacher");
}

function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const filtered = allEntries.filter(entry => {
        const matchesType = entry.type === currentFilter;
        const name = entry.name.toLowerCase();
        const subject = (entry.subject || "").toLowerCase();
        const classType = (entry.classType || "").toLowerCase();
        const matchesQuery = name.includes(query) || subject.includes(query) || classType.includes(query);
        return matchesType && matchesQuery;
    });
    renderEntries(filtered);
}

searchInput.addEventListener("input", applyFilters);

const entriesContainer = document.getElementById("entriesContainer");

function updateStats() {
    const totalStudents = allEntries.filter(e => e.type === "student").length;
    const totalTeachers = allEntries.filter(e => e.type === "teacher").length;
    
    // Analyze Fees
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alerts = [];
    let pendingCount = 0;

    allEntries.forEach(entry => {
        if (entry.type === "student" && entry.feesDueDate) {
            const dueDate = new Date(entry.feesDueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 3) {
                pendingCount++;
                alerts.push({
                    id: entry.id,
                    name: entry.name,
                    dueDate: entry.feesDueDate,
                    isOverdue: diffDays < 0,
                    daysLeft: diffDays
                });
            }
        }
    });

    document.getElementById("totalStudents").innerText = totalStudents;
    document.getElementById("totalTeachers").innerText = totalTeachers;
    
    // Update FAB Badge
    if (pendingCount > 0) {
        fabBadge.innerText = pendingCount;
        fabBadge.style.display = "flex";
    } else {
        fabBadge.style.display = "none";
    }

    renderAlerts(alerts);
    // Chart updated lazily on analytics open
}

function renderAlerts(alerts) {
    if (alerts.length === 0) {
        alertsList.innerHTML = "<p style='color: #666; text-align: center; padding: 20px;'>No pending fee reminders at the moment.</p>";
        return;
    }

    alertsList.innerHTML = "";
    alerts.forEach(alert => {
        const div = document.createElement("div");
        div.className = `alert-item ${alert.isOverdue ? "overdue" : ""}`;
        
        let message = alert.isOverdue 
            ? `Payment OVERDUE since ${alert.dueDate}` 
            : `Due in ${alert.daysLeft} day(s) (${alert.dueDate})`;
        
        if (alert.daysLeft === 0) message = `Due TODAY (${alert.dueDate})`;

        div.innerHTML = `
            <div class="alert-info">
                <span class="alert-name">${alert.name}</span>
                <span class="alert-date">${message}</span>
            </div>
            <div class="alert-actions">
                <button class="paid-btn" onclick="markAsPaid(${alert.id})">Mark Done</button>
                <button class="view-btn" onclick="showDetails(${alert.id})">View</button>
            </div>
        `;
        alertsList.appendChild(div);

        // Browser Notification
        if (Notification.permission === "granted" && !notifiedIds.has(alert.id)) {
            new Notification("Fee Reminder: Ilm-Sphere Academy", {
                body: `${alert.name}'s fee is ${alert.isOverdue ? 'OVERDUE' : 'due soon'}.`,
                icon: "LOGO.jpg"
            });
            notifiedIds.add(alert.id);
        }
    });
}

function getTeacherForStudent(studentId) {
    const teacher = allEntries.find(e => e.type === "teacher" && e.assignedStudents && e.assignedStudents.includes(studentId));
    return teacher ? teacher.name : "N/A";
}

function renderEntries(entries) {
    updateStats();
    listTitle.innerText = currentFilter === "student" ? "Student List" : "Teacher List";
    entriesContainer.innerHTML = "";
    
    if (entries.length === 0) {
        entriesContainer.innerHTML = "<p style='text-align:center; padding: 20px; opacity: 0.6;'>No entries found.</p>";
        return;
    }

    // Header for the list
    const header = document.createElement("div");
    header.className = "saved-item-header";
    header.innerHTML = `
        <span>Name</span>
        <span>${currentFilter === 'student' ? 'Teacher / Class' : 'Subject'}</span>
        <span>${currentFilter === 'student' ? 'Time' : 'Salary'}</span>
    `;
    entriesContainer.appendChild(header);

    // Sort entries by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    entries.forEach(entry => {
        const div = document.createElement("div");
        div.className = "saved-item";
        div.onclick = () => showDetails(entry.id);
        
        let statusBadge = "";
        if (entry.type === "student" && entry.feesDueDate) {
            const dueDate = new Date(entry.feesDueDate);
            dueDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                statusBadge = '<span class="status-badge status-overdue">Overdue</span>';
            } else if (diffDays <= 3) {
                statusBadge = '<span class="status-badge status-due-soon">Due Soon</span>';
            }
        }

        if (entry.type === "student") {
            const teacherName = getTeacherForStudent(entry.id);
            div.innerHTML = `
                <span style="font-weight: bold; display: flex; align-items: center; gap: 10px;">
                    ${entry.name} ${statusBadge}
                </span>
                <span style="display: flex; flex-direction: column;">
                    <small style="color: var(--accent-color); font-weight: bold;">Teacher: ${teacherName}</small>
                    <span>${entry.classType}</span>
                </span>
                <span>${entry.classTime}</span>
            `;
        } else {
            div.innerHTML = `
                <span style="font-weight: bold;">${entry.name} <small>(Teacher)</small></span>
                <span>${entry.subject}</span>
                <span>${entry.currency} ${entry.salary || "0"}</span>
            `;
        }
        entriesContainer.appendChild(div);
    });
}

function showDetails(id) {
    currentViewingId = id;
    const transaction = db.transaction(["entries"], "readonly");
    const store = transaction.objectStore("entries");
    const request = store.get(id);

    request.onsuccess = () => {
        const entry = request.result;
        detailsTitle.innerText = entry.type === "student" ? "Student Details" : "Teacher Details";
        
        let bodyHtml = "";
        if (entry.type === "student") {
            const teacherName = getTeacherForStudent(entry.id);
            bodyHtml = `
                <div class="detail-item"><span class="detail-label">Full Name</span><span class="detail-value">${entry.name}</span></div>
                <div class="detail-item"><span class="detail-label">Assigned Teacher</span><span class="detail-value" style="color: var(--accent-color);">${teacherName}</span></div>
                <div class="detail-item"><span class="detail-label">Class Type</span><span class="detail-value">${entry.classType}</span></div>
                <div class="detail-item"><span class="detail-label">Class Time</span><span class="detail-value">${entry.classTime}</span></div>
                <div class="detail-item"><span class="detail-label">Enrollment Date</span><span class="detail-value">${entry.enrollDate || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Fees Amount</span><span class="detail-value" style="color: #27ae60; font-weight: bold;">${entry.currency} ${entry.fees}</span></div>
                <div class="detail-item"><span class="detail-label">Fees Due Date</span><span class="detail-value" style="color: #e74c3c;">${entry.feesDueDate || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Guardian Name</span><span class="detail-value">${entry.guardianName || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Guardian Contact</span>
                    <span class="detail-value contact-with-actions">
                        ${entry.guardianContact || "N/A"}
                        ${entry.guardianContact ? `
                        <span class="contact-actions">
                            <button id="callBtn" class="icon-btn call" title="Call">📞</button>
                            <button id="waBtn" class="icon-btn whatsapp" title="WhatsApp">💬</button>
                        </span>` : ''}
                    </span>
                </div>
            `;
        } else {
            const assignedStudentsNames = (entry.assignedStudents || []).map(sid => {
                const s = allEntries.find(e => e.id === sid);
                return s ? s.name : null;
            }).filter(Boolean).join(", ") || "None";

            bodyHtml = `
                <div class="detail-item"><span class="detail-label">Full Name</span><span class="detail-value">${entry.name}</span></div>
                <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Assigned Students</span><span class="detail-value" style="color: var(--accent-color);">${assignedStudentsNames}</span></div>
                <div class="detail-item"><span class="detail-label">Subject</span><span class="detail-value">${entry.subject}</span></div>
                <div class="detail-item"><span class="detail-label">Qualification</span><span class="detail-value">${entry.qualification || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Contact Number</span><span class="detail-value">${entry.contact || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Salary</span><span class="detail-value" style="color: #27ae60; font-weight: bold;">${entry.currency} ${entry.salary || "0"}</span></div>
                <div class="detail-item"><span class="detail-label">Joining Date</span><span class="detail-value">${entry.joinDate || "N/A"}</span></div>
            `;
        }
        
        detailsBody.innerHTML = bodyHtml;
        
        // Setup action buttons in details modal
        const actionsContainer = detailsModal.querySelector(".form-actions");
        actionsContainer.innerHTML = `
            ${entry.type === 'student' ? `<button id="markPaidBtn" class="paid-btn">Mark Done</button>` : ''}
            <button id="editBtnDetails" class="save-btn">Edit</button>
            <button id="deleteBtnDetails" class="delete-btn-modal">Delete</button>
        `;

        if (entry.type === 'student') {
            document.getElementById("markPaidBtn").onclick = () => markAsPaid(entry.id);
            // Wire contact buttons if contact exists
            if (entry.guardianContact) {
                const callBtn = document.getElementById('callBtn');
                const waBtn = document.getElementById('waBtn');
                if (callBtn) callBtn.onclick = (e) => { e.stopPropagation(); dialNumber(entry.guardianContact); };
                if (waBtn) waBtn.onclick = (e) => { e.stopPropagation(); openWhatsAppReminder(entry.guardianContact, entry.name, entry.currency, entry.fees, entry.feesDueDate); };
            }
        }
        document.getElementById("editBtnDetails").onclick = () => openForm(entry.type, entry);
        document.getElementById("deleteBtnDetails").onclick = () => {
            showDeleteConfirm(entry.id);
        };
        
        openModal(detailsModal);
    };
}

function markAsPaid(id) {
    const transaction = db.transaction(["entries"], "readwrite");
    const store = transaction.objectStore("entries");
    const request = store.get(id);

    request.onsuccess = () => {
        const entry = request.result;
        if (entry && entry.type === "student" && entry.feesDueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const currentDueDate = new Date(entry.feesDueDate);
            
            // Advance by 1 month at least once, and keep advancing until it's in the future
            do {
                currentDueDate.setMonth(currentDueDate.getMonth() + 1);
            } while (currentDueDate <= today);
            
            // Format back to YYYY-MM-DD
            const year = currentDueDate.getFullYear();
            const month = String(currentDueDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDueDate.getDate()).padStart(2, '0');
            entry.feesDueDate = `${year}-${month}-${day}`;
            
            store.put(entry);
        }
    };

    transaction.oncomplete = () => {
        loadEntries();
        closeDetails();
        closeModal(alertsModal);
        
        // Remove from notified set so it can notify again next month
        notifiedIds.delete(id);
    };
}

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function backupToJSON() {
    const payload = {
        meta: {
            app: 'Ilm-Sphere Academy',
            version: 1,
            exportedAt: new Date().toISOString()
        },
        entries: allEntries
    };
    downloadBlob(JSON.stringify(payload, null, 2), `ilm-sphere-backup-${Date.now()}.json`, 'application/json');
}

function toCSVRow(values) {
    return values.map(v => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        if (/[",\n]/.test(s)) return `"${s}"`;
        return s;
    }).join(',');
}

function exportToCSV() {
    const headers = ['id','type','timestamp','name','classType','classTime','enrollDate','currency','fees','feesDueDate','guardianName','guardianContact','subject','qualification','contact','salary','joinDate'];
    const rows = [toCSVRow(headers)];

    allEntries.forEach(e => {
        rows.push(toCSVRow([
            e.id ?? '', e.type ?? '', e.timestamp ?? '', e.name ?? '', e.classType ?? '', e.classTime ?? '', e.enrollDate ?? '',
            e.currency ?? '', e.fees ?? '', e.feesDueDate ?? '', e.guardianName ?? '', e.guardianContact ?? '', e.subject ?? '',
            e.qualification ?? '', e.contact ?? '', e.salary ?? '', e.joinDate ?? ''
        ]));
    });

    downloadBlob(rows.join('\n'), `ilm-sphere-export-${Date.now()}.csv`, 'text/csv');
}

async function handleRestoreFile(evt) {
    const file = evt.target.files[0];
    evt.target.value = '';
    if (!file) return;

    const text = await file.text();
    const isJSON = file.name.toLowerCase().endsWith('.json');

    let importedEntries = [];
    try {
        if (isJSON) {
            const payload = JSON.parse(text);
            importedEntries = payload.entries || (Array.isArray(payload) ? payload : []);
        } else {
            importedEntries = parseCSV(text);
        }
    } catch (err) {
        alert('Failed to parse the selected file. Make sure it is a valid JSON or CSV.');
        return;
    }

    if (!Array.isArray(importedEntries)) {
        alert('Invalid backup format.');
        return;
    }

    const strategy = confirm('Click OK to REPLACE existing data. Click Cancel to MERGE (keep both).');
    await restoreEntries(importedEntries, strategy ? 'replace' : 'merge');
    loadEntries();
    alert('Data restored successfully.');
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));

    const idx = (name) => header.indexOf(name);

    const out = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        const obj = {
            id: toNumber(row[idx('id')]),
            type: row[idx('type')],
            timestamp: toNumber(row[idx('timestamp')]),
            name: row[idx('name')],
            classType: row[idx('classType')],
            classTime: row[idx('classTime')],
            enrollDate: row[idx('enrollDate')],
            currency: row[idx('currency')],
            fees: row[idx('fees')],
            feesDueDate: row[idx('feesDueDate')],
            guardianName: row[idx('guardianName')],
            guardianContact: row[idx('guardianContact')],
            subject: row[idx('subject')],
            qualification: row[idx('qualification')],
            contact: row[idx('contact')],
            salary: row[idx('salary')],
            joinDate: row[idx('joinDate')]
        };
        out.push(obj);
    }
    return out;
}

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { cur += ch; }
        } else {
            if (ch === ',') { result.push(cur); cur = ''; }
            else if (ch === '"') { inQuotes = true; }
            else { cur += ch; }
        }
    }
    result.push(cur);
    return result;
}

function toNumber(v) { const n = Number(v); return isNaN(n) ? undefined : n; }

function restoreEntries(entries, mode = 'merge') {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['entries'], 'readwrite');
        const store = tx.objectStore('entries');

        if (mode === 'replace') {
            const clearReq = store.clear();
            clearReq.onerror = () => reject(clearReq.error);
        }

        entries.forEach(e => {
            const copy = { ...e };
            // Ensure required fields
            if (!copy.type) return;
            if (!copy.timestamp) copy.timestamp = Date.now();
            // Let IndexedDB autoincrement if id is missing or invalid
            if (copy.id === undefined || copy.id === null || isNaN(Number(copy.id))) {
                delete copy.id;
            }
            store.put(copy);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const isStudent = currentFilter === "student";
    const title = isStudent ? "Ilm-Sphere Academy: Student Report" : "Ilm-Sphere Academy: Teacher Report";
    const filename = isStudent ? "Student_Report.pdf" : "Teacher_Report.pdf";

    // Filter current entries based on search and type
    const query = searchInput.value.toLowerCase();
    const dataToExport = allEntries.filter(entry => {
        const matchesType = entry.type === currentFilter;
        const name = entry.name.toLowerCase();
        const subject = (entry.subject || "").toLowerCase();
        const classType = (entry.classType || "").toLowerCase();
        return matchesType && (name.includes(query) || subject.includes(query) || classType.includes(query));
    });

    if (dataToExport.length === 0) {
        alert("No data found to export.");
        return;
    }

    // Set Header
    doc.setFontSize(18);
    doc.setTextColor(10, 37, 64); // --primary-color
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const headers = isStudent 
        ? [["Name", "Class", "Time", "Guardian", "Fees", "Due Date"]]
        : [["Name", "Subject", "Qualification", "Contact", "Salary", "Join Date"]];

    const body = dataToExport.map(item => isStudent 
        ? [item.name, item.classType, item.classTime, item.guardianName, `${item.currency} ${item.fees}`, item.feesDueDate]
        : [item.name, item.subject, item.qualification, item.contact, `${item.currency} ${item.salary}`, item.joinDate]
    );

    doc.autoTable({
        startY: 35,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [10, 37, 64], textColor: [212, 175, 55] }, // Navy & Gold
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(filename);
}

// Enrollment Chart logic
function computeMonthlyEnrollment(entries, type = 'student') {
    // Group by YYYY-MM based on enrollDate/joinDate if available, else use timestamp month
    const buckets = new Map();
    entries.filter(e => e.type === type).forEach(e => {
        let d;
        const dateField = type === 'student' ? e.enrollDate : e.joinDate;
        if (dateField) {
            d = new Date(dateField);
        } else {
            d = new Date(e.timestamp);
        }
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        buckets.set(key, (buckets.get(key) || 0) + 1);
    });

    // Create last 12 months axis
    const now = new Date();
    const labels = [];
    const data = [];
    for (let i = 11; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        labels.push(dt.toLocaleString(undefined, { month: 'short', year: '2-digit' }));
        data.push(buckets.get(key) || 0);
    }
    return { labels, data };
}

// Quick contact helpers
function sanitizePhone(number) {
    if (!number) return '';
    // Keep leading + and digits only
    const trimmed = String(number).trim();
    const keepPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/[^\d]/g, '');
    return keepPlus ? ('+' + digits) : digits;
}

function buildFeeReminderMessage({ name, currency, amount, dueDate }) {
    const parts = [];
    parts.push(`Assalamu Alaikum${name ? ' ' + name : ''},`);
    if (amount || currency) {
        parts.push(`This is a friendly reminder that the monthly fee${amount ? ` of ${currency || ''} ${amount}` : ''} is due`);
    } else {
        parts.push('This is a friendly reminder that the monthly fee is due');
    }
    if (dueDate) parts.push(`by ${dueDate}.`); else parts.push('.');
    parts.push('\n\nPlease ignore if already paid. JazakAllah khair.');
    return parts.join(' ');
}

function openWhatsApp(number, message) {
    const num = sanitizePhone(number);
    if (!num) { alert('Invalid contact number.'); return; }
    const url = `https://wa.me/${encodeURIComponent(num)}?text=${encodeURIComponent(message || '')}`;
    window.open(url, '_blank');
}

function dialNumber(number) {
    const num = sanitizePhone(number);
    if (!num) { alert('Invalid contact number.'); return; }
    window.location.href = `tel:${num}`;
}

function openWhatsAppReminder(number, name, currency, amount, dueDate) {
    const msg = buildFeeReminderMessage({ name, currency, amount, dueDate });
    openWhatsApp(number, msg);
}

function updateEnrollmentChart() {
    const canvas = document.getElementById('enrollmentChart');
    if (!canvas || !window.Chart) return;

    // Ensure canvas container has a reasonable height in modal context
    canvas.parentElement.style.height = '320px';

    const { labels, data } = computeMonthlyEnrollment(allEntries, currentChartType);

    const label = currentChartType === 'student' ? 'New Students per Month' : 'New Teachers per Month';

    const cfg = {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: label,
                data,
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212,175,55,0.15)',
                tension: 0.3,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: '#0A2540',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() } },
                y: { beginAtZero: true, ticks: { precision: 0, color: getComputedStyle(document.body).getPropertyValue('--text-color').trim() } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    };

    if (enrollmentChartInstance) {
        enrollmentChartInstance.data.labels = labels;
        enrollmentChartInstance.data.datasets[0].data = data;
        enrollmentChartInstance.update();
    } else {
        enrollmentChartInstance = new Chart(canvas.getContext('2d'), cfg);
        // adjust height container since height attr fixed; ensure parent has height
        canvas.parentElement.style.height = '220px';
    }
}

// Global scope functions if needed
window.closeDetails = closeDetails;
window.deleteFromDB = deleteFromDB;
window.markAsPaid = markAsPaid;
