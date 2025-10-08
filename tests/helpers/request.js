const inject = require('light-my-request');

const parsePayload = (payload) => {
  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(payload);
  } catch (error) {
    return payload;
  }
};

const request = async (app, { method, url, body, headers = {} }) => {
  const hasBody = body !== undefined;
  const response = await inject(app, {
    method,
    url,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    payload: hasBody ? JSON.stringify(body) : undefined
  });

  return {
    status: response.statusCode,
    body: parsePayload(response.payload),
    headers: response.headers
  };
};

module.exports = {
  request
};
