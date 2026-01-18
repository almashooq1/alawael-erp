// Phase 109: Smart Dashboard Logic

async function loadDigitalTwin() {
  const patientId = document.getElementById('patientIdInput').value;
  const loading = document.getElementById('loading');
  const content = document.getElementById('dashboard-content');
  const errorDiv = document.getElementById('error');

  // UI Reset
  loading.style.display = 'block';
  content.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    const response = await fetch(`/api/patient-integrator-smart/digital-twin/${patientId}`);
    const result = await response.json();

    if (!result.success && !result.data) {
      throw new Error(result.error || 'Failed to fetch data');
    }

    const data = result.data; // The Digital Twin Object

    // 1. Populate Header & Metadata
    document.getElementById('rec-text').innerText = data.recommendation;
    document.getElementById('p-id').innerText = data.patientId;
    document.getElementById('p-time').innerText = new Date(data.timestamp).toLocaleTimeString();

    // 2. Holistic Score Circle
    const score = data.integratedScore;
    const circle = document.getElementById('holistic-score-circle');
    circle.innerText = score;
    circle.style.background = `conic-gradient(#3498db ${score}%, #ecf0f1 ${score}% 100%)`;

    const statusBadge = document.getElementById('holistic-status');
    statusBadge.innerText = data.holisticStatus;
    statusBadge.className = `status-badge ${getStatusColor(data.holisticStatus)}`;

    // 3. Layer - Physical
    document.getElementById('val-hr').innerHTML = `${data.layers.physical.data.liveHeartRate || '--'} <span class="metric-unit">bpm</span>`;
    document.getElementById('val-spo2').innerHTML = `${data.layers.physical.data.liveSpO2 || '--'} <span class="metric-unit">%</span>`;

    // 4. Layer - Mental
    document.getElementById('val-psych-score').innerHTML = `${data.layers.mental.score} <span class="metric-unit">/100</span>`;
    document.getElementById('val-psych-source').innerText = data.layers.mental.source;

    // 5. Layer - Future
    const prob = (data.layers.future_outlook.recoveryProbability * 100).toFixed(1);
    document.getElementById('val-recovery').innerHTML = `${prob} <span class="metric-unit">%</span>`;

    // 6. Layer - Metabolic
    document.getElementById('val-water').innerHTML = `${data.layers.metabolic.targetHydration} <span class="metric-unit">ml</span>`;

    // Show Content
    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    errorDiv.innerText = `Error: ${err.message}`;
    errorDiv.style.display = 'block';
  }
}

function getStatusColor(status) {
  if (status === 'BALANCED') return 'status-green';
  if (status === 'CRITICAL') return 'status-red';
  return 'status-yellow';
}

// Auto-load on open
window.onload = loadDigitalTwin;
