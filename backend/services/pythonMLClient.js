/**
 * Python ML Service Client — عميل خدمة Python للذكاء الاصطناعي
 *
 * Node.js client to communicate with the separated Python ML microservice.
 * Used by the backend to delegate ML tasks to the Python service.
 *
 * @module services/pythonMLClient
 */

const logger = require('../utils/logger');

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:5001';
const TIMEOUT_MS = parseInt(process.env.PYTHON_ML_TIMEOUT, 10) || 30000;

/**
 * Generic HTTP request to Python ML service
 * @private
 */
async function _request(path, method = 'GET', body = null) {
  const url = `${PYTHON_ML_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    options.signal = controller.signal;

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Python ML service error (${response.status}): ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error(`[PythonML] Request timeout: ${path}`);
      throw new Error('Python ML service timeout');
    }
    logger.error(`[PythonML] Request failed: ${path} — ${error.message}`);
    throw error;
  }
}

/**
 * Check Python ML service health
 */
async function checkHealth() {
  try {
    return await _request('/health');
  } catch {
    return { status: 'unavailable', message: 'Python ML service is not reachable' };
  }
}

/**
 * Run ML prediction
 * @param {string} model - Model name
 * @param {Object} features - Input features
 */
async function predict(model, features) {
  return _request('/predict', 'POST', { model, features });
}

/**
 * Run data analysis
 * @param {string} type - Analysis type
 * @param {Array} data - Dataset
 */
async function analyze(type, data) {
  return _request('/analyze', 'POST', { type, data });
}

/**
 * Get AI recommendations
 * @param {string} context - Context type
 * @param {Object} data - Input data
 */
async function recommend(context, data) {
  return _request('/recommend', 'POST', { context, data });
}

/**
 * List available ML models
 */
async function listModels() {
  return _request('/models');
}

module.exports = {
  checkHealth,
  predict,
  analyze,
  recommend,
  listModels,
  PYTHON_ML_URL,
};
