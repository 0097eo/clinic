import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import {
  createBilling,
  getAppointments,
  getBilling,
  getOutstandingBilling,
  getPatients,
  recordBillingPayment
} from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'KES 0';
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return `KES ${amount}`;
  return `KES ${numeric.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}

const PAYMENT_MODES = ['CASH', 'INSURANCE', 'NHIF', 'MPESA'];

export function BillingPage() {
  const { token, user } = useAuth();
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outstanding, setOutstanding] = useState([]);
  const [paymentForm, setPaymentForm] = useState({ billingId: '', amount: '', method: 'CASH', reference: '' });
  const [paymentError, setPaymentError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const initialCreateForm = {
    patientId: '',
    appointmentId: '',
    paymentMode: 'CASH',
    totalAmount: '',
    paidAmount: ''
  };
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [patientOptions, setPatientOptions] = useState([]);
  const [appointmentOptions, setAppointmentOptions] = useState([]);

  const canManageBilling = ['ADMIN', 'ACCOUNTANT'].includes(user?.role);
  const canRecordPayment = canManageBilling;

  const columns = useMemo(() => {
    const base = [
      { header: 'Patient', accessor: 'patientName' },
      {
        header: 'Total Amount',
        accessor: 'totalAmount',
        cell: (row) => formatCurrency(row.totalAmount)
      },
      {
        header: 'Paid',
        accessor: 'paidAmount',
        cell: (row) => formatCurrency(row.paidAmount)
      },
      {
        header: 'Balance',
        accessor: 'outstandingBalance',
        cell: (row) => formatCurrency(row.outstandingBalance)
      },
      { header: 'Status', accessor: 'status' }
    ];

    if (canRecordPayment) {
      base.push({
        header: 'Actions',
        accessor: 'actions',
        cell: (row) =>
          row.outstandingBalance > 0 ? (
            <button
              type="button"
              className="table-action"
              onClick={() => {
                setPaymentForm((prev) => ({ ...prev, billingId: row.id, amount: '', reference: '' }));
                setPaymentModalOpen(true);
              }}
            >
              Record payment
            </button>
          ) : null
      });
    }

    return base;
  }, [canRecordPayment]);

  const appointmentChoices = useMemo(() => {
    if (!createForm.patientId) {
      return appointmentOptions;
    }
    return appointmentOptions.filter((option) => option.patientId === createForm.patientId);
  }, [appointmentOptions, createForm.patientId]);

  const loadBilling = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [list, outstandingList] = await Promise.all([getBilling({ pageSize: 100 }, token), getOutstandingBilling(token)]);
      const rows =
        list?.data?.map((item) => ({
          id: item.id,
          patientName: item.patient?.fullName ?? 'Unknown',
          appointmentId: item.appointmentId ?? '—',
          totalAmount: Number(item.totalAmount ?? item.totalAmount?.toString() ?? 0),
          paidAmount: Number(item.paidAmount ?? item.paidAmount?.toString() ?? 0),
          outstandingBalance: Number(item.outstandingBalance ?? item.outstandingBalance?.toString() ?? 0),
          status: item.status
        })) ?? [];
      setBilling(rows);
      setOutstanding(outstandingList?.data ?? []);
    } catch (err) {
      console.error('Failed to load billing', err);
      setError(err?.details?.message || err?.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    if (!token) return;
    try {
      const [patientsResponse, appointmentsResponse] = await Promise.all([
        getPatients({ pageSize: 100 }, token),
        getAppointments({ status: 'CHECKED_IN', pageSize: 100 }, token)
      ]);

      const patientOptionsData = (patientsResponse?.data || []).map((patient) => ({
        id: patient.id,
        label: `${patient.fullName} (${patient.id})`
      }));
      setPatientOptions(patientOptionsData);

      const appointmentOptionsData = (appointmentsResponse?.data || []).map((appointment) => {
        const dateValue = appointment.date ? new Date(appointment.date) : null;
        const dateLabel = dateValue ? dateValue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date';
        const timeLabel = appointment.time || '';
        const patientName = appointment.patient?.fullName ?? 'Unknown patient';
        return {
          id: appointment.id,
          patientId: appointment.patientId,
          label: `${dateLabel} ${timeLabel} • ${patientName}`
        };
      });
      setAppointmentOptions(appointmentOptionsData);
    } catch (err) {
      console.error('Failed to load billing lookups', err);
    }
  };

  useEffect(() => {
    loadBilling();
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalRevenue = billing.reduce((acc, bill) => acc + (bill.paidAmount || 0), 0);
  const totalOutstanding = billing.reduce((acc, bill) => acc + (bill.outstandingBalance || 0), 0);

  const openCreateModal = () => {
    setCreateForm({ ...initialCreateForm });
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateError(null);
    setCreateForm({ ...initialCreateForm });
  };

  const handleCreateFormChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'patientId' && prev.appointmentId) {
        const stillValid = appointmentOptions.some((option) => option.id === prev.appointmentId && option.patientId === value);
        if (!stillValid) {
          next.appointmentId = '';
        }
      }
      return next;
    });
    if (createError) {
      setCreateError(null);
    }
  };

  const handleCreateBilling = async (event) => {
    event.preventDefault();
    const patientId = createForm.patientId.trim();
    const appointmentId = createForm.appointmentId.trim();
    const totalAmount = Number(createForm.totalAmount);
    const paidAmount = createForm.paidAmount === '' ? 0 : Number(createForm.paidAmount);

    if (!patientId) {
      setCreateError('Patient ID is required');
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setCreateError('Total amount must be greater than 0');
      return;
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      setCreateError('Paid amount must be zero or greater');
      return;
    }

    if (paidAmount > totalAmount) {
      setCreateError('Paid amount cannot exceed total amount');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      await createBilling(
        {
          patientId,
          appointmentId: appointmentId || undefined,
          paymentMode: createForm.paymentMode,
          totalAmount,
          paidAmount
        },
        token
      );
      setCreateForm({ ...initialCreateForm });
      setCreateModalOpen(false);
      loadBilling();
    } catch (err) {
      console.error('Failed to create billing', err);
      setCreateError(err?.details?.message || err?.message || 'Failed to create billing record');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.billingId) {
      setPaymentError('Select an invoice');
      return;
    }
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      await recordBillingPayment(
        paymentForm.billingId,
        {
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          reference: paymentForm.reference || undefined
        },
        token
      );
      setPaymentForm({ billingId: '', amount: '', method: 'CASH', reference: '' });
      loadBilling();
      setPaymentModalOpen(false);
    } catch (err) {
      console.error('Failed to record payment', err);
      setPaymentError(err?.details?.message || err?.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Billing"
        subtitle="Financial Overview"
        action={
          <div className="page-actions">
            <div className="billing-metrics">
              <div>
                <p className="panel__eyebrow">Collected</p>
                <p className="billing-metrics__value">{formatCurrency(totalRevenue)}</p>
              </div>
              <div>
                <p className="panel__eyebrow">Outstanding</p>
                <p className="billing-metrics__value billing-metrics__value--warning">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
            {canManageBilling ? (
              <button
                type="button"
                className="action-primary"
                onClick={openCreateModal}
                disabled={patientOptions.length === 0}
              >
                New invoice
              </button>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="panel panel--error">
          <h2 className="panel__title">{error}</h2>
        </div>
      ) : null}

      <div className="panel">
        <DataTable columns={columns} rows={billing} isLoading={loading} />
      </div>

      <div className="panel">
        <h2 className="panel__title">Outstanding Accounts</h2>
        <ul className="outstanding-list">
          {outstanding.length === 0 ? (
            <li>All accounts are settled.</li>
          ) : (
            outstanding.map((bill) => (
              <li key={bill.id}>
                <strong>{bill.patient?.fullName ?? 'Unknown patient'}</strong> • {formatCurrency(bill.outstandingBalance)}
              </li>
            ))
          )}
        </ul>
      </div>

      <Modal
        open={createModalOpen && canManageBilling}
        onClose={closeCreateModal}
        title="New invoice"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={closeCreateModal}>
              Cancel
            </button>
            <button type="submit" form="create-billing-form" className={MODAL_PRIMARY_BUTTON_CLASS} disabled={createLoading}>
              {createLoading ? 'Saving…' : 'Create invoice'}
            </button>
          </>
        }
      >
        {createError ? <p className="form-error">{createError}</p> : null}
        <form id="create-billing-form" className="form-grid" onSubmit={handleCreateBilling}>
          <label>
            Patient
            <select name="patientId" value={createForm.patientId} onChange={handleCreateFormChange} required>
              <option value="">Select patient</option>
              {patientOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Appointment
            <select name="appointmentId" value={createForm.appointmentId} onChange={handleCreateFormChange}>
              <option value="">Unlinked</option>
              {appointmentChoices.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Payment mode
            <select name="paymentMode" value={createForm.paymentMode} onChange={handleCreateFormChange}>
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Total amount (KES)
            <input
              type="number"
              name="totalAmount"
              min="0"
              step="0.01"
              value={createForm.totalAmount}
              onChange={handleCreateFormChange}
              required
            />
          </label>
          <label>
            Paid amount (KES)
            <input
              type="number"
              name="paidAmount"
              min="0"
              step="0.01"
              value={createForm.paidAmount}
              onChange={handleCreateFormChange}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={paymentModalOpen && canRecordPayment}
        onClose={() => setPaymentModalOpen(false)}
        title="Record payment"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="payment-form" className={MODAL_PRIMARY_BUTTON_CLASS} disabled={paymentLoading}>
              {paymentLoading ? 'Saving…' : 'Record payment'}
            </button>
          </>
        }
      >
        {paymentError ? <p className="form-error">{paymentError}</p> : null}
        <form id="payment-form" className="form-grid" onSubmit={handleRecordPayment}>
          <label>
            Invoice
            <select
              required
              value={paymentForm.billingId}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, billingId: event.target.value }))}
            >
              <option value="">Select invoice</option>
              {billing
                .filter((bill) => bill.outstandingBalance > 0)
                .map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.patientName} ({formatCurrency(bill.outstandingBalance)} due)
                  </option>
                ))}
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </label>
          <label>
            Method
            <select value={paymentForm.method} onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}>
              <option value="CASH">CASH</option>
              <option value="MPESA">MPESA</option>
              <option value="INSURANCE">INSURANCE</option>
              <option value="NHIF">NHIF</option>
            </select>
          </label>
          <label className="form-grid__full">
            Reference
            <input
              value={paymentForm.reference}
              onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))}
              placeholder="Receipt or transaction code"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
