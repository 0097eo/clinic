const prisma = require('../utils/prisma');
const notificationService = require('./notification.service');

class InventoryService {
  async applyStockChange(tx, { itemId, type, quantity, reference }) {
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      throw new Error('INVALID_QUANTITY');
    }

    const item = await tx.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new Error('NOT_FOUND');
    }

    let newStock = item.stock;
    if (type === 'IN') {
      newStock += qty;
    } else if (type === 'OUT') {
      if (item.stock < qty) {
        throw new Error('INSUFFICIENT_STOCK');
      }
      newStock -= qty;
    } else {
      throw new Error('INVALID_TYPE');
    }

    const updated = await tx.item.update({
      where: { id: itemId },
      data: { stock: newStock }
    });

    await tx.stockTransaction.create({
      data: {
        itemId,
        type,
        quantity: qty,
        balance: newStock,
        reference
      }
    });

    return updated;
  }

  async adjustStock({ itemId, type, quantity, reference }) {
    return prisma.$transaction((tx) => this.applyStockChange(tx, { itemId, type, quantity, reference }));
  }

  async notifyLowStock(item) {
    if (item.reorderLevel <= 0 || item.stock > item.reorderLevel) {
      return;
    }

    const recipients = await prisma.employee.findMany({
      where: {
        role: { in: ['PHARMACIST', 'ADMIN'] }
      }
    });

    const notificationPromises = recipients.flatMap((recipient) => {
      const notifications = [];
      notifications.push(
        notificationService
          .createNotification(
            {
              recipientId: recipient.id,
              recipientType: 'EMPLOYEE',
              type: 'LOW_STOCK_ALERT',
              title: 'Low Stock Alert',
              message: `Item ${item.name} is low on stock (${item.stock} remaining).`,
              data: {
                itemId: item.id,
                stock: item.stock
              },
              channel: 'IN_APP'
            },
            { deferSend: false }
          )
          .catch((error) => console.error('Failed to send in-app low stock alert', error))
      );

      if (recipient.email) {
        notifications.push(
          notificationService
            .createNotification(
              {
                recipientId: recipient.id,
                recipientType: 'EMPLOYEE',
                type: 'LOW_STOCK_ALERT',
                title: 'Low Stock Alert',
                message: `Item ${item.name} stock has fallen to ${item.stock}.`,
                data: {
                  email: recipient.email,
                  itemId: item.id,
                  stock: item.stock
                },
                channel: 'EMAIL'
              },
              { deferSend: false }
            )
            .catch((error) => console.error('Failed to send email low stock alert', error))
        );
      }

      return notifications;
    });

    await Promise.all(notificationPromises);
  }

  async handleLowStockCheck(itemId) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) return;
    await this.notifyLowStock(item);
  }

  async getExpiringItems(days = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return prisma.item.findMany({
      where: {
        expiryDate: {
          not: null,
          lte: threshold,
          gt: now
        }
      },
      orderBy: { expiryDate: 'asc' }
    });
  }
}

module.exports = new InventoryService();
