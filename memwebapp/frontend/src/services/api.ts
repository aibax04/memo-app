// API service for Memo App (localhost backend)

import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_TIMEOUT = 180000; // Extended to 60 seconds (from 30) to give more time for chart generation
const TOKEN_EXPIRY_DAYS = 7; // Token will expire after 7 days

// Store token in memory and localStorage
let accessToken: string | null = localStorage.getItem('memoapp_access_token');

// Check if token has expired
const isTokenExpired = (): boolean => {
  const tokenTimestamp = localStorage.getItem('memoapp_token_timestamp');
  if (!tokenTimestamp) return true;

  const expiryTimeMs = parseInt(tokenTimestamp) + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTimeMs;
};

// If token exists but has expired, clear it
if (accessToken && isTokenExpired()) {
  console.log('🔒 Access token has expired, clearing token');
  accessToken = null;
  localStorage.removeItem('memoapp_access_token');
  localStorage.removeItem('memoapp_token_timestamp');
  localStorage.removeItem('memoapp_auth_data');
}

interface ApiOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

// Helper function to make authenticated API calls
export const callApi = async (
  endpoint: string,
  method: string = 'GET',
  body?: any,
  useAuth: boolean = true,
  contentType: string = 'application/json'
): Promise<any> => {
  // Check if token is expired before making the request
  if (useAuth && accessToken && isTokenExpired()) {
    console.log('🔒 Token expired before API call, clearing token');
    accessToken = null;
    localStorage.removeItem('memoapp_access_token');
    localStorage.removeItem('memoapp_token_timestamp');
    localStorage.removeItem('memoapp_auth_data');
    toast.error("Your session has expired. Please log in again.");
    window.location.href = '/login'; // Redirect to login
    return { error: "Authentication token expired" };
  }

  try {
    console.log(`🔹 API Call: ${method} ${API_BASE_URL}${endpoint}`);
    if (body) {
      console.log('Request Body:', body);
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const options: ApiOptions = {
      method,
      headers: {
        'Content-Type': contentType,
      },
      signal: controller.signal
    };

    // Add authorization header if token exists and useAuth is true
    if (useAuth && accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add body if provided
    if (body) {
      if (contentType === 'application/x-www-form-urlencoded') {
        // Convert JSON object to URL encoded string
        const formBody = Object.keys(body)
          .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(body[key]))
          .join('&');
        options.body = formBody;
      } else {
        options.body = JSON.stringify(body);
      }
    }

    console.log('Request options:', {
      url: `${API_BASE_URL}${endpoint}`,
      method: options.method,
      headers: options.headers,
      bodyPreview: options.body ? options.body.substring(0, 100) + '...' : 'No body'
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // Clear the timeout
    clearTimeout(timeoutId);

    console.log(`Response status: ${response.status}`);

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
      console.error('Authentication failed. Token may be expired.');
      localStorage.removeItem('memoapp_access_token');
      localStorage.removeItem('memoapp_token_timestamp');
      localStorage.removeItem('memoapp_auth_data');
      localStorage.removeItem('dashboardUser'); // Also clear the user data
      accessToken = null;

      // Use window.location.pathname to avoid infinite redirect loops
      if (window.location.pathname !== '/login') {
        toast.error("Authentication failed. Please log in again.");
        window.location.href = '/login'; // Redirect to login
      }
      return { error: "Authentication failed" };
    }

    let data;
    const contentTypeHeader = response.headers.get('content-type');
    if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        // Try to parse as JSON anyway
        data = JSON.parse(text);
      } catch (e) {
        // If parsing fails, return as text
        data = { text, status: response.status };
      }
    }

    console.log(`✅ API Response: ${method} ${endpoint}`, data);

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, data);
      return { error: data.detail || data || "API error occurred", status: response.status };
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error: ${method} ${endpoint}`, error);
    // Handle specific error types
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      return {
        error: "Failed to fetch",
        networkError: true,
        message: "Network error: Unable to connect to the server. Please check your internet connection."
      };
    }
    // Handle timeout errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        error: "Request timeout",
        networkError: true,
        message: "The request took too long to complete. The server might be busy processing other requests. Please try again in a moment."
      };
    }

    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      networkError: true,
      message: "An unexpected error occurred. Please try again."
    };
  }
};

// Authentication functions
export const loginUser = async (username: string, password: string): Promise<any> => {
  console.log('🔑 Attempting to login with username:', username);
  // Important: Use application/x-www-form-urlencoded for token endpoint
  const result = await callApi(
    '/token',
    'POST',
    { username, password },
    false,
    'application/x-www-form-urlencoded'
  );

  console.log('Login result:', result);

  if (result.access_token) {
    // Save token to memory and localStorage
    accessToken = result.access_token;
    localStorage.setItem('memoapp_access_token', result.access_token);
    // Store the timestamp when the token was obtained
    localStorage.setItem('memoapp_token_timestamp', Date.now().toString());
    // Sync to Chrome extension: extension reads memoapp_auth_data from this page
    const authData = {
      token: result.access_token,
      refreshToken: result.refresh_token || '',
    };
    localStorage.setItem('memoapp_auth_data', JSON.stringify(authData));

    console.log('🔑 User authenticated successfully with token:',
      result.access_token.substring(0, 10) + '...',
      `(expires in ${TOKEN_EXPIRY_DAYS} days)`
    );
    return result;
  }

  return { error: result.error || "Login failed" };
};

export const createUser = async (email: string, password: string, name?: string): Promise<any> => {
  console.log('👤 Creating new user with email:', email);
  const userData = { email, password };
  if (name) {
    Object.assign(userData, { name });
  }

  return await callApi('/users/', 'POST', userData, false);
};



// Helper function to check if we need to use Supabase fallback
export const isApiAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/healthcheck`);
    return response.ok;
  } catch (error) {
    console.warn('API appears to be unavailable, will use Supabase fallback', error);
    return false;
  }
};

// Clear token on logout
export const logout = (): void => {
  accessToken = null;
  localStorage.removeItem('memoapp_access_token');
  localStorage.removeItem('memoapp_token_timestamp');
  localStorage.removeItem('memoapp_auth_data');
  console.log('🔒 User logged out');
};
