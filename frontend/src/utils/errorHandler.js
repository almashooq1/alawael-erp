/**
 * API Error Handling Utilities
 */

export class APIError extends Error {
  constructor(status, data, message) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Parse API error response
export const parseErrorResponse = (error) => {
  if (!error) {
    return {
      status: 500,
      message: 'An unknown error occurred',
      details: null,
    };
  }

  // Axios error
  if (error.response) {
    const { status, data } = error.response;
    return {
      status,
      message: data.message || error.message || 'An error occurred',
      details: data.details || data.error || null,
      errors: data.errors || null,
    };
  }

  // Network error
  if (error.request) {
    return {
      status: 0,
      message: 'Network error. Please check your connection.',
      details: error.message,
    };
  }

  // Other errors
  return {
    status: 500,
    message: error.message || 'An error occurred',
    details: null,
  };
};

// Get user-friendly error message
export const getErrorMessage = (error) => {
  const parsed = parseErrorResponse(error);

  const errorMessages = {
    400: 'Invalid request. Please check your input.',
    401: 'Session expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing data.',
    422: 'Validation error. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Server error. Please try again later.',
    503: 'Service unavailable. Please try again later.',
    0: 'Network error. Please check your connection.',
  };

  return errorMessages[parsed.status] || parsed.message || 'An error occurred';
};

// Check specific error type
export const isAuthError = (error) => {
  const parsed = parseErrorResponse(error);
  return parsed.status === 401 || parsed.status === 403;
};

export const isValidationError = (error) => {
  const parsed = parseErrorResponse(error);
  return parsed.status === 422 || (parsed.errors && Object.keys(parsed.errors).length > 0);
};

export const isNetworkError = (error) => {
  const parsed = parseErrorResponse(error);
  return parsed.status === 0 || error.request && !error.response;
};

export const isServerError = (error) => {
  const parsed = parseErrorResponse(error);
  return parsed.status >= 500;
};

// Format validation errors for display
export const formatValidationErrors = (error) => {
  const parsed = parseErrorResponse(error);
  const errors = {};

  if (parsed.errors) {
    Object.keys(parsed.errors).forEach((field) => {
      errors[field] = Array.isArray(parsed.errors[field])
        ? parsed.errors[field][0]
        : parsed.errors[field];
    });
  }

  return errors;
};

// Retry logic
export const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !isNetworkError(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
};

// Log error for debugging
export const logError = (error, context = '') => {
  const parsed = parseErrorResponse(error);
  
  if (process.env.REACT_APP_DEBUG) {
    console.group(`❌ API Error${context ? ` - ${context}` : ''}`);
    console.error('Status:', parsed.status);
    console.error('Message:', parsed.message);
    console.error('Details:', parsed.details);
    if (parsed.errors) console.error('Validation Errors:', parsed.errors);
    console.groupEnd();
  }

  // In production, send to error tracking service
  if (process.env.REACT_APP_ENVIRONMENT === 'production') {
    // Example: Sentry.captureException(error);
  }
};

export default {
  APIError,
  parseErrorResponse,
  getErrorMessage,
  isAuthError,
  isValidationError,
  isNetworkError,
  isServerError,
  formatValidationErrors,
  retryRequest,
  logError,
};
