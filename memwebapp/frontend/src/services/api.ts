// API service for OWNnote (localhost backend)

import { toast } from "sonner";

// Use VITE_API_URL if set (empty string = same origin for nginx proxy in production)
const API_BASE_URL =
  (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== null)
    ? String(import.meta.env.VITE_API_URL)
    : (import.meta.env.DEV ? "http://localhost:8000" : "");
const API_TIMEOUT = 180000; // Extended to 60 seconds (from 30) to give more time for chart generation
const TOKEN_EXPIRY_DAYS = 7; // Token will expire after 7 days

// Store token in memory and localStorage
let accessToken: string | null = localStorage.getItem('ownnote_access_token');

// Check if token has expired
const isTokenExpired = (): boolean => {
  const tokenTimestamp = localStorage.getItem('ownnote_token_timestamp');
  if (!tokenTimestamp) return true;

  const expiryTimeMs = parseInt(tokenTimestamp) + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTimeMs;
};

// If token exists but has expired, clear it
if (accessToken && isTokenExpired()) {
  console.log('🔒 Access token has expired, clearing token');
  accessToken = null;
  localStorage.removeItem('ownnote_access_token');
  localStorage.removeItem('ownnote_token_timestamp');
  localStorage.removeItem('ownnote_auth_data');
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
  // If auth is required but no token exists, redirect to login immediately
  if (useAuth && !accessToken) {
    console.warn('🚫 No access token found, skipping meetings fetch');
    return { error: "No authentication token", networkError: false };
  }

  // Check if token is expired before making the request
  if (useAuth && accessToken && isTokenExpired()) {
    console.log('🔒 Token expired before API call, clearing token');
    accessToken = null;
    localStorage.removeItem('ownnote_access_token');
    localStorage.removeItem('ownnote_token_timestamp');
    localStorage.removeItem('ownnote_auth_data');
    localStorage.removeItem('dashboardUser');
    localStorage.removeItem('ownnote_pro');
    toast.error("Your session has expired. Please log in again.");
    try { window.dispatchEvent(new Event('ownnote_pro_updated')); } catch (_) {}
    setTimeout(() => { window.location.replace('/login'); }, 100);
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

    // 401: invalid/expired token — clear session. 403: permission/plan (e.g. Pro-only) — return error, do not log out.
    if (response.status === 401) {
      console.error(`Authentication failed (${response.status}). Token may be expired or invalid.`);
      localStorage.removeItem('ownnote_access_token');
      localStorage.removeItem('ownnote_token_timestamp');
      localStorage.removeItem('ownnote_auth_data');
      localStorage.removeItem('dashboardUser');
      localStorage.removeItem('ownnote_pro');
      accessToken = null;
      toast.error("Session expired. Please log in again.");
      // Use soft redirect so React can unmount cleanly (avoids white-screen crash)
      try { window.dispatchEvent(new Event('ownnote_pro_updated')); } catch (_) {}
      setTimeout(() => { window.location.replace('/login'); }, 100);
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
      let errMsg: string;
      if (typeof data?.detail === 'string') {
        errMsg = data.detail;
      } else if (Array.isArray(data?.detail)) {
        errMsg = data.detail
          .map((d: { msg?: string; loc?: string[] }) => d?.msg || JSON.stringify(d))
          .filter(Boolean)
          .join('. ') || `Request failed (${response.status})`;
      } else if (typeof data?.error === 'string') {
        errMsg = data.error;
      } else if (typeof data?.message === 'string') {
        errMsg = data.message;
      } else {
        errMsg = `Request failed (${response.status})`;
      }
      return { error: errMsg, status: response.status };
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
    localStorage.setItem('ownnote_access_token', result.access_token);
    // Store the timestamp when the token was obtained
    localStorage.setItem('ownnote_token_timestamp', Date.now().toString());
    // Sync to Chrome extension: extension reads ownnote_auth_data from this page
    const authData = {
      token: result.access_token,
      refreshToken: result.refresh_token || '',
    };
    localStorage.setItem('ownnote_auth_data', JSON.stringify(authData));

    console.log('🔑 User authenticated successfully with token:',
      result.access_token.substring(0, 10) + '...',
      `(expires in ${TOKEN_EXPIRY_DAYS} days)`
    );

    // Save pro status from server
    if (result.is_pro !== undefined) {
      localStorage.setItem('ownnote_pro', result.is_pro ? 'true' : 'false');
      window.dispatchEvent(new Event('ownnote_pro_updated'));
    }

    return result;
  }

  return { error: result.error || "Login failed" };
};

/** Self-service signup — creates User in DB (auth_provider=self_service). Same table as admin-created users. */
export const registerUser = async (
  email: string,
  password: string,
  name: string
): Promise<{ id: number; name: string; email: string } | { error: string }> => {
  const result = await callApi(
    '/api/v1/web/users/',
    'POST',
    { email: email.trim(), password, name: name.trim() || undefined },
    false
  );

  if (result?.error) {
    const err = result.error;
    const msg = typeof err === 'string' ? err : 'Registration failed';
    return { error: msg };
  }

  if (result?.id != null && result?.email) {
    return {
      id: result.id,
      name: result.name || result.email.split('@')[0],
      email: result.email,
    };
  }

  return { error: 'Registration failed' };
};

export const getProStatus = async (): Promise<{ is_pro: boolean }> => {
  return await callApi('/api/v1/web/pro-status', 'GET');
};

export const activatePro = async (promoCode: string): Promise<any> => {
  try {
    const result = await callApi('/api/v1/web/activate-pro', 'POST', { promo_code: promoCode });
    if (result && result.status === 'ok' && !result.error) {
      localStorage.setItem('ownnote_pro', 'true');
      window.dispatchEvent(new Event('ownnote_pro_updated'));
      return { success: true, ...result };
    }
    const errMsg = typeof result?.error === 'string' ? result.error : 'Failed to activate Pro';
    return { error: errMsg };
  } catch (e: any) {
    return { error: e.message || 'Network error during Pro activation' };
  }
};

export const revokePro = async (): Promise<any> => {
  try {
    const result = await callApi('/api/v1/web/revoke-pro', 'POST');
    if (result && result.status === 'ok' && !result.error) {
      localStorage.setItem('ownnote_pro', 'false');
      window.dispatchEvent(new Event('ownnote_pro_updated'));
      return { success: true, ...result };
    }
    const errMsg = typeof result?.error === 'string' ? result.error : 'Failed to revoke Pro';
    return { error: errMsg };
  } catch (e: any) {
    return { error: e.message || 'Network error during Pro revocation' };
  }
};

export const createUser = async (email: string, password: string, name?: string): Promise<any> => {
  console.log('👤 Creating new user with email:', email);
  const userData = { email, password };
  if (name) {
    Object.assign(userData, { name });
  }

  return await callApi('/users/', 'POST', userData, false);
};

// Dashboard functions
export const createDashboard = async (title: string, description?: string): Promise<any> => {
  console.log('📊 Creating new dashboard:', title);
  const response = await callApi('/dashboards/', 'POST', { title, description });

  // Log the response for debugging
  console.log('Dashboard creation response:', response);

  if (response && !response.error) {
    // Ensure we have a valid dashboard ID
    const dashboardId = response.id || response.dashboard_id;

    if (!dashboardId) {
      console.warn('Dashboard created but no ID returned from API');
    } else {
      console.log(`Dashboard created successfully with ID: ${dashboardId}`);
    }
  }

  return response;
};

export const getDashboards = async (): Promise<any> => {
  console.log('📋 Fetching all dashboards');
  return await callApi('/dashboards/');
};

export const getDashboard = async (dashboardId: string | number, page: number = 1, limit: number = 6): Promise<any> => {
  console.log(`📊 Fetching dashboard with ID: ${dashboardId}`);

  try {
    const response = await callApi(`/dashboards/${dashboardId}`);

    // Log the complete response for debugging
    console.log('getDashboard raw response:', JSON.stringify(response).substring(0, 500) + '...');

    // Make sure to handle both the dashboard data and its charts
    if (!response.error && response) {
      // Get charts for this dashboard if they're not included in the response
      const chartsAPiResponse = await getDashboardCharts(dashboardId, page, limit);
      if (!response.charts || !Array.isArray(response.charts)) {
        console.log("Charts not found in response, fetching charts separately");
        const chartsResponse = chartsAPiResponse.charts;
        const totalPages = chartsAPiResponse.totalPages;
        if (!chartsResponse.error && Array.isArray(chartsResponse)) {
          response.charts = chartsResponse.map(chart => {
            // Process chart data to match the expected format in frontend
            let chartData = {};

            // Extract data from the API response format
            if (chart.config?.data?.data?.datasets) {
              chartData = chart.config.data;
            } else if (chart.config?.data?.datasets) {
              chartData = chart.config.data;
            } else if (chart.config?.data) {
              chartData = { data: chart.config.data };
            }

            return {
              id: chart.id?.toString() || '',
              name: chart.title || '',
              prompt: chart.config?.query || '',
              type: chart.chart_type || 'bar',
              data: chartData,
              createdAt: chart.created_at || new Date().toISOString(),
              bookmark: chart.bookmark || false,
              sql: chart.config?.sql || '',
              geminiDirectResponse: chart.config?.geminiResponse || null,
            };
          });
          console.log(`✅ Fetched ${chartsResponse.length} charts for dashboard ${dashboardId}`);
        } else {
          console.error("❌ Error fetching charts:", chartsResponse.error || "Unknown error");
          // Initialize with empty array if chart fetch fails
          response.charts = [];
        }
      } else if (Array.isArray(response.charts)) {
        // Process chart data if it's already in the response
        response.charts = response.charts.map(chart => {
          let chartData = {};

          // Extract data from the API response format
          if (chart.config?.data?.data?.datasets) {
            chartData = chart.config.data;
          } else if (chart.config?.data?.datasets) {
            chartData = chart.config.data;
          } else if (chart.config?.data) {
            chartData = { data: chart.config.data };
          }

          return {
            id: chart.id?.toString() || '',
            name: chart.title || '',
            prompt: chart.config?.query || '',
            type: chart.chart_type || 'bar',
            data: chartData,
            createdAt: chart.created_at || new Date().toISOString(),
            bookmark: chart.bookmark || false,
            sql: chart.config?.sql || '',
            geminiDirectResponse: chart.config?.geminiResponse || null
          };
        });
        console.log(`✅ Dashboard includes ${response.charts.length} charts`);
      }

      // Always ensure charts property exists
      if (!response.charts) {
        response.charts = [];
      }

      // Return the full dashboard object with charts
      return {
        id: response.id || dashboardId,
        name: response.title || '',
        description: response.description || '',
        totalPages: chartsAPiResponse.total_pages,
        updatedAt: response.updated_at || new Date().toISOString(),
        charts: response.charts || []
      };
    }

    return {
      error: response.error || "Failed to fetch dashboard",
      charts: [] // Always provide empty charts array even on error
    };
  } catch (error) {
    console.error("❌ Error in getDashboard:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error in getDashboard",
      charts: [] // Always provide empty charts array even on error
    };
  }
};

export const updateDashboard = async (dashboardId: string | number, title: string, description?: string): Promise<any> => {
  console.log(`🔄 Updating dashboard with ID: ${dashboardId}`);
  return await callApi(`/dashboards/${dashboardId}`, 'PUT', { title, description });
};

export const deleteDashboard = async (dashboardId: string | number): Promise<any> => {
  console.log(`🗑️ Deleting dashboard with ID: ${dashboardId}`);
  return await callApi(`/dashboards/${dashboardId}`, 'DELETE');
};

// Chart functions
export const getDashboardCharts = async (dashboardId: string | number, page: number = 1, limit: number = 6): Promise<any> => {
  console.log(`📈 Fetching charts for dashboard ID: ${dashboardId}`);
  const response = await callApi(`/dashboards/${dashboardId}/charts?page=${page}&limit=${limit}`);
  console.log(response);
  if (Array.isArray(response.charts)) {
    console.log(`✅ Charts fetched via API:`, response.charts);
    return response;
  }
  return { error: response.error || "Failed to fetch charts", charts: [] };
};

export const getChart = async (chartId: string | number): Promise<any> => {
  console.log(`📈 Fetching chart with ID: ${chartId}`);
  return await callApi(`/charts/${chartId}`);
};

export const createChart = async (
  dashboardId: string | number,
  title: string,
  chartType: string,
  config: any
): Promise<any> => {
  console.log(`📊 Creating new chart for dashboard ID: ${dashboardId}`);
  return await callApi('/charts/', 'POST', {
    dashboard_id: dashboardId,
    title,
    chart_type: chartType,
    config
  });
};

export const generateChart = async (
  dashboard_id: number | string,
  title: string,
  prompt: string,
  filters: string[] = [],
  dataSource: string = "dishtv"
): Promise<any> => {
  console.log(`🔮 Generating chart with prompt: "${prompt}"`);
  try {
    return await callApi('/generate_chart', 'POST', {
      dashboard_id,
      title,
      prompt,
      filters,
      dataSource
    });
  } catch (error) {
    console.error('Chart generation error:', error);
    return {
      error: error instanceof Error ? error.message : "Failed to generate chart",
      networkError: true,
      message: "We couldn't connect to the chart generation service. Please try again in a moment."
    };
  }
};

export const updateChart = async (
  chartId: string | number,
  title: string,
  chartType: string,
  config: any,
  dashboardId?: string | number
): Promise<any> => {
  console.log(`🔄 Updating chart with ID: ${chartId} to type: ${chartType}`);

  const requestBody: any = {
    title,
    chart_type: chartType,
    config
  };

  // Add dashboard_id if provided
  if (dashboardId) {
    requestBody.dashboard_id = dashboardId;
  }

  return await callApi(`/charts/${chartId}`, 'PUT', requestBody);
};

export const deleteChart = async (chartId: string | number): Promise<any> => {
  console.log(`🗑️ Deleting chart with ID: ${chartId}`);
  return await callApi(`/charts/${chartId}`, 'DELETE');
};

// New function to get call records for a specific chart and label
export const getCallRecordsByChart = async (
  chartId: string | number,
  label: string[],
  page: number = 1,
  limit: number = 6,
): Promise<any> => {
  console.log(`📞 🚀 MAKING API CALL: Fetching call records for chart ${chartId}, label: "${label} and page ${page}"`);
  console.log(`📞 🌐 FULL URL: ${API_BASE_URL}/call-records/chart/${chartId}?label=${encodeURIComponent(label[0])}&page=${page}&limit=${limit}`);

  // Construct query parameters
  const queryParams = new URLSearchParams();
  label.forEach(l => queryParams.append('label', l));
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const endpoint = `/call-records/chart/${chartId}?${queryParams}`;
  console.log(`📞 📡 CALLING ENDPOINT: ${endpoint}`);

  const result = await callApi(endpoint, 'POST', label);
  console.log(`📞 ✅ API RESPONSE RECEIVED:`, result);

  return result;
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
  localStorage.removeItem('ownnote_access_token');
  localStorage.removeItem('ownnote_token_timestamp');
  localStorage.removeItem('ownnote_auth_data');
  localStorage.removeItem('ownnote_pro');
  window.dispatchEvent(new Event('ownnote_pro_updated'));
  console.log('🔒 User logged out');
};
