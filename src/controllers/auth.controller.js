const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');
const { EMPLOYEE_ROLES } = require('../utils/constants');

const sanitizeEmployee = (employee) => {
  const { password, ...rest } = employee;
  return rest;
};

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, department, phone } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: 'fullName, email, password, and role are required' });
  }

  if (!EMPLOYEE_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role supplied' });
  }

  const existing = await prisma.employee.findUnique({
    where: { email }
  });

  if (existing) {
    return res.status(409).json({ message: 'Employee with that email already exists' });
  }

  const passwordHash = await hashPassword(password);

  const employee = await prisma.employee.create({
    data: {
      fullName,
      email,
      password: passwordHash,
      role,
      department,
      phone
    }
  });

  AuditService.log({
    userId: employee.id,
    userRole: employee.role,
    action: 'CREATE',
    entityType: 'Employee',
    entityId: employee.id,
    changes: {
      new: sanitizeEmployee(employee)
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(201).json({ data: sanitizeEmployee(employee) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const employee = await prisma.employee.findUnique({
    where: { email }
  });

  if (!employee) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await comparePassword(password, employee.password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken({ id: employee.id, role: employee.role });

  AuditService.log({
    userId: employee.id,
    userRole: employee.role,
    action: 'LOGIN',
    entityType: 'Employee',
    entityId: employee.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(200).json({
    token,
    data: sanitizeEmployee(employee)
  });
});

const logout = asyncHandler(async (req, res) => {
  AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'LOGOUT',
    entityType: 'Employee',
    entityId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = {
  register,
  login,
  logout
};
