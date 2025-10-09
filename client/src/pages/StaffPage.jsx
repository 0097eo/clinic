import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import { AccessControl } from '../components/AccessControl';
import { getEmployees, registerEmployee } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'];

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  department: '',
  role: 'RECEPTIONIST',
  password: ''
};

export function StaffPage() {
  const { token } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadStaff = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getEmployees({}, token);
      if (Array.isArray(response?.data)) {
        setStaff(response.data);
      } else {
        setStaff(response || []);
      }
    } catch (err) {
      console.error('Failed to load staff', err);
      setError(err?.details?.message || err?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const columns = useMemo(
    () => [
      { header: 'Name', accessor: 'fullName' },
      { header: 'Role', accessor: 'role' },
      { header: 'Department', accessor: 'department', cell: (row) => row.department || '—' },
      { header: 'Email', accessor: 'email' },
      { header: 'Phone', accessor: 'phone', cell: (row) => row.phone || '—' }
    ],
    []
  );

  const openModal = () => {
    setFormError(null);
    setFormData(initialForm);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(initialForm);
    setFormError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await registerEmployee(
        {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          department: formData.department.trim() || undefined,
          role: formData.role,
          password: formData.password
        },
        token
      );
      closeModal();
      loadStaff();
    } catch (err) {
      console.error('Failed to add staff', err);
      setFormError(err?.details?.message || err?.message || 'Failed to add staff member');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Staff"
        subtitle="Employee Directory"
        action={
          <AccessControl roles={['ADMIN']}>
            <button type="button" className="action-primary" onClick={openModal}>
              Add staff member
            </button>
          </AccessControl>
        }
      />

      {error ? (
        <div className="panel panel--error">
          <h2 className="panel__title">{error}</h2>
        </div>
      ) : null}

      <div className="panel">
        <DataTable columns={columns} rows={staff} isLoading={loading} />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Add staff member"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" form="staff-form" className={MODAL_PRIMARY_BUTTON_CLASS} disabled={formLoading}>
              {formLoading ? 'Saving…' : 'Create account'}
            </button>
          </>
        }
      >
        {formError ? <p className="form-error">{formError}</p> : null}
        <form id="staff-form" className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              required
              value={formData.fullName}
              onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="+254700000000"
            />
          </label>
          <label>
            Department
            <input
              value={formData.department}
              onChange={(event) => setFormData((prev) => ({ ...prev, department: event.target.value }))}
              placeholder="Reception, Pharmacy, etc."
            />
          </label>
          <label>
            Role
            <select
              required
              value={formData.role}
              onChange={(event) => setFormData((prev) => ({ ...prev, role: event.target.value }))}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Temporary password
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Set a temporary password"
              autoComplete="new-password"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
