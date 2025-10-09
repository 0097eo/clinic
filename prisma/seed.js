const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const PASSWORD = 'Clinic123!';

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.billingPayment.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.item.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.employee.deleteMany();
}

async function seedEmployees() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const employees = await prisma.employee.createMany({
    data: [
      {
        id: 'emp-admin',
        fullName: 'Amina Njoroge',
        role: 'ADMIN',
        department: 'Administration',
        phone: '+254700000001',
        email: 'admin@clinicmate.ke',
        password: passwordHash
      },
      {
        id: 'emp-doctor-1',
        fullName: 'Collins Onyango',
        role: 'DOCTOR',
        department: 'Internal Medicine',
        phone: '+254700000002',
        email: 'doctor@clinicmate.ke',
        password: passwordHash
      },
      {
        id: 'emp-pharma-1',
        fullName: 'Grace Wambui',
        role: 'PHARMACIST',
        department: 'Pharmacy',
        phone: '+254700000003',
        email: 'pharmacist@clinicmate.ke',
        password: passwordHash
      },
      {
        id: 'emp-accountant-1',
        fullName: 'Brian Mwangi',
        role: 'ACCOUNTANT',
        department: 'Finance',
        phone: '+254700000004',
        email: 'accountant@clinicmate.ke',
        password: passwordHash
      },
      {
        id: 'emp-reception-1',
        fullName: 'Jane Wairimu',
        role: 'RECEPTIONIST',
        department: 'Front Office',
        phone: '+254700000005',
        email: 'reception@clinicmate.ke',
        password: passwordHash
      }
    ]
  });

  return employees;
}

async function seedPatients() {
  const patients = await prisma.patient.createMany({
    data: [
      {
        id: 'pat-001',
        fullName: 'John Kamau',
        gender: 'Male',
        dateOfBirth: new Date('1985-05-12'),
        phone: '+254711111111',
        email: 'john.kamau@example.com',
        idNumber: '12345678',
        nhifNumber: 'NHIF001122',
        address: 'Nairobi, Kenya'
      },
      {
        id: 'pat-002',
        fullName: 'Mary Wanjiku',
        gender: 'Female',
        dateOfBirth: new Date('1992-09-23'),
        phone: '+254722222222',
        email: 'mary.wanjiku@example.com',
        idNumber: '87654321',
        nhifNumber: 'NHIF003344',
        address: 'Nakuru, Kenya'
      },
      {
        id: 'pat-003',
        fullName: 'Samuel Otieno',
        gender: 'Male',
        dateOfBirth: new Date('1978-02-02'),
        phone: '+254733333333',
        email: 'samuel.otieno@example.com',
        address: 'Kisumu, Kenya'
      }
    ]
  });

  return patients;
}

async function seedInventory() {
  const items = await prisma.item.createMany({
    data: [
      {
        id: 'item-001',
        name: 'Amoxicillin 500mg',
        category: 'Antibiotics',
        unit: 'Capsule',
        batchNumber: 'AMX-23-01',
        expiryDate: new Date(new Date().getFullYear(), 10, 15),
        stock: 120,
        reorderLevel: 40
      },
      {
        id: 'item-002',
        name: 'Paracetamol 500mg',
        category: 'Analgesic',
        unit: 'Tablet',
        batchNumber: 'PCM-24-02',
        expiryDate: new Date(new Date().getFullYear() + 1, 2, 28),
        stock: 600,
        reorderLevel: 150
      },
      {
        id: 'item-003',
        name: 'Insulin Glargine',
        category: 'Diabetes Care',
        unit: 'Vial',
        batchNumber: 'INS-24-05',
        expiryDate: new Date(new Date().getFullYear(), 7, 30),
        stock: 35,
        reorderLevel: 25
      }
    ]
  });

  return items;
}

async function seedAppointments() {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.createMany({
    data: [
      {
        id: 'appt-001',
        patientId: 'pat-001',
        doctorId: 'emp-doctor-1',
        department: 'Internal Medicine',
        date: today,
        time: '09:30',
        status: 'SCHEDULED',
        notes: 'Routine follow-up'
      },
      {
        id: 'appt-002',
        patientId: 'pat-002',
        doctorId: 'emp-doctor-1',
        department: 'Endocrinology',
        date: tomorrow,
        time: '11:00',
        status: 'CHECKED_IN',
        notes: 'Diabetes management review'
      },
      {
        id: 'appt-003',
        patientId: 'pat-003',
        doctorId: 'emp-doctor-1',
        department: 'General Practice',
        date: today,
        time: '14:00',
        status: 'COMPLETED',
        notes: 'Lab results discussion'
      }
    ]
  });

  return appointments;
}

