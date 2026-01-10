// Response Handler Middleware
// Provides standard response methods for all routes

const responseHandler = (req, res, next) => {
  // Success response
  res.success = (data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  // Error response
  res.error = (message = 'Error', statusCode = 500, data = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
    });
  };

  // Paginated response
  res.paginated = (data, total, limit, offset, message = 'Success') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit),
      },
    });
  };

  next();
};

module.exports = responseHandler;
