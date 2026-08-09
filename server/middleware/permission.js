function requirePermission(slug) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    if (req.user.isSuperAdmin) {
      return next();
    }

    if (req.user.permissions.includes(slug)) {
      return next();
    }

    const resource = slug.split('.')[0];
    if (req.user.permissions.includes(`${resource}.*`)) {
      return next();
    }

    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

module.exports = { requirePermission };