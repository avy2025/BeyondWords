const errorMiddleware = (err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
};

export default errorMiddleware;
