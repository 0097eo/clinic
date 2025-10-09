import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import { AccessControl } from '../components/AccessControl';
import { Modal, MODAL_PRIMARY_BUTTON_CLASS, MODAL_SECONDARY_BUTTON_CLASS } from '../components/Modal';
import {
  adjustStock,
  createInventoryItem,
  getExpiringItems,
  getInventoryItems,
  getLowStockItems
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const initialCreateForm = {
  name: '',
  category: '',
  unit: '',
  batchNumber: '',
  expiryDate: '',
  stock: '',
  reorderLevel: ''
};

const initialAdjustForm = {
  itemId: '',
  type: 'IN',
  quantity: '',
  reference: ''
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

export function InventoryPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState(initialAdjustForm);
  const [adjustError, setAdjustError] = useState(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  const canManageInventory = ['ADMIN', 'PHARMACIST'].includes(user?.role);

  const loadInventory = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [allItems, lowStockItems, expiringItems] = await Promise.all([
        getInventoryItems({ pageSize: 100 }, token),
        getLowStockItems(token),
        getExpiringItems(token)
      ]);

      setItems(allItems?.data ?? []);
      setLowStock(lowStockItems?.data ?? []);
      setExpiring(expiringItems?.data ?? []);
    } catch (err) {
      console.error('Failed to load inventory', err);
      setError(err?.details?.message || err?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreateModal = useCallback(() => {
    setCreateError(null);
    setCreateForm(initialCreateForm);
    setCreateModalOpen(true);
  }, []);

  const openAdjustModal = useCallback(
    (itemId = '') => {
      setAdjustError(null);
      setAdjustForm({ ...initialAdjustForm, itemId: itemId || items[0]?.id || '' });
      setAdjustModalOpen(true);
    },
    [items]
  );

  const columns = useMemo(() => {
    const base = [
      { header: 'Item', accessor: 'name' },
      { header: 'Category', accessor: 'category' },
      { header: 'Batch', accessor: 'batchNumber' },
      { header: 'Unit', accessor: 'unit' },
      { header: 'Stock', accessor: 'stock' },
      { header: 'Reorder Level', accessor: 'reorderLevel' },
      {
        header: 'Expiry',
        accessor: 'expiryDate',
        cell: (row) => formatDate(row.expiryDate)
      }
    ];

    if (canManageInventory) {
      base.push({
        header: 'Actions',
        accessor: 'actions',
        cell: (row) => (
          <button type="button" className="table-action" onClick={() => openAdjustModal(row.id)}>
            Adjust
          </button>
        )
      });
    }

    return base;
  }, [canManageInventory, openAdjustModal]);

  const handleCreateItem = async (event) => {
    event.preventDefault();
    if (!token) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createInventoryItem(
        {
          ...createForm,
          stock: Number(createForm.stock || 0),
          reorderLevel: Number(createForm.reorderLevel || 0),
          expiryDate: createForm.expiryDate ? new Date(createForm.expiryDate).toISOString() : null
        },
        token
      );
      setCreateModalOpen(false);
      setCreateForm(initialCreateForm);
      loadInventory();
    } catch (err) {
      console.error('Failed to create item', err);
      setCreateError(err?.details?.message || err?.message || 'Failed to create item');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAdjustStock = async (event) => {
    event.preventDefault();
    if (!token) return;
    setAdjustLoading(true);
    setAdjustError(null);
    try {
      await adjustStock(
        adjustForm.itemId,
        {
          type: adjustForm.type,
          quantity: Number(adjustForm.quantity),
          reference: adjustForm.reference || undefined
        },
        token
      );
      setAdjustModalOpen(false);
      setAdjustForm(initialAdjustForm);
      loadInventory();
    } catch (err) {
      console.error('Failed to adjust stock', err);
      setAdjustError(err?.details?.message || err?.message || 'Failed to adjust stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Inventory"
        subtitle="Pharmacy Store"
        action={
          <AccessControl roles={['ADMIN', 'PHARMACIST']}>
            <div className="page-actions">
              <button type="button" className="action-primary" onClick={openCreateModal}>
                Add item
              </button>
              <button type="button" className="action-primary" onClick={() => openAdjustModal()}>
                Adjust stock
              </button>
            </div>
          </AccessControl>
        }
      />

      {error ? (
        <div className="panel panel--error">
          <h2 className="panel__title">{error}</h2>
        </div>
      ) : null}

      <div className="panel">
        <DataTable columns={columns} rows={items} isLoading={loading} />
      </div>

      <div className="layout-grid">
        <div className="panel">
          <h2 className="panel__title">Low Stock Alerts</h2>
          <ul className="inventory-list">
            {lowStock.length === 0 ? (
              <li>All items above reorder level.</li>
            ) : (
              lowStock.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> • {item.stock} units remaining (reorder level {item.reorderLevel})
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="panel">
          <h2 className="panel__title">Expiring Soon</h2>
          <ul className="inventory-list">
            {expiring.length === 0 ? (
              <li>No items expiring soon.</li>
            ) : (
              expiring.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> • Expires {formatDate(item.expiryDate)}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <Modal
        open={createModalOpen && canManageInventory}
        onClose={() => setCreateModalOpen(false)}
        title="Add inventory item"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={MODAL_PRIMARY_BUTTON_CLASS} form="inventory-create-form" disabled={createLoading}>
              {createLoading ? 'Saving…' : 'Create item'}
            </button>
          </>
        }
      >
        {createError ? <p className="form-error">{createError}</p> : null}
        <form id="inventory-create-form" className="form-grid" onSubmit={handleCreateItem}>
          <label>
            Name
            <input
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            Category
            <input value={createForm.category} onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))} />
          </label>
          <label>
            Unit
            <input value={createForm.unit} onChange={(event) => setCreateForm((prev) => ({ ...prev, unit: event.target.value }))} />
          </label>
          <label>
            Batch number
            <input value={createForm.batchNumber} onChange={(event) => setCreateForm((prev) => ({ ...prev, batchNumber: event.target.value }))} />
          </label>
          <label>
            Expiry date
            <input
              type="date"
              value={createForm.expiryDate}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
            />
          </label>
          <label>
            Stock
            <input
              type="number"
              min="0"
              value={createForm.stock}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, stock: event.target.value }))}
            />
          </label>
          <label>
            Reorder level
            <input
              type="number"
              min="0"
              value={createForm.reorderLevel}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, reorderLevel: event.target.value }))}
            />
          </label>
        </form>
      </Modal>

      <Modal
        open={adjustModalOpen && canManageInventory}
        onClose={() => setAdjustModalOpen(false)}
        title="Adjust stock"
        footer={
          <>
            <button type="button" className={MODAL_SECONDARY_BUTTON_CLASS} onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className={MODAL_PRIMARY_BUTTON_CLASS} form="inventory-adjust-form" disabled={adjustLoading}>
              {adjustLoading ? 'Saving…' : 'Update stock'}
            </button>
          </>
        }
      >
        {adjustError ? <p className="form-error">{adjustError}</p> : null}
        <form id="inventory-adjust-form" className="form-grid" onSubmit={handleAdjustStock}>
          <label>
            Item
            <select
              required
              value={adjustForm.itemId}
              onChange={(event) => setAdjustForm((prev) => ({ ...prev, itemId: event.target.value }))}
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.stock} in stock)
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={adjustForm.type} onChange={(event) => setAdjustForm((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              required
              value={adjustForm.quantity}
              onChange={(event) => setAdjustForm((prev) => ({ ...prev, quantity: event.target.value }))}
            />
          </label>
          <label className="form-grid__full">
            Reference
            <input
              value={adjustForm.reference}
              onChange={(event) => setAdjustForm((prev) => ({ ...prev, reference: event.target.value }))}
              placeholder="e.g. GRN-001"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
