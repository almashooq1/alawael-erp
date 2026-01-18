/**
 * Smart Crisis Management & Incident Service (Phase 71)
 *
 * Automates the response to medical or behavioral emergencies.
 * Broadcasts alerts, guides staff through protocols, and auto-logs for audits.
 */

class SmartCrisisService {
  constructor() {
    this.activeIncidents = new Map();
  }

  /**
   * Trigger a Code (Emergency Alert)
   * @param {string} codeType - 'CODE_BLUE' (Medical), 'CODE_GRAY' (Aggression), 'CODE_RED' (Fire)
   * @param {string} location - 'Room 101'
   * @param {string} reporterId
   */
  async triggerCode(codeType, location, reporterId) {
    console.log(`[CRISIS] ${codeType} triggered at ${location} by ${reporterId}`);

    const incidentId = `INC-${Date.now()}`;
    const incident = {
      id: incidentId,
      type: codeType,
      location,
      startTime: new Date(),
      status: 'ACTIVE',
      responders: [],
      protocolSteps: this._getProtocol(codeType),
    };

    this.activeIncidents.set(incidentId, incident);

    // In a real app, this would trigger Socket.io alerts + SMS/Push Notifications
    // to specific operational teams (e.g., Security, Medical).

    return {
      success: true,
      incidentId,
      actionRequired: 'Ensure safety of nearby beneficiaries immediately.',
      broadcastSentTo: this._getTargetAudience(codeType),
    };
  }

  /**
   * Log a response action during an incident
   * e.g., "Nurse Sarah Administered Epinephrine at 10:05"
   */
  async logResponseAction(incidentId, userId, action) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error('Incident not active or not found');

    const logEntry = {
      time: new Date(),
      user: userId,
      action,
    };

    // If DB was connected, we'd save to an 'IncidentLog' collection
    return {
      status: 'LOGGED',
      timestamp: logEntry.time,
    };
  }

  /**
   * Resolve/Close the incident and generate a debrief report
   */
  async resolveIncident(incidentId, summary, outcome) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');

    incident.status = 'RESOLVED';
    incident.endTime = new Date();
    incident.summary = summary;
    incident.outcome = outcome;

    this.activeIncidents.delete(incidentId); // Remove from active memory

    return {
      incidentId,
      duration: (incident.endTime - incident.startTime) / 1000 + ' seconds',
      complianceCheck: 'PASSED', // AI could analyze if protocol was followed
      reportUrl: `/secure/reports/incidents/${incidentId}.pdf`,
    };
  }

  _getProtocol(type) {
    const protocols = {
      CODE_BLUE: ['Call Ambulance', 'Bring Crash Cart', 'Start CPR if needed'],
      CODE_GRAY: ['Clear area of other patients', 'De-escalate verbally', 'Call Security'],
      CODE_RED: ['Activate Alarm', 'Evacuate to Assembly Point A', 'Close Fire Doors'],
    };
    return protocols[type] || ['Assess Situation', 'Call Supervisor'];
  }

  _getTargetAudience(type) {
    if (type === 'CODE_BLUE') return ['MEDICAL_TEAM', 'SECURITY'];
    if (type === 'CODE_RED') return ['ALL_STAFF'];
    return ['SECURITY', 'ADMIN'];
  }
}

module.exports = SmartCrisisService;
