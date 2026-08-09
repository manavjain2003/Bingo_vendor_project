function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  if (err && err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate resource' });
  }
  res.status(500).json({ message: 'Something went wrong' });
}

module.exports = { notFoundHandler, errorHandler };