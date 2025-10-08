const factory = () => {
  const mockPrisma = {
    $transaction: jest.fn(async (callback) => callback(mockPrisma)),
    employee: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    patient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    appointment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    billing: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    billingPayment: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    prescription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    prescriptionItem: {
      create: jest.fn()
    },
    labOrder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    item: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    stockTransaction: {
      create: jest.fn()
    },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn()
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn()
    }
  };

  return mockPrisma;
};

const mockPrismaInstance = factory();

const resetMockPrisma = () => {
  Object.values(mockPrismaInstance).forEach((value) => {
    if (typeof value === 'function') {
      value.mockClear();
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach((fn) => {
        if (fn && typeof fn.mockReset === 'function') {
          fn.mockReset();
        }
      });
    }
  });
};

module.exports = {
  mockPrisma: mockPrismaInstance,
  resetMockPrisma
};
