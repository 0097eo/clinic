const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');

const createPatient = asyncHandler(async (req, res) => {
  const {
    fullName,
    gender,
    dateOfBirth,
    phone,
    email,
    idNumber,
    nhifNumber,
    address,
    emergencyContact,
    medicalHistory
  } = req.body;

  const patient = await prisma.patient.create({
    data: {
      fullName,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      phone,
      email,
      idNumber,
      nhifNumber,
      address,
      emergencyContact,
      medicalHistory
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Patient',
    entityId: patient.id,
    changes: { new: patient },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ data: patient });
});

const listPatients = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    }),
    prisma.patient.count()
  ]);

  res.json({
    data,
    pagination: {
      page,
      pageSize,
      total
    }
  });
});

const getPatient = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id }
  });

  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'VIEW',
    entityType: 'Patient',
    entityId: patient.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.json({ data: patient });
});

const updatePatient = asyncHandler(async (req, res) => {
  const existing = await prisma.patient.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  const patient = await prisma.patient.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : existing.dateOfBirth
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Patient',
    entityId: patient.id,
    changes: {
      old: existing,
      new: patient
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.json({ data: patient });
});

const searchPatients = asyncHandler(async (req, res) => {
  const { q } = req.query;

  const conditions = [
    { fullName: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q, mode: 'insensitive' } }
  ];

  conditions.push({ email: { contains: q, mode: 'insensitive' } });

  const data = await prisma.patient.findMany({
    where: {
      OR: conditions
    },
    take: 20
  });

  res.json({ data });
});

module.exports = {
  createPatient,
  listPatients,
  getPatient,
  updatePatient,
  searchPatients
};
