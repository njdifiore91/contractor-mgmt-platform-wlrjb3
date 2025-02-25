const requireAdmin = (req, res, next) => {
  next();
};

module.exports = { requireAdmin };
