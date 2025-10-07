const notFoundHandler = (req, res) => {
  res.status(404).json({ message: 'Not Found' });
};

// Centralized error handler to normalize error responses
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const details = err.details || undefined;

  res.status(status).json({
    message,
    ...(details ? { details } : {})
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
