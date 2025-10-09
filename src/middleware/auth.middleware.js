const prisma = require('../utils/prisma');
const { verifyToken } = require('../utils/jwt');

const attachUserFromToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  const employee = await prisma.employee.findUnique({
    where: { id: payload.id }
  });

  if (!employee) {
    throw new Error('INVALID_USER');
  }

  const user = {
    id: employee.id,
    role: employee.role,
    fullName: employee.fullName,
    email: employee.email
  };

  req.user = user;
  return user;
};

const authenticate = async (req, res, next) => {
  try {
    const user = await attachUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    await attachUserFromToken(req);
  } catch (error) {
    if (error.message === 'INVALID_USER') {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    return res.status(401).json({ message: 'Invalid authentication token' });
  }
  return next();
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
  optionalAuthenticate,
  authorize
};
