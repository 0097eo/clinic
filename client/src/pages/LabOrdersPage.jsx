import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import { createLabOrder, getEmployees, getLabOrders, getPatients, updateLabOrderResult } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function LabOrdersPage() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [formData, setFormData] = useState({ patientId: '', orderedBy: '', testType: '', notes: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [resultForm, setResultForm] = useState({ id: '', result: '' });
  const [resultError, setResultError] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const canCreate = ['ADMIN', 'DOCTOR'].includes(user?.role);
  const canUpdateResult = ['ADMIN', 'DOCTOR'].includes(user?.role);

  const columns = useMemo(() => {
    const base = [
      { header: 'ID', accessor: 'id' },
      { header: 'Patient', accessor: 'patientName' },
      { header: 'Ordered By', accessor: 'orderedBy' },
      { header: 'Test Type', accessor: 'testType' },
      { header: 'Status', accessor: 'status' },
      {
        header: 'Created',
        accessor: 'createdAt',
        cell: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : '—')
      }
    ];

    if (canUpdateResult) {
      base.push({
        header: 'Actions',
        accessor: 'actions',
        cell: (row) =>
          row.status !== 'COMPLETED' ? (
            <button type="button" className="table-action" onClick={() => openResultModal(row.id)}>
              Add result
            </button>
          ) : null
      });
    }

    return base;
  }, [canUpdateResult]);

  const loadLabOrders = async (options = {}) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getLabOrders(
        {
          status: options.status ?? (status || undefined),
          pageSize: 50
        },
        token
      );
      const rows =
        response?.data?.map((item) => ({
          id: item.id,
          patientName: item.patient?.fullName ?? 'Unknown',
          orderedBy: item.orderedByUser?.fullName ?? '—',
          testType: item.testType,
          status: item.status,
          createdAt: item.createdAt
        })) ?? [];
      setOrders(rows);
    } catch (err) {
      console.error('Failed to load lab orders', err);
      setError(err?.details?.message || err?.message || 'Failed to load lab orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (canCreate && token) {
      getPatients({ pageSize: 100 }, token)
        .then((response) => {
          if (Array.isArray(response?.data)) {
            setPatients(response.data);
          }
        })
        .catch((err) => console.error('Failed to load patients', err));

      getEmployees({ role: 'DOCTOR' }, token)
        .then((response) => {
          if (Array.isArray(response?.data)) {
            setDoctors(response.data);
          }
        })
        .catch((err) => console.error('Failed to load doctors', err));
    }
  }, [canCreate, token]);

  const openCreateModal = () => {
    setFormError(null);
    setFormData({
      patientId: patients[0]?.id || '',
      orderedBy: doctors[0]?.id || '',
      testType: '',
      notes: ''
    });
    setCreateModalOpen(true);
  };

  const openResultModal = (id) => {
    setResultError(null);
    setResultForm({ id, result: '' });
    setResultModalOpen(true);
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setStatus(value);
    loadLabOrders({ status: value || undefined });
  };

  const handleCreateOrder = async (event) => {
    event.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await createLabOrder(
        {
          patientId: formData.patientId,
          orderedBy: formData.orderedBy || user?.id,
          testType: formData.testType,
          notes: formData.notes
        },
        token
      );
      setFormData({ patientId: '', orderedBy: '', testType: '', notes: '' });
      loadLabOrders({ status: status || undefined });
    } catch (err) {
      console.error('Failed to create lab order', err);
      setFormError(err?.details?.message || err?.message || 'Failed to create lab order');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitResult = async (event) => {
    event.preventDefault();
    if (!token || !resultForm.id) return;
    setResultLoading(true);
    setResultError(null);
    try {
      await updateLabOrderResult(resultForm.id, { result: resultForm.result }, token);
      setResultForm({ id: '', result: '' });
      setResultModalOpen(false);
      loadLabOrders({ status: status || undefined });
    } catch (err) {
      console.error('Failed to update lab result', err);
      setResultError(err?.details?.message || err?.message || 'Failed to update lab result');
    } finally {
      setResultLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Lab Orders"
        subtitle="Diagnostics Pipeline"
        action={
          <div className="page-actions">
            <div className="page-filters">
              <label>
                Status
                <select value={status} onChange={handleStatusChange}>
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
            </div>
            <AccessControl roles={['ADMIN', 'DOCTOR']}>
              <button type="button" className="action-primary" onClick={openCreateModal}>
                New lab order
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
        <DataTable columns={columns} rows={orders} isLoading={loading} />
      </div>

      <Modal
        open={createModalOpen && canCreate}
        onClose={() => setCreateModalOpen(false)}
        title="Create lab order"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="lab-order-form" className={MODAL_PRIMARY_BUTTON_CLASS} disabled={formLoading}>
              {formLoading ? 'Saving…' : 'Create lab order'}
            </button>
          </>
        }
      >
        {formError ? <p className="form-error">{formError}</p> : null}
        <form id="lab-order-form" className="form-grid" onSubmit={handleCreateOrder}>
          <label>
            Patient
            <select
              required
              value={formData.patientId}
              onChange={(event) => setFormData((prev) => ({ ...prev, patientId: event.target.value }))}
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordered by (doctor)
            <select
              required
              value={formData.orderedBy}
              onChange={(event) => setFormData((prev) => ({ ...prev, orderedBy: event.target.value }))}
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Test type
            <input
              required
              value={formData.testType}
              onChange={(event) => setFormData((prev) => ({ ...prev, testType: event.target.value }))}
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

      <Modal
        open={resultModalOpen && !!resultForm.id && canUpdateResult}
        onClose={() => {
          setResultModalOpen(false);
          setResultForm({ id: '', result: '' });
        }}
        title="Add lab result"
        footer={
          <>
            <button
              type="button"
              className={MODAL_SECONDARY_BUTTON_CLASS}
              onClick={() => {
                setResultModalOpen(false);
                setResultForm({ id: '', result: '' });
              }}
            >
              Cancel
            </button>
            <button type="submit" form="lab-result-form" className={MODAL_PRIMARY_BUTTON_CLASS} disabled={resultLoading}>
              {resultLoading ? 'Saving…' : 'Save result'}
            </button>
          </>
        }
      >
        {resultError ? <p className="form-error">{resultError}</p> : null}
        <form id="lab-result-form" className="form-grid" onSubmit={handleSubmitResult}>
          <label className="form-grid__full">
            Result
            <textarea
              required
              rows={3}
              value={resultForm.result}
              onChange={(event) => setResultForm((prev) => ({ ...prev, result: event.target.value }))}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
