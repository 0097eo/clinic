import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getEmployees,
  getPatients,
  updateAppointmentStatus
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'];

export function AppointmentsPage() {
  const { token, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({ status: '', page: 1, pageSize: 20 });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ patientId: '', doctorId: '', department: '', date: '', time: '', notes: '' });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [patientOptions, setPatientOptions] = useState([]);
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const canManageAppointments = ['ADMIN', 'RECEPTIONIST'].includes(user?.role);
  const canUpdateStatus = ['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user?.role);
  const canDelete = ['ADMIN', 'RECEPTIONIST'].includes(user?.role);

  const fetchAppointments = useCallback(async (query = {}) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: query.page ?? filters.page,
        pageSize: filters.pageSize,
        status: query.status ?? filters.status
      };
      const response = await getAppointments(params, token);
      const rows =
        response?.data?.map((item) => ({
          id: item.id,
          date: item.date,
          time: item.time,
          patientName: item.patient?.fullName ?? 'Unknown',
          doctorName: item.doctor?.fullName ?? 'Triage',
          department: item.department ?? 'General',
          status: item.status
        })) ?? [];
      setAppointments(rows);
      if (response?.pagination) {
        setPagination(response.pagination);
      } else {
        setPagination((prev) => ({ ...prev, total: rows.length }));
      }
      setFilters((prev) => ({ ...prev, ...params }));
    } catch (err) {
      console.error('Failed to load appointments', err);
      setError(err?.details?.message || err?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.pageSize, filters.status, token]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, token]);

  useEffect(() => {
    if (!token) return;
    getPatients({ pageSize: 100 }, token)
      .then((response) => {
        if (Array.isArray(response?.data)) {
          setPatientOptions(response.data);
        }
      })
      .catch((err) => console.error('Failed to load patient options', err));

    getEmployees({ role: 'DOCTOR' }, token)
      .then((response) => {
        if (Array.isArray(response?.data)) {
          setDoctorOptions(response.data);
          setFormData((prev) => ({ ...prev, doctorId: prev.doctorId || response.data[0]?.id || '' }));
        }
      })
      .catch((err) => console.error('Failed to load doctors', err));
  }, [token]);

  const handleStatusUpdate = useCallback(async (id, status) => {
    try {
      await updateAppointmentStatus(id, { status }, token);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }, [fetchAppointments, token]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await deleteAppointment(id, token);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
    }
  }, [fetchAppointments, token]);

  const openCreateModal = useCallback(() => {
    setFormError(null);
    setFormData({
      patientId: patientOptions[0]?.id || '',
      doctorId: doctorOptions[0]?.id || '',
      department: '',
      date: '',
      time: '',
      notes: ''
    });
    setScheduleModalOpen(true);
  }, [doctorOptions, patientOptions]);

  const handleCreateAppointment = async (event) => {
    event.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await createAppointment(formData, token);
      setFormData({ patientId: '', doctorId: '', department: '', date: '', time: '', notes: '' });
      fetchAppointments({ page: 1 });
      setScheduleModalOpen(false);
    } catch (err) {
      console.error('Failed to create appointment', err);
      setFormError(err?.details?.message || err?.message || 'Failed to create appointment');
    } finally {
      setFormLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || appointments.length || 1) / pagination.pageSize));

  const columns = useMemo(() => {
    const base = [
      {
        header: 'Date',
        accessor: 'date',
        cell: (row) => (row.date ? new Date(row.date).toLocaleDateString() : '—')
      },
      { header: 'Time', accessor: 'time' },
      { header: 'Patient', accessor: 'patientName' },
      { header: 'Doctor', accessor: 'doctorName' },
      { header: 'Department', accessor: 'department' },
      { header: 'Status', accessor: 'status' }
    ];

    if (canUpdateStatus || canDelete) {
      base.push({
        header: 'Actions',
        accessor: 'actions',
        cell: (row) => (
          <div className="table-actions">
            {canUpdateStatus ? (
              <select value={row.status} onChange={(event) => handleStatusUpdate(row.id, event.target.value)}>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="CHECKED_IN">CHECKED_IN</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            ) : null}
            {canDelete ? (
              <button type="button" className="table-action" onClick={() => handleDelete(row.id)}>
                Cancel
              </button>
            ) : null}
          </div>
        )
      });
    }

    return base;
  }, [canDelete, canUpdateStatus, handleDelete, handleStatusUpdate]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Appointments"
        subtitle="Schedule Overview"
        action={
          <div className="page-actions">
            <div className="page-filters">
              <label>
                Status
                <select
                  value={filters.status}
                  onChange={(event) => fetchAppointments({ status: event.target.value, page: 1 })}
                >
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <AccessControl roles={['ADMIN', 'RECEPTIONIST']}>
              <button type="button" className="action-primary" onClick={openCreateModal}>
                Schedule appointment
              </button>
            </AccessControl>
          </div>
        }
      />

      {error ? (
        <div className="panel panel--error">
          <h2 className="panel__title">{error}</h2>
        </div>
      ) : null}

      <div className="panel">
        <DataTable columns={columns} rows={appointments} isLoading={loading} />

        <div className="pagination">
          <button type="button" onClick={() => fetchAppointments({ page: Math.max(1, filters.page - 1) })} disabled={filters.page === 1 || loading}>
            Previous
          </button>
          <span>
            Page {filters.page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => fetchAppointments({ page: filters.page + 1 })}
            disabled={filters.page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>

      <Modal
        open={scheduleModalOpen && canManageAppointments}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule appointment"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={MODAL_PRIMARY_BUTTON_CLASS} form="appointment-form" disabled={formLoading}>
              {formLoading ? 'Scheduling…' : 'Create appointment'}
            </button>
          </>
        }
      >
        {formError ? <p className="form-error">{formError}</p> : null}
        <form id="appointment-form" className="form-grid" onSubmit={handleCreateAppointment}>
          <label>
            Patient
            <select
              required
              value={formData.patientId}
              onChange={(event) => setFormData((prev) => ({ ...prev, patientId: event.target.value }))}
            >
              <option value="">Select patient</option>
              {patientOptions.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Doctor
            <select
              required
              value={formData.doctorId}
              onChange={(event) => setFormData((prev) => ({ ...prev, doctorId: event.target.value }))}
            >
              <option value="">Select doctor</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Department
            <input
              required
              value={formData.department}
              onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              required
              value={formData.date}
              onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
            />
          </label>
          <label>
            Time
            <input
              type="time"
              required
              value={formData.time}
              onChange={(event) => setFormData((prev) => ({ ...prev, time: event.target.value }))}
            />
          </label>
          <label className="form-grid__full">
            Notes
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
