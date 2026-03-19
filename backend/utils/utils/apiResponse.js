class ApiResponse {
  constructor(statusCode = 200, data = {}, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

class ApiError extends Error {
  constructor(statusCode = 500, message = 'Something went wrong', errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

module.exports = { ApiResponse, ApiError };
