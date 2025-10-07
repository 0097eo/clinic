const prisma = require('../utils/prisma');
const { verifyToken } = require('../utils/jwt');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const employee = await prisma.employee.findUnique({
      where: { id: payload.id }
    });

    if (!employee) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.user = {
      id: employee.id,
      role: employee.role,
      fullName: employee.fullName,
      email: employee.email
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You are not allowed to perform this action' });
    }

    return next();
  };

module.exports = {
  authenticate,
  authorize
};
