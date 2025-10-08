const http = require('http');

const app = require('./app');
const { initializeSocket } = require('./sockets/notification.socket');
const notificationQueue = require('./queues/notification.queue');
const notificationService = require('./services/notification.service');

if (process.env.NODE_ENV !== 'test') {
  notificationQueue.process('send-notification', async (job) => {
    await notificationService.handleQueuedNotification(job.data);
  });

  notificationQueue.on('failed', (job, err) => {
    console.error(`Notification job ${job.id} failed`, err);
  });
}

const server = http.createServer(app);
const io = initializeSocket(server);

app.set('io', io);
app.set('notificationQueue', notificationQueue);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
