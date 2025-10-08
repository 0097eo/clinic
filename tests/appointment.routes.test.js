const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const notificationService = require('../src/services/notification.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const authUser = {
  id: 'scheduler-1',
  role: 'RECEPTIONIST',
  fullName: 'Reception User',
  email: 'reception@clinic.com'
};

const authHeader = () => `Bearer ${signToken({ id: authUser.id, role: authUser.role })}`;

describe('Appointment routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(authUser);
    notificationService.createNotification.mockClear();
  });

  it('creates an appointment', async () => {
    const doctor = { id: 'doctor-1', role: 'DOCTOR', fullName: 'Dr. Smith' };
    const patient = { id: 'patient-10', fullName: 'Test Patient', phone: '+254700000003' };

    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(authUser) // authentication
      .mockResolvedValueOnce(doctor); // doctor lookup

    mockPrisma.patient.findUnique.mockResolvedValueOnce(patient);
    mockPrisma.appointment.findFirst.mockResolvedValueOnce(null);

    const createdAppointment = {
      id: 'appt-1',
      patientId: patient.id,
      doctorId: doctor.id,
      department: 'General',
      date: new Date('2025-01-20'),
      time: '10:00',
      notes: 'Routine check',
      patient,
      doctor
    };

    mockPrisma.appointment.create.mockResolvedValueOnce(createdAppointment);

    const response = await request(app, {
      method: 'POST',
      url: '/api/appointments',
      headers: {
        Authorization: authHeader()
      },
      body: {
        patientId: patient.id,
        doctorId: doctor.id,
        department: 'General',
        date: '2025-01-20',
        time: '10:00',
        notes: 'Routine check'
      }
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.appointment.create).toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Appointment',
        action: 'CREATE',
        entityId: createdAppointment.id
      })
    );
  });

  it('lists appointments', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const appointments = [
      { id: 'appt-1', patientId: 'patient-1' },
      { id: 'appt-2', patientId: 'patient-2' }
    ];

    mockPrisma.appointment.findMany.mockResolvedValueOnce(appointments);
    mockPrisma.appointment.count.mockResolvedValueOnce(appointments.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/appointments?page=1&pageSize=10',
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(appointments.length);
    expect(response.body.pagination.total).toBe(appointments.length);
  });

  it('retrieves a single appointment', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const appointment = {
      id: 'appt-3',
      patientId: 'patient-5',
      doctorId: 'doctor-2',
      date: new Date(),
      time: '09:00',
      patient: {},
      doctor: {},
      billing: {},
      prescriptions: []
    };

    mockPrisma.appointment.findUnique.mockResolvedValueOnce(appointment);

    const response = await request(app, {
      method: 'GET',
      url: `/api/appointments/${appointment.id}`,
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ id: appointment.id }));
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW',
        entityId: appointment.id
      })
    );
  });

  it('updates an appointment', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const existing = {
      id: 'appt-4',
      patientId: 'patient-8',
      doctorId: 'doctor-3',
      time: '11:00',
      date: new Date('2025-02-01'),
      notes: 'Old notes',
      patient: { fullName: 'Existing Patient' },
      doctor: { id: 'doctor-3', fullName: 'Dr. Existing' }
    };

    const updated = { ...existing, notes: 'Updated notes' };

    mockPrisma.appointment.findUnique.mockResolvedValueOnce(existing);
    mockPrisma.appointment.update.mockResolvedValueOnce(updated);

    const response = await request(app, {
      method: 'PUT',
      url: `/api/appointments/${existing.id}`,
      headers: {
        Authorization: authHeader()
      },
      body: { notes: updated.notes }
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: existing.id },
        data: expect.objectContaining({ notes: updated.notes })
      })
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: existing.id
      })
    );
  });

  it('updates appointment status to completed and auto-generates billing', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const appointment = {
      id: 'appt-5',
      patientId: 'patient-9',
      doctorId: 'doctor-4',
      status: 'SCHEDULED',
      notes: 'Follow up',
      date: new Date('2025-03-01'),
      time: '14:00',
      patient: { id: 'patient-9', fullName: 'Billing Patient', phone: '+254700000004' },
      doctor: { id: 'doctor-4', fullName: 'Dr. Completed' },
      billing: null
    };

    const updatedAppointment = { ...appointment, status: 'COMPLETED', billing: null };

    mockPrisma.appointment.findUnique.mockResolvedValueOnce(appointment);
    mockPrisma.appointment.update.mockResolvedValueOnce(updatedAppointment);
    mockPrisma.billing.create.mockResolvedValueOnce({
      id: 'billing-1',
      appointmentId: appointment.id,
      patientId: appointment.patientId
    });
    mockPrisma.employee.findMany.mockResolvedValueOnce([]); // accountants

    const response = await request(app, {
      method: 'PATCH',
      url: `/api/appointments/${appointment.id}/status`,
      headers: {
        Authorization: authHeader()
      },
      body: { status: 'COMPLETED' }
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.billing.create).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityId: appointment.id
      })
    );
  });

  it('deletes an appointment', async () => {
    mockPrisma.employee.findUnique.mockResolvedValueOnce(authUser);

    const appointment = {
      id: 'appt-6',
      patientId: 'patient-10',
      doctorId: 'doctor-5',
      date: new Date(),
      time: '16:00',
      patient: { id: 'patient-10', fullName: 'Delete Patient', phone: null },
      doctor: { id: 'doctor-5', fullName: 'Dr. Delete' }
    };

    mockPrisma.appointment.findUnique.mockResolvedValueOnce(appointment);
    mockPrisma.appointment.delete.mockResolvedValueOnce(undefined);

    const response = await request(app, {
      method: 'DELETE',
      url: `/api/appointments/${appointment.id}`,
      headers: {
        Authorization: authHeader()
      }
    });

    expect(response.status).toBe(204);
    expect(mockPrisma.appointment.delete).toHaveBeenCalledWith({ where: { id: appointment.id } });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entityId: appointment.id
      })
    );
  });
});
