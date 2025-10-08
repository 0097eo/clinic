const { mockPrisma, resetMockPrisma } = require('./prismaMock');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

jest.mock('../src/utils/prisma', () => mockPrisma);

jest.mock('../src/services/audit.service', () => ({
  log: jest.fn()
}));

const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
  on: jest.fn()
};

jest.mock('../src/queues/notification.queue', () => mockQueue);

const mockSocket = {
  use: jest.fn(),
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
};

jest.mock('../src/sockets/notification.socket', () => ({
  initializeSocket: jest.fn(() => mockSocket),
  emitToUser: jest.fn(),
  emitToRole: jest.fn()
}));

jest.mock('../src/services/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  scheduleNotification: jest.fn().mockResolvedValue(undefined),
  handleQueuedNotification: jest.fn().mockResolvedValue(undefined),
  sendInApp: jest.fn(),
  sendSMSNotification: jest.fn(),
  sendEmailNotification: jest.fn(),
  markAsRead: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'READ' }),
  markAllAsRead: jest.fn().mockResolvedValue({ count: 1 }),
  deleteNotification: jest.fn().mockResolvedValue({ count: 1 }),
  getUnreadCount: jest.fn().mockResolvedValue(0),
  getNotifications: jest.fn().mockResolvedValue([]),
  enqueueDelivery: jest.fn(),
  scheduleLowStockDigest: jest.fn()
}));

jest.mock('../src/services/inventory.service', () => ({
  adjustStock: jest.fn(),
  handleLowStockCheck: jest.fn(),
  applyStockChange: jest.fn(),
  getExpiringItems: jest.fn().mockResolvedValue([]),
  notifyLowStock: jest.fn()
}));

jest.mock('../src/utils/hash', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn().mockResolvedValue(true)
}));

beforeEach(() => {
  resetMockPrisma();
  jest.clearAllMocks();
});
