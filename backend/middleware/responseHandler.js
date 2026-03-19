// Response Handler Middleware
// Provides standard response methods for all routes

const responseHandler = (req, res, next) => {
  // Success response
  res.success = (data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      requestId: req.id || undefined,
    });
  };

  // Created response (201)
  res.created = (data, message = 'Created successfully') => {
    return res.status(201).json({
      success: true,
      message,
      data,
      requestId: req.id || undefined,
    });
  };

  // Error response
  res.error = (message = 'Error', statusCode = 500, data = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
      requestId: req.id || undefined,
    });
  };

  // Validation error response (400)
  res.validationError = (errors, message = 'Validation failed') => {
    return res.status(400).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors],
      requestId: req.id || undefined,
    });
  };

  // Paginated response
  res.paginated = (data, total, limit, offset, message = 'Success') => {
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        pages: Math.ceil(total / parsedLimit),
        hasMore: parsedOffset + parsedLimit < total,
      },
      requestId: req.id || undefined,
    });
  };

  // No content response (204)
  res.noContent = () => {
    return res.status(204).end();
  };

  next();
};

module.exports = responseHandler;
