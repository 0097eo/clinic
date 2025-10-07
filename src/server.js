require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');

const { initializeSocket } = require('./sockets/notification.socket');
const notificationQueue = require('./queues/notification.queue');
const notificationService = require('./services/notification.service');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

notificationQueue.process('send-notification', async (job) => {
  await notificationService.handleQueuedNotification(job.data);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`Notification job ${job.id} failed`, err);
});

const server = http.createServer(app);
const io = initializeSocket(server);

app.set('io', io);
app.set('notificationQueue', notificationQueue);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
