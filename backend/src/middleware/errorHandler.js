export function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxMb = process.env.MAX_FILE_SIZE_MB || '100';
    return res.status(400).json({
      success: false,
      message: `File size exceeds the allowable limit of ${maxMb}MB.`
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    errors: err.errors || undefined
  });
}

