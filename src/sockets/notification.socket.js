const socketIO = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');
const { setSocketServer, getSocketServer } = require('../utils/socketRegistry');

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    const employee = await prisma.employee.findUnique({
      where: { id: payload.id }
    });

    if (!employee) {
      return next(new Error('Invalid authentication token'));
    }

    socket.user = {
      id: employee.id,
      role: employee.role,
      fullName: employee.fullName
    };

    return next();
  } catch (error) {
    return next(new Error('Authentication failed'));
  }
}

function initializeSocket(server) {
  const io = socketIO(server, {
    cors: { origin: process.env.CLIENT_URL }
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);

    socket.on('disconnect', () => {
      socket.leave(`user:${id}`);
      socket.leave(`role:${role}`);
    });
  });

  setSocketServer(io);

  return io;
}

function emitToUser(userId, notification) {
  const io = getSocketServer();
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
}

function emitToRole(role, notification) {
  const io = getSocketServer();
  if (!io) return;
  io.to(`role:${role}`).emit('notification', notification);
}

module.exports = {
  initializeSocket,
  emitToUser,
  emitToRole
};
