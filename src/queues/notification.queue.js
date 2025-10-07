const Queue = require('bull');

const notificationQueue = new Queue('notifications', process.env.REDIS_URL, {
  settings: {
    lockDuration: 60000
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

module.exports = notificationQueue;
