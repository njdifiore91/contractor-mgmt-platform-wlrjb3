const TEST_USERS = [
  'admin@test.com',
  'operations@test.com',
  'inspector@test.com',
  'customer.service@test.com',
];

const requireAuth = (req, res, next) => {
  const userEmail = req.headers['x-user-email'];
  if (process.env.NODE_ENV === 'development' || TEST_USERS.includes(userEmail)) {
    // Attach user info to request
    req.user = { email: userEmail };
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

module.exports = { requireAuth };
