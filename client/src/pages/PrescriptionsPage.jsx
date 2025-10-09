import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import {
  createPrescription,
  dispensePrescription,
  getEmployees,
  getInventoryItems,
  getPatients,
  getPrescriptions
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const INITIAL_ITEM = {
  itemId: '',
  quantity: '1',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export function PrescriptionsPage() {
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [filters, setFilters] = useState({ dispensed: 'all' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ patientId: '', doctorId: '', notes: '', items: [{ ...INITIAL_ITEM }] });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const canCreate = ['ADMIN', 'DOCTOR'].includes(user?.role);
  const canDispense = ['ADMIN', 'PHARMACIST'].includes(user?.role);

  const loadPrescriptions = async (options = {}) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resolvedDispensed =
        options.dispensed !== undefined
          ? options.dispensed
          : filters.dispensed === 'all'
          ? undefined
          : filters.dispensed === 'true';

      const response = await getPrescriptions(
        {
          page: options.page ?? 1,
          pageSize: 50,
          dispensed: resolvedDispensed
        },
        token
      );
      const rows =
        response?.data?.map((item) => ({
          id: item.id,
          patientName: item.patient?.fullName ?? 'Unknown',
          doctorName: item.doctor?.fullName ?? '—',
          itemCount: item.items?.length ?? 0,
          dispensed: item.dispensed,
          createdAt: item.createdAt
        })) ?? [];
      setPrescriptions(rows);
    } catch (err) {
      console.error('Failed to load prescriptions', err);
      setError(err?.details?.message || err?.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;

    if (canCreate) {
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

    getInventoryItems({ pageSize: 100 }, token)
      .then((response) => {
        if (Array.isArray(response?.data)) {
          setInventoryItems(response.data);
        }
      })
      .catch((err) => console.error('Failed to load items', err));
  }, [canCreate, token]);

  const getDefaultItemId = () => inventoryItems[0]?.id || '';

  const openCreateModal = () => {
    setFormError(null);
    const defaultPatientId = patients[0]?.id || '';
    const defaultDoctorId = user?.role === 'DOCTOR' ? user.id : doctors[0]?.id || '';
    const defaultItemId = getDefaultItemId();
    setFormData({
      patientId: defaultPatientId,
      doctorId: defaultDoctorId,
      notes: '',
      items: [{ ...INITIAL_ITEM, itemId: defaultItemId }]
    });
    setCreateModalOpen(true);
  };

  const handleStatusChange = (event) => {
    const value = event.target.value;
    setFilters({ dispensed: value });
    loadPrescriptions({ dispensed: value === 'all' ? undefined : value === 'true' });
  };

  const handleItemFieldChange = (index, field, value) => {
    setFormData((prev) => {
      const items = prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item));
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...INITIAL_ITEM, itemId: getDefaultItemId() }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => {
      const items = prev.items.filter((_, itemIndex) => itemIndex !== index);
      return { ...prev, items: items.length > 0 ? items : [{ ...INITIAL_ITEM, itemId: getDefaultItemId() }] };
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const preparedItems = formData.items
        .map((item) => ({
          itemId: item.itemId.trim(),
          quantity: Number(item.quantity),
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          duration: item.duration.trim(),
          instructions: item.instructions ? item.instructions.trim() : undefined
        }))
        .filter((item) => item.itemId);

      if (preparedItems.length === 0) {
        throw new Error('Add at least one medication item.');
      }

      const invalidItem = preparedItems.find(
        (item) => !item.dosage || !item.frequency || !item.duration || Number.isNaN(item.quantity) || item.quantity <= 0
      );

      if (invalidItem) {
        throw new Error('Complete all fields for each medication item and ensure quantity is greater than zero.');
      }

      await createPrescription(
        {
          patientId: formData.patientId,
          doctorId: formData.doctorId || user?.id,
          notes: formData.notes,
          items: preparedItems
        },
        token
      );

      const defaultPatientId = patients[0]?.id || '';
      const defaultDoctorId = user?.role === 'DOCTOR' ? user.id : doctors[0]?.id || '';
      const defaultItemId = getDefaultItemId();
      setFormData({
        patientId: defaultPatientId,
        doctorId: defaultDoctorId,
        notes: '',
        items: [{ ...INITIAL_ITEM, itemId: defaultItemId }]
      });
      loadPrescriptions();
      setCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to create prescription', err);
      setFormError(err.message || err?.details?.message || 'Failed to create prescription');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDispense = useCallback(
    async (id) => {
      try {
        await dispensePrescription(id, token);
        loadPrescriptions({ dispensed: filters.dispensed === 'all' ? undefined : filters.dispensed === 'true' });
      } catch (err) {
        console.error('Failed to dispense prescription', err);
        setError(err?.details?.message || err?.message || 'Failed to dispense prescription');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, filters.dispensed]
  );

  const columns = useMemo(() => {
    const base = [
      { header: 'Patient', accessor: 'patientName' },
      { header: 'Doctor', accessor: 'doctorName' },
      {
        header: '# Items',
        accessor: 'itemCount'
      },
      {
        header: 'Status',
        accessor: 'dispensed',
        cell: (row) => (row.dispensed ? 'Dispensed' : 'Pending')
      },
      {
        header: 'Created',
        accessor: 'createdAt',
        cell: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : '—')
      }
    ];

    if (canDispense) {
      base.push({
        header: 'Actions',
        accessor: 'actions',
        cell: (row) =>
          !row.dispensed ? (
            <button type="button" className="table-action" onClick={() => handleDispense(row.id)}>
              Dispense
            </button>
          ) : null
      });
    }

    return base;
  }, [canDispense, handleDispense]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Prescriptions"
        subtitle="Medication Management"
        action={
          <div className="page-actions">
            <div className="page-filters">
              <label>
                Status
                <select value={filters.dispensed} onChange={handleStatusChange}>
                  <option value="all">All</option>
                  <option value="false">Pending</option>
                  <option value="true">Dispensed</option>
                </select>
              </label>
            </div>
            <AccessControl roles={['ADMIN', 'DOCTOR']}>
              <button type="button" className="action-primary" onClick={openCreateModal}>
                New prescription
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
        <DataTable columns={columns} rows={prescriptions} isLoading={loading} />
      </div>

      <Modal
        open={createModalOpen && canCreate}
        onClose={() => setCreateModalOpen(false)}
        title="Create prescription"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="prescription-form" className={MODAL_PRIMARY_BUTTON_CLASS} disabled={formLoading}>
              {formLoading ? 'Saving…' : 'Create prescription'}
            </button>
          </>
        }
      >
        {formError ? <p className="form-error">{formError}</p> : null}
        <form id="prescription-form" className="form-grid prescription-form" onSubmit={handleCreate}>
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
            Doctor
            <select
              required
              value={formData.doctorId}
              onChange={(event) => setFormData((prev) => ({ ...prev, doctorId: event.target.value }))}
            >
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="form-grid__full">
            Notes
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <div className="form-grid__full prescription-items">
            <div className="prescription-items__header">
              <h3>Medications</h3>
              <button
                type="button"
                className="modal-button modal-button--secondary"
                onClick={handleAddItem}
                disabled={formLoading || inventoryItems.length === 0}
              >
                + Add item
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="prescription-item">
                <div className="prescription-item__header">
                  <span>Item {index + 1}</span>
                  {formData.items.length > 1 ? (
                    <button
                      type="button"
                      className="prescription-item__remove"
                      onClick={() => handleRemoveItem(index)}
                      disabled={formLoading}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="prescription-item__grid">
                  <label>
                    Medication
                    <select
                      required
                      value={item.itemId}
                      onChange={(event) => handleItemFieldChange(index, 'itemId', event.target.value)}
                      disabled={inventoryItems.length === 0}
                    >
                      <option value="">Select item</option>
                      {inventoryItems.length === 0 ? (
                        <option value="" disabled>
                          No inventory items available
                        </option>
                      ) : null}
                      {inventoryItems.map((inventoryItem) => (
                        <option key={inventoryItem.id} value={inventoryItem.id}>
                          {inventoryItem.name} ({inventoryItem.unit || 'unit'})
                        </option>
                      ))}
                    </select>
                    {inventoryItems.length === 0 ? (
                      <span className="prescription-item__note">Add inventory items before creating prescriptions.</span>
                    ) : null}
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(event) => handleItemFieldChange(index, 'quantity', event.target.value)}
                    />
                  </label>
                  <label>
                    Dosage
                    <input
                      required
                      value={item.dosage}
                      onChange={(event) => handleItemFieldChange(index, 'dosage', event.target.value)}
                      placeholder="e.g. 500mg"
                    />
                  </label>
                  <label>
                    Frequency
                    <input
                      required
                      value={item.frequency}
                      onChange={(event) => handleItemFieldChange(index, 'frequency', event.target.value)}
                      placeholder="e.g. Twice daily"
                    />
                  </label>
                  <label>
                    Duration
                    <input
                      required
                      value={item.duration}
                      onChange={(event) => handleItemFieldChange(index, 'duration', event.target.value)}
                      placeholder="e.g. 5 days"
                    />
                  </label>
                  <label className="form-grid__full">
                    Instructions
                    <textarea
                      rows={2}
                      value={item.instructions}
                      onChange={(event) => handleItemFieldChange(index, 'instructions', event.target.value)}
                      placeholder="Additional instructions (optional)"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}
