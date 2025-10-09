import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import { createPatient, getPatients, updatePatient } from '../services/api';
import { useAuth } from '../context/AuthContext';

const initialPatientForm = {
  fullName: '',
  gender: '',
  dateOfBirth: '',
  phone: '',
  email: '',
  idNumber: '',
  nhifNumber: '',
  address: ''
};

export function PatientsPage() {
  const { token, user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialPatientForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const canManagePatients = ['ADMIN', 'RECEPTIONIST'].includes(user?.role);

  const fetchPatients = useCallback(
    async (query = {}) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getPatients(
          {
            page: query.page ?? pagination.page,
            pageSize: pagination.pageSize,
            search: query.search ?? search
          },
          token
        );

        if (Array.isArray(response?.data)) {
          setPatients(response.data);
          if (response.pagination) {
            setPagination((prev) => ({ ...prev, ...response.pagination }));
          } else {
            setPagination((prev) => ({ ...prev, total: response.data.length }));
          }
        } else {
          setPatients(response ?? []);
          setPagination((prev) => ({ ...prev, total: response?.length ?? 0 }));
        }
      } catch (err) {
        console.error('Failed to load patients', err);
        setError(err?.details?.message || err?.message || 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    },
    [token, pagination.page, pagination.pageSize, search]
  );

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setFormData(initialPatientForm);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row) => {
    setEditingId(row.id);
    setFormError(null);
    setFormData({
      fullName: row.fullName || '',
      gender: row.gender || '',
      dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().slice(0, 10) : '',
      phone: row.phone || '',
      email: row.email || '',
      idNumber: row.idNumber || '',
      nhifNumber: row.nhifNumber || '',
      address: row.address || ''
    });
    setModalOpen(true);
  }, []);

  const columns = useMemo(() => {
    const base = [
      { header: 'Name', accessor: 'fullName' },
      { header: 'Phone', accessor: 'phone' },
      {
        header: 'Age',
        accessor: 'dateOfBirth',
        cell: (row) => {
          if (!row.dateOfBirth) return '—';
          const ageMs = Date.now() - new Date(row.dateOfBirth).getTime();
          const age = Math.abs(new Date(ageMs).getUTCFullYear() - 1970);
          return `${age} yrs`;
        }
      },
      { header: 'Gender', accessor: 'gender' },
      { header: 'NHIF', accessor: 'nhifNumber' }
    ];

    if (canManagePatients) {
      base.push({
        header: 'Actions',
        accessor: 'actions',
        cell: (row) => (
          <button type="button" className="table-action" onClick={() => openEditModal(row)}>
            Edit
          </button>
        )
      });
    }

    return base;
  }, [canManagePatients, openEditModal]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData(initialPatientForm);
    setFormError(null);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null
      };
      if (editingId) {
        await updatePatient(editingId, payload, token);
      } else {
        await createPatient(payload, token);
      }
      closeModal();
      fetchPatients({ page: editingId ? pagination.page : 1 });
    } catch (err) {
      console.error('Failed to save patient', err);
      setFormError(err?.details?.message || err?.message || 'Failed to save patient');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    fetchPatients({ page: 1, search });
  };

  const handlePageChange = (direction) => {
    const nextPage = Math.max(1, pagination.page + direction);
    if (nextPage === pagination.page) return;
    fetchPatients({ page: nextPage });
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Patients"
        subtitle="Population Registry"
        action={
          <div className="page-actions">
            <form className="page-search" onSubmit={handleSearch}>
              <input
                type="search"
                placeholder="Search by name or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            <AccessControl roles={['ADMIN', 'RECEPTIONIST']}>
              <button type="button" className="action-primary" onClick={openCreateModal}>
                New patient
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
        <DataTable columns={columns} rows={patients} isLoading={loading} />

        <div className="pagination">
          <button type="button" onClick={() => handlePageChange(-1)} disabled={pagination.page === 1 || loading}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {Math.max(1, Math.ceil((pagination.total || patients.length || 1) / pagination.pageSize))}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            disabled={pagination.page * pagination.pageSize >= (pagination.total || patients.length) || loading}
          >
            Next
          </button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Update patient' : 'Register patient'}
        footer={
          canManagePatients ? (
            <>
              <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={closeModal}>
                Cancel
              </button>
              <button 
                type="submit" 
                form="patient-form" 
                disabled={formLoading}
                className={MODAL_PRIMARY_BUTTON_CLASS}
              >
                {formLoading ? 'Saving…' : editingId ? 'Update patient' : 'Create patient'}
              </button>
            </>
          ) : null
        }
      >
        {formError ? <p className="form-error">{formError}</p> : null}
        <form id="patient-form" className="form-grid" onSubmit={handleFormSubmit}>
          <label>
            Full name
            <input
              required
              value={formData.fullName}
              onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
          <label>
            Gender
            <input
              value={formData.gender}
              onChange={(event) => setFormData((prev) => ({ ...prev, gender: event.target.value }))}
              placeholder="Male / Female"
            />
          </label>
          <label>
            Date of birth
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(event) => setFormData((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              required
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label>
            ID Number
            <input
              value={formData.idNumber}
              onChange={(event) => setFormData((prev) => ({ ...prev, idNumber: event.target.value }))}
            />
          </label>
          <label>
            NHIF Number
            <input
              value={formData.nhifNumber}
              onChange={(event) => setFormData((prev) => ({ ...prev, nhifNumber: event.target.value }))}
            />
          </label>
          <label className="form-grid__full">
            Address
            <input
              value={formData.address}
              onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