async function seedBilling() {
  const billing = await prisma.billing.create({
    data: {
      id: 'bill-001',
      patientId: 'pat-003',
      appointmentId: 'appt-003',
      paymentMode: 'CASH',
      totalAmount: new Prisma.Decimal(4500),
      paidAmount: new Prisma.Decimal(4500),
      outstandingBalance: new Prisma.Decimal(0),
      status: 'PAID',
      payments: {
        create: [
          {
            amount: new Prisma.Decimal(4500),
            method: 'CASH',
            reference: 'RCPT-0001'
          }
        ]
      }
    },
    include: {
      payments: true
    }
  });

  await prisma.billing.create({
    data: {
      id: 'bill-002',
      patientId: 'pat-002',
      appointmentId: 'appt-002',
      paymentMode: 'MPESA',
      totalAmount: new Prisma.Decimal(3500),
      paidAmount: new Prisma.Decimal(1500),
      outstandingBalance: new Prisma.Decimal(2000),
      status: 'PARTIALLY_PAID'
    }
  });

  return billing;
}

async function seedPrescriptions() {
  const prescription = await prisma.prescription.create({
    data: {
      id: 'rx-001',
      patientId: 'pat-001',
      doctorId: 'emp-doctor-1',
      notes: 'Take medication after meals',
      items: {
        create: [
          {
            itemId: 'item-001',
            quantity: 14,
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '7 days',
            instructions: 'Complete the full course'
          },
          {
            itemId: 'item-002',
            quantity: 20,
            dosage: '500mg',
            frequency: 'Every 6 hours',
            duration: '5 days'
          }
        ]
      }
    },
    include: {
      items: true
    }
  });

  await prisma.prescription.create({
    data: {
      id: 'rx-002',
      patientId: 'pat-003',
      doctorId: 'emp-doctor-1',
      dispensed: true,
      dispensedAt: new Date(),
      dispensedBy: 'emp-pharma-1',
      notes: 'Blood pressure maintenance',
      items: {
        create: [
          {
            itemId: 'item-002',
            quantity: 30,
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '15 days'
          }
        ]
      }
    }
  });

  return prescription;
}

async function seedLabOrders() {
  const labOrders = await prisma.labOrder.createMany({
    data: [
      {
        id: 'lab-001',
        patientId: 'pat-002',
        orderedBy: 'emp-doctor-1',
        testType: 'HbA1c',
        notes: 'Quarterly diabetes monitoring',
        status: 'PENDING'
      },
      {
        id: 'lab-002',
        patientId: 'pat-003',
        orderedBy: 'emp-doctor-1',
        testType: 'Lipid Profile',
        notes: 'Post-treatment check',
        status: 'COMPLETED',
        result: 'LDL mildly elevated. Continue statin therapy.'
      }
    ]
  });

  return labOrders;
}

async function seedNotifications() {
  await prisma.notification.createMany({
    data: [
      {
        recipientId: 'emp-doctor-1',
        recipientType: 'EMPLOYEE',
        type: 'APPOINTMENT_CREATED',
        title: 'New appointment scheduled',
        message: 'John Kamau has been scheduled for Internal Medicine at 09:30.',
        channel: 'IN_APP',
        status: 'SENT'
      },
      {
        recipientId: 'pat-002',
        recipientType: 'PATIENT',
        type: 'APPOINTMENT_REMINDER',
        title: 'Appointment Reminder',
        message: 'Remember your appointment tomorrow at 11:00 with Dr. Collins Onyango.',
        channel: 'SMS',
        status: 'PENDING'
      }
    ]
  });
}

async function seedAuditLogs() {
  await prisma.auditLog.createMany({
    data: [
      {
        userId: 'emp-admin',
        userRole: 'ADMIN',
        action: 'CREATE',
        entityType: 'Employee',
        entityId: 'emp-admin',
        timestamp: new Date()
      },
      {
        userId: 'emp-doctor-1',
        userRole: 'DOCTOR',
        action: 'VIEW',
        entityType: 'Patient',
        entityId: 'pat-001',
        timestamp: new Date()
      }
    ]
  });
}

async function main() {
  console.log('Seeding database...');
  await resetDatabase();
  await seedEmployees();
  await seedPatients();
  await seedInventory();
  await seedAppointments();
  await seedBilling();
  await seedPrescriptions();
  await seedLabOrders();
  await seedNotifications();
  await seedAuditLogs();

  console.log('Seed data created successfully.');
  console.log('You can log in with admin@clinicmate.ke / Clinic123!');
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
