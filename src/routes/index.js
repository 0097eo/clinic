const { Router } = require('express');

const authRoutes = require('./auth.routes');
const patientRoutes = require('./patient.routes');
const appointmentRoutes = require('./appointment.routes');
const billingRoutes = require('./billing.routes');
const inventoryRoutes = require('./inventory.routes');
const prescriptionRoutes = require('./prescription.routes');
const notificationRoutes = require('./notification.routes');
const labOrderRoutes = require('./labOrder.routes');
const auditRoutes = require('./audit.routes');
const employeeRoutes = require('./employee.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/billing', billingRoutes);
router.use('/items', inventoryRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/lab-orders', labOrderRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/employees', employeeRoutes);

module.exports = router;
