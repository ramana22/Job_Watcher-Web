const API_BASE_URL =
  window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:5000'
    : window.location.origin;

function toQueryString(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.set(key, value);
    } else if (key === 'status' || key === 'sort') {
      params.set(key, value);
    }
  });
  return params.toString();
}

async function getJson(response, fallbackMessage) {
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }
  return null;
}

export async function getApplications(filters) {
  const query = toQueryString(filters);
  const url = `${API_BASE_URL}/api/applications${query ? `?${query}` : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to load applications.');
  }
  return getJson(response, 'Unable to load applications.');
}

export async function getApplicationKeywords() {
  const response = await fetch(`${API_BASE_URL}/api/applications/keywords`);
  if (!response.ok) {
    throw new Error('Unable to load keywords.');
  }
  return getJson(response, 'Unable to load keywords.');
}

export async function getResume() {
  const response = await fetch(`${API_BASE_URL}/api/resume`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Unable to load resume details.');
  }
  return getJson(response, 'Unable to load resume details.');
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/resume`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload resume. Ensure the file is a UTF-8 text document.');
  }
  return getJson(response, 'Failed to upload resume.');
}

export async function markApplicationAsApplied(id) {
  const response = await fetch(`${API_BASE_URL}/api/applications/${id}/apply`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Unable to mark application as applied.');
  }
}

export async function getCompanies() {
  const response = await fetch(`${API_BASE_URL}/api/companies`);
  if (!response.ok) {
    throw new Error('Unable to load companies.');
  }
  return getJson(response, 'Unable to load companies.');
}
