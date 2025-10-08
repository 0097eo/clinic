const app = require('../src/app');
const { mockPrisma } = require('./prismaMock');
const auditService = require('../src/services/audit.service');
const inventoryService = require('../src/services/inventory.service');
const { signToken } = require('../src/utils/jwt');
const { request } = require('./helpers/request');

const pharmacistUser = {
  id: 'pharm-auth-1',
  role: 'PHARMACIST',
  fullName: 'Pharm User',
  email: 'pharm@clinic.com'
};

const pharmacistHeader = () => `Bearer ${signToken({ id: pharmacistUser.id, role: pharmacistUser.role })}`;

describe('Inventory routes', () => {
  beforeEach(() => {
    mockPrisma.employee.findUnique.mockReset();
    mockPrisma.employee.findUnique.mockResolvedValue(pharmacistUser);
  });

  it('creates an inventory item', async () => {
    const item = {
      id: 'item-100',
      name: 'Paracetamol',
      stock: 10,
      reorderLevel: 5
    };

    mockPrisma.item.create.mockResolvedValueOnce(item);

    const response = await request(app, {
      method: 'POST',
      url: '/api/items',
      headers: {
        Authorization: pharmacistHeader()
      },
      body: {
        name: item.name,
        stock: item.stock,
        reorderLevel: item.reorderLevel
      }
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.item.create).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Item',
        action: 'CREATE',
        entityId: item.id
      })
    );
  });

  it('lists inventory items', async () => {
    const items = [
      { id: 'item-1', name: 'Drug A' },
      { id: 'item-2', name: 'Drug B' }
    ];

    mockPrisma.item.findMany.mockResolvedValueOnce(items);
    mockPrisma.item.count.mockResolvedValueOnce(items.length);

    const response = await request(app, {
      method: 'GET',
      url: '/api/items?page=1&pageSize=10',
      headers: {
        Authorization: pharmacistHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(items.length);
    expect(response.body.pagination.total).toBe(items.length);
  });

  it('returns low stock items only', async () => {
    const inventory = [
      { id: 'item-1', name: 'Low Drug', stock: 2, reorderLevel: 5 },
      { id: 'item-2', name: 'Healthy Stock', stock: 10, reorderLevel: 5 }
    ];

    mockPrisma.item.findMany.mockResolvedValueOnce(inventory);

    const response = await request(app, {
      method: 'GET',
      url: '/api/items/low-stock',
      headers: {
        Authorization: pharmacistHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 'item-1', name: 'Low Drug', stock: 2, reorderLevel: 5 }]);
  });

  it('adjusts stock levels', async () => {
    const itemId = 'item-10';
    const updatedItem = { id: itemId, stock: 15, reorderLevel: 5 };

    inventoryService.adjustStock.mockResolvedValueOnce(updatedItem);
    inventoryService.handleLowStockCheck.mockResolvedValueOnce();

    const response = await request(app, {
      method: 'POST',
      url: `/api/items/${itemId}/stock`,
      headers: {
        Authorization: pharmacistHeader()
      },
      body: {
        type: 'IN',
        quantity: 5,
        reference: 'Receipt123'
      }
    });

    expect(response.status).toBe(200);
    expect(inventoryService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId, type: 'IN', quantity: 5, reference: 'Receipt123' })
    );
    expect(inventoryService.handleLowStockCheck).toHaveBeenCalledWith(itemId);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Item',
        action: 'UPDATE',
        entityId: itemId
      })
    );
  });

  it('returns expiring items', async () => {
    const expiring = [{ id: 'item-exp', name: 'Expiring Drug' }];
    inventoryService.getExpiringItems.mockResolvedValueOnce(expiring);

    const response = await request(app, {
      method: 'GET',
      url: '/api/items/expiring?days=15',
      headers: {
        Authorization: pharmacistHeader()
      }
    });

    expect(response.status).toBe(200);
    expect(inventoryService.getExpiringItems).toHaveBeenCalledWith(15);
    expect(response.body.data).toEqual(expiring);
  });
});
