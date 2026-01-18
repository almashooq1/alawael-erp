// Phase 112: Smart Document Management Logic

const API_BASE = '/api/documents-smart';
let templates = [];
let localDocs = []; // Simulating local state since we don't have a full DB listing endpoint yet in Phase 111

// Mock Data for Person Select
const peopleDB = {
  EMPLOYEE: [
    { id: 'EMP001', name: 'Ahmed Ali - Nurse' },
    { id: 'EMP002', name: 'Sarah Smith - PT' },
  ],
  STUDENT: [{ id: 'STU500', name: 'Omar Khalid - Intern' }],
  TRAINEE: [{ id: 'TRN900', name: 'Mona Zaki - OT Trainee' }],
};

async function init() {
  await fetchTemplates();
  renderTemplates();
}

// 1. Fetch Templates
async function fetchTemplates() {
  try {
    const res = await fetch(`${API_BASE}/templates`);
    const result = await res.json();
    if (result.success) {
      templates = result.data;
    }
  } catch (e) {
    console.error('Failed to load templates', e);
  }
}

// 2. Render Grid
function renderTemplates() {
  const grid = document.getElementById('template-grid');
  grid.innerHTML = templates
    .map(
      t => `
        <div class="tpl-card">
            <div class="tpl-title">${t.name}</div>
            <span class="tpl-type">${t.type}</span>
            <span class="tpl-type">${t.language}</span>
            <p style="font-size: 0.9em; color: #666; margin: 10px 0;">Official template with auto-fill.</p>
            <button class="btn" onclick="openGenModal('${t.id}', '${t.type}')">Create Letter</button>
        </div>
    `,
    )
    .join('');
}

// 3. Modal Logic
function openGenModal(tplId, type) {
  document.getElementById('selectedTemplateId').value = tplId;
  document.getElementById('targetType').value = type;

  const select = document.getElementById('personSelect');
  const options = peopleDB[type] || [];
  select.innerHTML = options.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');

  document.getElementById('genModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('genModal').style.display = 'none';
}

// 4. Generate Document
async function submitGeneration() {
  const tplId = document.getElementById('selectedTemplateId').value;
  const personId = document.getElementById('personSelect').value;

  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: tplId, personId: personId }),
    });
    const result = await res.json();

    if (result.success) {
      const doc = result.data;
      localDocs.push(doc); // Add to local list
      closeModal();
      alert(`Draft Created! Ref: ${doc.referenceNumber}`);
      renderRequests();
      showSection('requests');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (e) {
    alert('Req Failed: ' + e.message);
  }
}

// 5. Check and Sign Workflow
async function signDocument(docId) {
  if (!confirm('Are you sure you want to digitally sign this document? This is irreversible.')) return;

  try {
    // Step 1: Request Signature State (Simulated Step for UI flow)
    await fetch(`${API_BASE}/request-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, signerRole: 'MANAGER' }),
    });

    // Step 2: Actually Sign
    const res = await fetch(`${API_BASE}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, signerName: 'Admin User (Web)' }),
    });

    const result = await res.json();
    if (result.success) {
      // Update Local State
      const idx = localDocs.findIndex(d => d.id === docId);
      if (idx !== -1) localDocs[idx] = result.data;

      renderRequests();
      renderArchive(); // Move to archive view if sealed
      alert('Signed & Sealed Successfully!');
    }
  } catch (e) {
    alert('Sign Error: ' + e.message);
  }
}

// 6. Print/Download
function printDocument(docId) {
  window.open(`${API_BASE}/download/${docId}.pdf`, '_blank');
}

// UI Helpers
function renderRequests() {
  const active = localDocs.filter(d => d.status !== 'SEALED');
  const tbody = document.getElementById('requests-body');

  if (active.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No active pending documents</td></tr>';
    return;
  }

  tbody.innerHTML = active
    .map(
      d => `
        <tr>
            <td>${d.referenceNumber}</td>
            <td>${d.templateName}</td>
            <td>${d.personId}</td>
            <td><span class="status-draft">${d.status}</span></td>
            <td>
                <button class="btn" style="background: #27ae60; padding: 5px 10px;" onclick="signDocument('${d.id}')">Sign Now</button>
            </td>
        </tr>
    `,
    )
    .join('');
}

function renderArchive() {
  const sealed = localDocs.filter(d => d.status === 'SEALED');
  const tbody = document.getElementById('archive-body');

  if (sealed.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No sealed documents yet</td></tr>';
    return;
  }

  tbody.innerHTML = sealed
    .map(
      d => `
        <tr>
            <td>${d.referenceNumber}</td>
            <td>${d.templateName}</td>
            <td>${d.signedBy}</td>
            <td>${new Date(d.signedDate).toLocaleDateString()}</td>
            <td>
                <button class="btn" style="background: #34495e; padding: 5px 10px;" onclick="printDocument('${d.id}')">View PDF</button>
            </td>
        </tr>
    `,
    )
    .join('');
}

function showSection(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active'); // Simple toggle

  document.getElementById('sec-templates').style.display = 'none';
  document.getElementById('sec-requests').style.display = 'none';
  document.getElementById('sec-archive').style.display = 'none';

  document.getElementById('sec-' + id).style.display = 'block';

  if (id === 'requests') renderRequests();
  if (id === 'archive') renderArchive();
}

window.onload = init;
