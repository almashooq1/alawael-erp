/**
 * Phase 30: Quantum-Ready Computing Service
 * Post-Quantum Cryptography, QKD, Quantum Simulation, Quantum Safety
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/phases-29-33';

const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Phase 30 API Error on ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Phase 30: Quantum-Ready Computing APIs
 */
export const phase30Quantum = {
  // Post-Quantum Cryptography
  crypto: {
    /**
     * Generate quantum-safe keypair
     * @param {string} algorithm - Algorithm (kyber, dilithium, sphincs+)
     */
    generateKeypair: async algorithm => {
      return fetchAPI('/quantum/crypto/keypair', {
        method: 'POST',
        body: JSON.stringify({ algorithm }),
      });
    },

    /**
     * Encrypt data with quantum-safe algorithm
     * @param {string} keyPairId - Keypair ID
     * @param {string} data - Data to encrypt
     */
    encrypt: async (keyPairId, data) => {
      return fetchAPI('/quantum/crypto/encrypt', {
        method: 'POST',
        body: JSON.stringify({ keyPairId, data }),
      });
    },

    /**
     * Decrypt data
     * @param {string} keyPairId - Keypair ID
     * @param {string} encryptedData - Encrypted data
     */
    decrypt: async (keyPairId, encryptedData) => {
      return fetchAPI('/quantum/crypto/decrypt', {
        method: 'POST',
        body: JSON.stringify({ keyPairId, encryptedData }),
      });
    },

    /**
     * List available crypto algorithms
     */
    listAlgorithms: async () => {
      return fetchAPI('/quantum/crypto/algorithms');
    },
  },

  // Quantum Key Distribution
  qkd: {
    /**
     * Create QKD session
     * @param {string} participantA - Participant A ID
     * @param {string} participantB - Participant B ID
     */
    createSession: async (participantA, participantB) => {
      return fetchAPI('/quantum/qkd/session', {
        method: 'POST',
        body: JSON.stringify({ participantA, participantB }),
      });
    },

    /**
     * List QKD sessions
     */
    listSessions: async () => {
      return fetchAPI('/quantum/qkd/sessions');
    },

    /**
     * Get QKD session status
     * @param {string} sessionId - Session ID
     */
    getSessionStatus: async sessionId => {
      return fetchAPI(`/quantum/qkd/sessions/${sessionId}`);
    },
  },

  // Quantum Simulation
  simulation: {
    /**
     * Run quantum simulation
     * @param {object} config - Simulation configuration
     */
    run: async config => {
      return fetchAPI('/quantum/simulation/run', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * Get simulation status
     */
    getStatus: async () => {
      return fetchAPI('/quantum/simulation/status');
    },

    /**
     * Get simulation results
     * @param {string} simulationId - Simulation ID
     */
    getResults: async simulationId => {
      return fetchAPI(`/quantum/simulation/${simulationId}/results`);
    },
  },

  // Quantum-Safe Transition
  transition: {
    /**
     * Assess quantum readiness
     * @param {object} data - Assessment data
     */
    assessReadiness: async data => {
      return fetchAPI('/quantum/transition/assess', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get transition plan
     * @param {string} assessmentId - Assessment ID
     */
    getTransitionPlan: async assessmentId => {
      return fetchAPI(`/quantum/transition/plan/${assessmentId}`);
    },
  },

  // Quantum Vulnerability Scanner
  scanner: {
    /**
     * Scan for quantum vulnerabilities
     * @param {object} config - Scan configuration
     */
    scan: async config => {
      return fetchAPI('/quantum/vulnerability/scan', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    /**
     * Get scan results
     * @param {string} scanId - Scan ID
     */
    getScanResults: async scanId => {
      return fetchAPI(`/quantum/vulnerability/scan/${scanId}/results`);
    },
  },

  // System Health
  health: {
    /**
     * Get Phase 30 health status
     */
    getStatus: async () => {
      return fetchAPI('/health');
    },
  },
};

export default phase30Quantum;
