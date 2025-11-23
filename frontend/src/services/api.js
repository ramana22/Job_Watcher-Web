// const API_BASE_URL =
//   process.env.REACT_APP_API_BASE_URL ||
//   (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
//     ? 'https://jobwatch-api-g6a3cjenesbna5gv.canadacentral-01.azurewebsites.net/'
//     : window.location.origin);

const API_BASE_URL = 'https://jobwatch-api-g6a3cjenesbna5gv.canadacentral-01.azurewebsites.net/'
// const API_BASE_URL = 'https://localhost:49682'
const TOKEN_STORAGE_KEY = 'jobWatcherAuthToken';
let inMemoryToken = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredToken() {
  if (!hasStorage()) {
    return inMemoryToken;
  }
  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) {
    inMemoryToken = stored;
  }
  return stored;
}

export function storeToken(token) {
  if (!hasStorage()) return;

  try {
    console.log("Saving token:", token);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    console.log("Token stored in localStorage:", window.localStorage.getItem(TOKEN_STORAGE_KEY));
  } catch (err) {
    console.error("Failed to store token:", err);
  }
}


export function clearStoredToken() {
  if (!hasStorage()) {
    inMemoryToken = null;
    return;
  }
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  inMemoryToken = null;
}

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

async function request(path, options = {}, fallbackMessage) {
  const { method = 'GET', headers, body, includeAuth = true } = options;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const requestHeaders = new Headers(headers ?? {});
  const init = { method, headers: requestHeaders };

  if (includeAuth) {
    const token = getStoredToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else if (typeof body === 'string') {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      requestHeaders.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, init);

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(response.status === 401 ? 'Unauthorized' : 'Forbidden', response.status);
  }

  if (!response.ok) {
    let message = fallbackMessage ?? `Request failed with status ${response.status}`;
    try {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = await response.json();
        if (payload) {
          if (typeof payload === 'string') {
            message = payload;
          } else if (typeof payload.message === 'string') {
            message = payload.message;
          }
        }
      } else {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
    } catch (error) {
      console.error(error);
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return null;
  }

  const responseContentType = response.headers.get('content-type') ?? '';
  if (responseContentType.includes('application/json')) {
    return response.json();
  }

  return null;
}

export function getApplications(filters) {
  const query = toQueryString(filters);
  return request(`/api/applications${query ? `?${query}` : ''}`, {}, 'Unable to load applications.');
}

export function getApplicationKeywords() {
  return request('/api/applications/keywords', {}, 'Unable to load keywords.');
}

export function getResume() {
  return request('/api/resume', {}, 'Unable to load resume details.');
}

export function uploadResume(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request(
    '/api/resume',
    { method: 'POST', body: formData },
    'Failed to upload resume. Ensure the file is a UTF-8 text document.',
  );
}

export function markApplicationAsApplied(id) {
  return request(`/api/applications/${id}/apply`, { method: 'POST' }, 'Unable to mark application as applied.');
}

export function getCompanies() {
  return request('/api/companies', {}, 'Unable to load companies.');
}

export function login(credentials) {
  return request('/api/auth/login', { method: 'POST', body: credentials, includeAuth: false }, 'Invalid username or password.');
}

export function register(credentials) {
  return request('/api/auth/register', { method: 'POST', body: credentials, includeAuth: false }, 'Unable to register user.');
}
