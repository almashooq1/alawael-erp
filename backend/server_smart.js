const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Phase 109: Static Frontend for Dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../frontend_smart')));

// Mock Middleware
const mockAuth = (req, res, next) => {
  req.user = { id: 'mock_admin', role: 'ADMIN' };
  next();
};

const mockRequireRole = roles => (req, res, next) => next();

// Mock Auth Middleware File (since routes require it)
// We can't easily mock the require inside routes unless we use a tool like proxyquire.
// BUT, since we already edited the middleware file to be safe, we can reuse it OR
// we can assume the routes work if we just mount them.
// The routes import `../middleware/auth.middleware`.
// That file imports `../models/User`.
// This might trigger the whole chain again.

// BETTER STRATEGY:
// Create new route files that don't depend on complex middleware, OR
// rely on the `server_smart` to mock the environment such that `require` works?
// No, Node.js `require` is hard to mock globally without internal modules.

// However, I verified `auth.middleware.js` loads now.
// The issue was `server.js` loading 100 other routes that fail.

// --- MOCK AUTHENTICATION FOR TESTING ---
const authenticateToken = (req, res, next) => {
  req.user = { id: 'mock_user_99', role: 'ADMIN' };
  next();
};
const requireRole = roles => (req, res, next) => next();

// const { authenticateToken, requireRole } = require('./middleware/auth.middleware');

// --- Routes ---
app.use('/api/wearable-smart', require('./routes/wearable_smart.routes'));
app.use('/api/voice-assistant-smart', require('./routes/voice_assistant_smart.routes'));

// Phase 99
app.use('/api/global-expert-smart', require('./routes/global_expert_smart.routes'));
app.use('/api/robotics-smart', require('./routes/robotics_smart.routes'));

// Phase 100
app.use('/api/cognitive-smart', require('./routes/cognitive_smart.routes'));

// Phase 101: Smart Clinical Command Center
app.use('/api/command-center-smart', require('./routes/smart_clinical_command.routes'));

// Phase 102: Predictive AI
app.use('/api/predictive-ai-smart', require('./routes/smart_predictive_ai.routes'));

// Phase 103: Smart Auto-Prescription
app.use('/api/auto-prescription-smart', require('./routes/smart_auto_prescription.routes'));

// Phase 104: Smart VR Integration
app.use('/api/vr-smart', require('./routes/smart_vr.routes'));

// Phase 105: Smart Psychotherapy Unit
app.use('/api/psychotherapy-smart', require('./routes/smart_psychotherapy.routes'));

// Phase 106: Smart Family Holo-Port
app.use('/api/holo-port-smart', require('./routes/smart_family_holo_port.routes'));

// Phase 107: Smart Metabolic & Nutrition Unit
app.use('/api/nutrition-smart', require('./routes/smart_nutrition.routes'));

// Phase 108: Smart Patient Integrator (Digital Twin)
app.use('/api/patient-integrator-smart', require('./routes/smart_patient_integrator.routes'));

// Phase 110: Smart Device Gateway
app.use('/api/gateway-smart', require('./routes/smart_device_gateway.routes'));

// Phase 111: Smart Document Generation & e-Signature
app.use('/api/documents-smart', require('./routes/smart_document.routes'));

// Phase 114: Smart Transport & Logistics Unit
app.use('/api/transport-smart', require('./routes/smart_transport.routes'));

// Phase 115: Smart CRM & Engagement
app.use('/api/crm-smart', require('./routes/smart_crm.routes'));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Smart Server running on port ${PORT}`);
});

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Keep alive for debug
});
process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION:', reason);
});
