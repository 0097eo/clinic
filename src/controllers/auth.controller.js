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

  const existingEmployees = await prisma.employee.count();
  if (existingEmployees > 0 && (!req.user || req.user.role !== 'ADMIN')) {
    return res.status(403).json({ message: 'Only administrators can create new staff accounts' });
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

  await AuditService.log({
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

  await AuditService.log({
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
  await AuditService.log({
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

const getProfile = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.id }
  });

  if (!employee) {
    return res.status(404).json({ message: 'User account not found' });
  }

  return res.status(200).json({ data: sanitizeEmployee(employee) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.user.id }
  });

  if (!employee) {
    return res.status(404).json({ message: 'User account not found' });
  }

  const data = {};
  if (req.body.fullName !== undefined) {
    data.fullName = req.body.fullName.trim();
  }
  if (req.body.phone !== undefined) {
    data.phone = req.body.phone ? req.body.phone.trim() : null;
  }
  if (req.body.department !== undefined) {
    data.department = req.body.department ? req.body.department.trim() : null;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No updates supplied' });
  }

  const updated = await prisma.employee.update({
    where: { id: req.user.id },
    data
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Employee',
    entityId: req.user.id,
    changes: {
      old: sanitizeEmployee(employee),
      new: sanitizeEmployee(updated)
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(200).json({ data: sanitizeEmployee(updated) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const employee = await prisma.employee.findUnique({
    where: { id: req.user.id }
  });

  if (!employee) {
    return res.status(404).json({ message: 'User account not found' });
  }

  const valid = await comparePassword(currentPassword, employee.password);
  if (!valid) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.employee.update({
    where: { id: req.user.id },
    data: { password: passwordHash }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Employee',
    entityId: req.user.id,
    changes: {
      operation: 'CHANGE_PASSWORD'
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(200).json({ message: 'Password updated successfully' });
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
