const africastalking = require('africastalking');

class SMSService {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (this.client) {
      return this.client;
    }

    const { AT_USERNAME, AT_API_KEY } = process.env;
    if (!AT_USERNAME || !AT_API_KEY) {
      throw new Error('Africa\'s Talking credentials not configured');
    }

    this.client = africastalking({
      username: AT_USERNAME,
      apiKey: AT_API_KEY
    });

    return this.client;
  }

  async sendSMS({ to, message }) {
    if (!to || !message) {
      throw new Error('SMS requires recipient phone number and message');
    }

    const client = this.getClient();
    await client.SMS.send({
      to,
      message,
      from: process.env.AT_SENDER_ID
    });
  }
}

module.exports = new SMSService();
