const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, { method = 'GET', body, token, headers } = {}) {
  const config = {
    method,
    headers: {
      Accept: 'application/json',
      ...(headers || {})
    }
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && method !== 'GET') {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed');
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

export async function login({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

export async function registerEmployee(payload, token) {
  return request('/auth/register', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function getCurrentUser(token) {
  return request('/auth/me', { token });
}

export async function updateCurrentUser(payload, token) {
  return request('/auth/me', {
    method: 'PUT',
    body: payload,
    token
  });
}

export async function changePassword(payload, token) {
  return request('/auth/change-password', {
    method: 'PATCH',
    body: payload,
    token
  });
}

export async function getPatientCount(token) {
  const response = await request('/patients?page=1&pageSize=1', { token });
  return response?.pagination?.total ?? 0;
}

export async function getPatients({ page = 1, pageSize = 20, search = '' } = {}, token) {
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('pageSize', String(pageSize));
  if (search) {
    query.set('q', search);
    return request(`/patients/search?${query.toString()}`, { token });
  }
  return request(`/patients?${query.toString()}`, { token });
}

export async function createPatient(payload, token) {
  return request('/patients', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function updatePatient(id, payload, token) {
  return request(`/patients/${id}`, {
    method: 'PUT',
    body: payload,
    token
  });
}

export async function getEmployees(params = {}, token) {
  const query = new URLSearchParams();
  if (params.role) {
    query.set('role', params.role);
  }
  const search = query.toString();
  const path = `/employees${search ? `?${search}` : ''}`;
  return request(path, { token });
}

export async function getAppointments(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.date) {
    query.set('date', params.date);
  }
  if (params.patientId) {
    query.set('patientId', params.patientId);
  }
  if (params.doctorId) {
    query.set('doctorId', params.doctorId);
  }

  const path = `/appointments?${query.toString()}`;
  return request(path, { token });
}

export async function createAppointment(payload, token) {
  return request('/appointments', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function updateAppointment(id, payload, token) {
  return request(`/appointments/${id}`, {
    method: 'PUT',
    body: payload,
    token
  });
}

export async function updateAppointmentStatus(id, payload, token) {
  return request(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: payload,
    token
  });
}

export async function deleteAppointment(id, token) {
  return request(`/appointments/${id}`, {
    method: 'DELETE',
    token
  });
}

export async function getBilling(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  query.set('pageSize', params.pageSize ? String(params.pageSize) : '100');
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.patientId) {
    query.set('patientId', params.patientId);
  }

  const path = `/billing?${query.toString()}`;
  return request(path, { token });
}

export async function getOutstandingBilling(token) {
  return request('/billing/outstanding', { token });
}

export async function createBilling(payload, token) {
  return request('/billing', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function recordBillingPayment(id, payload, token) {
  return request(`/billing/${id}/payment`, {
    method: 'POST',
    body: payload,
    token
  });
}

export async function getPrescriptions(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  query.set('pageSize', params.pageSize ? String(params.pageSize) : '20');
  if (params.doctorId) {
    query.set('doctorId', params.doctorId);
  }
  if (params.patientId) {
    query.set('patientId', params.patientId);
  }
  if (params.dispensed !== undefined) {
    query.set('dispensed', String(params.dispensed));
  }

  return request(`/prescriptions?${query.toString()}`, { token });
}

export async function createPrescription(payload, token) {
  return request('/prescriptions', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function dispensePrescription(id, token) {
  return request(`/prescriptions/${id}/dispense`, {
    method: 'POST',
    token
  });
}

export async function getLabOrders(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  query.set('pageSize', params.pageSize ? String(params.pageSize) : '20');
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.patientId) {
    query.set('patientId', params.patientId);
  }
  if (params.orderedBy) {
    query.set('orderedBy', params.orderedBy);
  }
  return request(`/lab-orders?${query.toString()}`, { token });
}

export async function createLabOrder(payload, token) {
  return request('/lab-orders', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function updateLabOrderResult(id, payload, token) {
  return request(`/lab-orders/${id}/result`, {
    method: 'PUT',
    body: payload,
    token
  });
}

export async function getInventoryItems(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  query.set('pageSize', params.pageSize ? String(params.pageSize) : '25');
  if (params.category) {
    query.set('category', params.category);
  }
  if (params.name) {
    query.set('name', params.name);
  }
  return request(`/items?${query.toString()}`, { token });
}

export async function createInventoryItem(payload, token) {
  return request('/items', {
    method: 'POST',
    body: payload,
    token
  });
}

export async function adjustStock(itemId, payload, token) {
  return request(`/items/${itemId}/stock`, {
    method: 'POST',
    body: payload,
    token
  });
}

export async function getLowStockItems(token) {
  return request('/items/low-stock', { token });
}

export async function getExpiringItems(token) {
  return request('/items/expiring', { token });
}

export async function getNotificationsList(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  query.set('pageSize', params.pageSize ? String(params.pageSize) : '20');
  return request(`/notifications?${query.toString()}`, { token });
}

export async function markNotificationRead(id, token) {
  return request(`/notifications/${id}/read`, { method: 'PATCH', token });
}

export async function deleteNotification(id, token) {
  return request(`/notifications/${id}`, { method: 'DELETE', token });
}

export async function getAuditLogs(params = {}, token) {
  const query = new URLSearchParams();
  query.set('page', params.page ? String(params.page) : '1');
  query.set('pageSize', params.pageSize ? String(params.pageSize) : '50');
  if (params.userId) {
    query.set('userId', params.userId);
  }
  if (params.action) {
    query.set('action', params.action);
  }
  if (params.entityType) {
    query.set('entityType', params.entityType);
  }
  if (params.startDate) {
    query.set('startDate', params.startDate);
  }
  if (params.endDate) {
    query.set('endDate', params.endDate);
  }
  return request(`/audit-logs?${query.toString()}`, { token });
}
