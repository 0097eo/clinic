import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import { getBilling, getOutstandingBilling, recordBillingPayment } from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'KES 0';
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return `KES ${amount}`;
  return `KES ${numeric.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}

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

  const canRecordPayment = ['ADMIN', 'ACCOUNTANT'].includes(user?.role);

  const columns = useMemo(() => {
    const base = [
      { header: 'Invoice', accessor: 'id' },
      { header: 'Patient', accessor: 'patientName' },
      { header: 'Appointment', accessor: 'appointmentId' },
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

  useEffect(() => {
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalRevenue = billing.reduce((acc, bill) => acc + (bill.paidAmount || 0), 0);
  const totalOutstanding = billing.reduce((acc, bill) => acc + (bill.outstandingBalance || 0), 0);

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
