const nodemailer = require('nodemailer');
const prisma = require('../utils/prisma');
const notificationQueue = require('../queues/notification.queue');
const smsService = require('./sms.service');
const { emitToUser } = require('../sockets/notification.socket');

class NotificationService {
  constructor() {
    this.mailTransporter = null;
  }

  getTransporter() {
    if (this.mailTransporter) {
      return this.mailTransporter;
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT) {
      throw new Error('SMTP configuration missing');
    }

    this.mailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });

    return this.mailTransporter;
  }

  async createNotification(data, options = {}) {
    const notification = await prisma.notification.create({
      data
    });

    if (options.deferSend) {
      return notification;
    }

    if (data.channel === 'IN_APP') {
      await this.sendInApp(notification);
    } else {
      await this.enqueueDelivery(notification.id, data.channel, options.delay || 0);
    }

    return notification;
  }

  async enqueueDelivery(notificationId, channel, delay = 0) {
    await notificationQueue.add(
      'send-notification',
      { notificationId, channel },
      {
        delay
      }
    );
  }

  async sendInApp(notification) {
    if (notification.recipientType === 'EMPLOYEE') {
      emitToUser(notification.recipientId, notification);
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() }
    });

    return notification;
  }

  async sendSMSNotification(notification) {
    const phone = notification.data?.phone;
    if (!phone) {
      throw new Error('SMS recipient phone number not provided');
    }

    await smsService.sendSMS({
      to: phone,
      message: notification.message
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() }
    });
  }

  async sendEmailNotification(notification) {
    const email = notification.data?.email;
    if (!email) {
      throw new Error('Email recipient address not provided');
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: notification.title,
      text: notification.message,
      html: notification.data?.htmlBody || undefined
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() }
    });
  }

  async handleQueuedNotification({ notificationId, channel }) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return;
    }

    try {
      if (channel === 'SMS') {
        await this.sendSMSNotification(notification);
      } else if (channel === 'EMAIL') {
        await this.sendEmailNotification(notification);
      }
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' }
      });
      throw error;
    }
  }

  async scheduleNotification(notificationId, channel, delay) {
    await this.enqueueDelivery(notificationId, channel, delay);
  }

  async markAsRead(notificationId, recipientId) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    return prisma.notification.findUnique({ where: { id: notificationId } });
  }

  async markAllAsRead(recipientId) {
    return prisma.notification.updateMany({
      where: {
        recipientId,
        status: { in: ['PENDING', 'SENT'] }
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });
  }

  async deleteNotification(notificationId, recipientId) {
    return prisma.notification.deleteMany({
      where: {
        id: notificationId,
        recipientId
      }
    });
  }

  async getUnreadCount(userId) {
    return prisma.notification.count({
      where: {
        recipientId: userId,
        status: 'PENDING'
      }
    });
  }

  async getNotifications(recipientId, pagination = { skip: 0, take: 20 }) {
    return prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take
    });
  }
}

module.exports = new NotificationService();
