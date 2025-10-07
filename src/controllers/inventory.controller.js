const prisma = require('../utils/prisma');
const asyncHandler = require('../utils/asyncHandler');
const AuditService = require('../services/audit.service');
const inventoryService = require('../services/inventory.service');

const createItem = asyncHandler(async (req, res) => {
  const { name, category, unit, batchNumber, expiryDate, stock = 0, reorderLevel = 0 } = req.body;

  const item = await prisma.item.create({
    data: {
      name,
      category,
      unit,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      stock: Number(stock) || 0,
      reorderLevel: Number(reorderLevel) || 0
    }
  });

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'CREATE',
    entityType: 'Item',
    entityId: item.id,
    changes: { new: item },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({ data: item });
});

const listItems = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 25);
  const skip = (page - 1) * pageSize;

  const filters = {};
  if (req.query.category) {
    filters.category = req.query.category;
  }
  if (req.query.name) {
    filters.name = { contains: req.query.name, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    prisma.item.findMany({
      where: filters,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize
    }),
    prisma.item.count({ where: filters })
  ]);

  res.json({
    data,
    pagination: {
      page,
      pageSize,
      total
    }
  });
});

const getLowStockItems = asyncHandler(async (req, res) => {
  const items = await prisma.item.findMany({
    where: {
      reorderLevel: { gt: 0 }
    }
  });

  const lowStock = items.filter((item) => item.stock <= item.reorderLevel);

  res.json({ data: lowStock });
});

const adjustStock = asyncHandler(async (req, res) => {
  const { type, quantity, reference } = req.body;

  let updatedItem;
  try {
    updatedItem = await inventoryService.adjustStock({
      itemId: req.params.id,
      type,
      quantity,
      reference
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Item not found' });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }
    if (error.message === 'INVALID_TYPE' || error.message === 'INVALID_QUANTITY') {
      return res.status(400).json({ message: 'Invalid stock adjustment request' });
    }
    throw error;
  }

  await AuditService.log({
    userId: req.user.id,
    userRole: req.user.role,
    action: 'UPDATE',
    entityType: 'Item',
    entityId: updatedItem.id,
    changes: {
      new: updatedItem,
      operation: type,
      quantity
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  await inventoryService.handleLowStockCheck(updatedItem.id);

  res.json({ data: updatedItem });
});

const getExpiringItems = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 30);
  const items = await inventoryService.getExpiringItems(days);
  res.json({ data: items });
});

module.exports = {
  createItem,
  listItems,
  getLowStockItems,
  adjustStock,
  getExpiringItems
};
