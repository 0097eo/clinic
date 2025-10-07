const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    throw new Error('Password and hash are required for comparison');
  }

  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword
};
