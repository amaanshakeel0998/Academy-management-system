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

let allEntries = [];

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
        Object.assign(entryData, {
            name: document.getElementById("teacherName").value,
            subject: document.getElementById("teacherSubject").value,
            qualification: document.getElementById("teacherQualification").value,
            contact: document.getElementById("teacherContact").value,
            currency: document.getElementById("teacherCurrency").value,
            salary: document.getElementById("teacherSalary").value,
            joinDate: document.getElementById("teacherJoinDate").value
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
    document.getElementById("totalStudents").innerText = totalStudents;
    document.getElementById("totalTeachers").innerText = totalTeachers;
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
        <span>Class Type / Subject</span>
        <span>Time / Salary</span>
    `;
    entriesContainer.appendChild(header);

    // Sort entries by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    entries.forEach(entry => {
        const div = document.createElement("div");
        div.className = "saved-item";
        div.onclick = () => showDetails(entry.id);
        
        if (entry.type === "student") {
            div.innerHTML = `
                <span style="font-weight: bold;">${entry.name}</span>
                <span>${entry.classType}</span>
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
            bodyHtml = `
                <div class="detail-item"><span class="detail-label">Full Name</span><span class="detail-value">${entry.name}</span></div>
                <div class="detail-item"><span class="detail-label">Class Type</span><span class="detail-value">${entry.classType}</span></div>
                <div class="detail-item"><span class="detail-label">Class Time</span><span class="detail-value">${entry.classTime}</span></div>
                <div class="detail-item"><span class="detail-label">Enrollment Date</span><span class="detail-value">${entry.enrollDate || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Fees Amount</span><span class="detail-value" style="color: #27ae60; font-weight: bold;">${entry.currency} ${entry.fees}</span></div>
                <div class="detail-item"><span class="detail-label">Fees Due Date</span><span class="detail-value" style="color: #e74c3c;">${entry.feesDueDate || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Guardian Name</span><span class="detail-value">${entry.guardianName || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Guardian Contact</span><span class="detail-value">${entry.guardianContact || "N/A"}</span></div>
            `;
        } else {
            bodyHtml = `
                <div class="detail-item"><span class="detail-label">Full Name</span><span class="detail-value">${entry.name}</span></div>
                <div class="detail-item"><span class="detail-label">Subject</span><span class="detail-value">${entry.subject}</span></div>
                <div class="detail-item"><span class="detail-label">Qualification</span><span class="detail-value">${entry.qualification || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Contact Number</span><span class="detail-value">${entry.contact || "N/A"}</span></div>
                <div class="detail-item"><span class="detail-label">Salary</span><span class="detail-value" style="color: #27ae60; font-weight: bold;">${entry.currency} ${entry.salary || "0"}</span></div>
                <div class="detail-item"><span class="detail-label">Joining Date</span><span class="detail-value">${entry.joinDate || "N/A"}</span></div>
            `;
        }
        
        detailsBody.innerHTML = bodyHtml;
        
        // Setup action buttons in details modal
        editBtnDetails.onclick = () => openForm(entry.type, entry);
        deleteBtnDetails.onclick = () => {
            showDeleteConfirm(entry.id);
        };
        
        openModal(detailsModal);
    };
}

// Global scope functions if needed
window.closeDetails = closeDetails;
window.deleteFromDB = deleteFromDB;
