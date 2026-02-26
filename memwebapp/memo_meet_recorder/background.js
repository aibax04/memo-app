/**
 * Memo App Meeting Recorder - Background Service Worker
 * Production-grade service worker for recording Google Meet and Teams meetings
 * Features: WebSocket streaming, auto-reconnect, token management, template caching
 */

// ============================================================================
// IMPORTS & CONFIGURATION
// ============================================================================

// Note: In Chrome extensions, we can't use ES6 imports
// Config and utils should be loaded via script tags in manifest.json
// For now, we'll define constants inline but organized

const CONFIG = {
  TOKEN_MIN_HOURS: 2,
  RECORDING_STATE_TIMEOUT: 300000,
  KEEP_ALIVE_INTERVAL: 20000,
  // HTTP Streaming Config
  UPLOAD_MAX_RETRIES: 3,
  UPLOAD_RETRY_DELAY: 1000,
  API_TIMEOUT: 10000
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  isRecording: false,
  currentTabId: null,
  recordingStartTime: null,
  meetingDetails: null,
  meetingId: null,
  // HTTP Streaming State
  isUploading: false,
  micBuffer: [],
  tabBuffer: [],
  uploadInterval: null
};


// STORAGE HELPERS
// ============================================================================

const Storage = {
  PREF_PREFIX: 'pref_',
  AUTH_KEY: 'memoapp_auth_data',
  STATE_KEY: 'recording_state',

  async savePreference(key, value) {
    try {
      await chrome.storage.local.set({
        [`${this.PREF_PREFIX}${key}`]: { value, updatedAt: Date.now() }
      });
    } catch (error) {
      console.error('[Background] Error saving preference:', error);
    }
  },

  async getPreference(key) {
    try {
      const result = await chrome.storage.local.get([`${this.PREF_PREFIX}${key}`]);
      return result[`${this.PREF_PREFIX}${key}`]?.value || null;
    } catch (error) {
      console.error('[Background] Error getting preference:', error);
      return null;
    }
  },

  async saveState() {
    try {
      await chrome.storage.local.set({
        [this.STATE_KEY]: {
          isRecording: state.isRecording,
          currentTabId: state.currentTabId,
          recordingStartTime: state.recordingStartTime,
          meetingDetails: state.meetingDetails,
          meetingId: state.meetingId,
          lastUpdated: Date.now()
        }
      });
    } catch (error) {
      console.error('[Background] Error saving state:', error);
    }
  },

  async loadState() {
    try {
      const result = await chrome.storage.local.get([this.STATE_KEY]);
      if (result[this.STATE_KEY]) {
        const saved = result[this.STATE_KEY];
        const isRecent = Date.now() - saved.lastUpdated < CONFIG.RECORDING_STATE_TIMEOUT;

        if (saved.isRecording && isRecent) {
          Object.assign(state, {
            isRecording: saved.isRecording,
            currentTabId: saved.currentTabId,
            recordingStartTime: saved.recordingStartTime,
            meetingDetails: saved.meetingDetails,
            meetingId: saved.meetingId
          });
          console.log('[Background] Restored recording state (Meeting ID: ' + saved.meetingId + ')');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('[Background] Error loading state:', error);
      return false;
    }
  },

  async clearState() {
    try {
      await chrome.storage.local.remove([this.STATE_KEY]);
    } catch (error) {
      console.error('[Background] Error clearing state:', error);
    }
  }
};

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

const Auth = {
  // Refresh lock to prevent concurrent refresh attempts
  _refreshPromise: null,
  _refreshLock: false,

  async getData() {
    try {
      const result = await chrome.storage.local.get([Storage.AUTH_KEY]);
      let authData = result[Storage.AUTH_KEY];

      // Handle legacy string format or corrupted data
      if (typeof authData === 'string') {
        try {
          authData = JSON.parse(authData);
        } catch (e) {
          console.warn('[Background] Failed to parse auth data string, clearing');
          await this.clearData();
          return null;
        }
      }

      // Validate auth data structure
      if (authData && typeof authData !== 'object') {
        console.warn('[Background] Invalid auth data format, clearing');
        await this.clearData();
        return null;
      }

      return authData;
    } catch (error) {
      console.error('[Background] Error getting auth data:', error);
      return null;
    }
  },

  async setData(data) {
    try {
      // Ensure data is always stored as an object
      if (!data || typeof data !== 'object') {
        console.error('[Background] Invalid auth data to save');
        return;
      }

      await chrome.storage.local.set({ [Storage.AUTH_KEY]: data });
    } catch (error) {
      console.error('[Background] Error setting auth data:', error);
    }
  },

  async clearData() {
    try {
      await chrome.storage.local.remove([Storage.AUTH_KEY]);
      // Clear refresh lock when clearing auth
      this._refreshPromise = null;
      this._refreshLock = false;
    } catch (error) {
      console.error('[Background] Error clearing auth data:', error);
    }
  },

  decodeTokenExpiry(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch (error) {
      console.error('[Background] Error decoding token:', error);
      return null;
    }
  },

  isTokenValid(token, minValidityHours = null) {
    if (!token) return false;

    const expiry = this.decodeTokenExpiry(token);
    if (!expiry) return false;

    // Use provided min validity or default from config
    const minValidityMs = (minValidityHours || CONFIG.TOKEN_MIN_HOURS) * 60 * 60 * 1000;
    const timeUntilExpiry = expiry - Date.now();

    // Token is valid if it has at least minValidityMs remaining
    return timeUntilExpiry > minValidityMs;
  },

  async refreshIfNeeded(forceRefresh = false) {
    // If already refreshing, wait for that promise
    if (this._refreshPromise && !forceRefresh) {
      console.log('[Background] Token refresh already in progress, waiting...');
      return await this._refreshPromise;
    }

    // Create refresh promise with lock
    this._refreshPromise = (async () => {
      // Check lock to prevent concurrent execution
      if (this._refreshLock) {
        console.log('[Background] Refresh lock active, waiting...');
        // Wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this._refreshLock) {
          return null;
        }
      }

      this._refreshLock = true;

      try {
        const authData = await this.getData();

        if (!authData?.token) {
          console.log('[Background] No token available');
          return null;
        }

        // Check if token is valid (unless forcing refresh)
        if (!forceRefresh && this.isTokenValid(authData.token)) {
          console.log('[Background] Token is valid');
          return authData.token;
        }

        // Check if token is expired (not just low on validity)
        const tokenExpiry = this.decodeTokenExpiry(authData.token);
        const isExpired = tokenExpiry && tokenExpiry <= Date.now();

        if (!forceRefresh && !isExpired && this.isTokenValid(authData.token, 0.5)) {
          // Token has at least 30 minutes left, no need to refresh yet
          console.log('[Background] Token still has sufficient validity');
          return authData.token;
        }

        console.log('[Background] Token needs refresh', isExpired ? '(expired)' : '(low validity)');

        if (!authData.refreshToken) {
          console.error('[Background] No refresh token available');
          // Only clear if token is actually expired
          if (isExpired) {
            await this.clearData();
          }
          return null;
        }

        const apiUrl = await this.getApiBaseUrl();
        const refreshUrl = `${apiUrl}/api/v1/web/auth/refresh`;

        console.log('[Background] Attempting token refresh...');

        // Create AbortController for timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout

        let response;
        try {
          response = await fetch(refreshUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: authData.refreshToken }),
            signal: abortController.signal
          });
          clearTimeout(timeoutId);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          // Handle network errors separately
          if (fetchError.name === 'AbortError' || fetchError.name === 'AbortSignal') {
            console.error('[Background] Token refresh request timed out');
          } else if (fetchError.name === 'TypeError' && (fetchError.message.includes('fetch') || fetchError.message.includes('network'))) {
            console.error('[Background] Network error during token refresh:', fetchError.message);
          } else {
            console.error('[Background] Error during token refresh request:', fetchError);
          }

          // Don't clear auth data on network errors - might be temporary
          // Only clear if token is expired
          if (isExpired) {
            console.warn('[Background] Token expired and refresh failed, clearing auth');
            await this.clearData();
          }
          return null;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[Background] Token refresh failed:', response.status, errorText);

          // Only clear auth data on 401 (unauthorized) - refresh token is invalid
          // For other errors (500, 503, etc.), keep auth data and retry later
          if (response.status === 401 || response.status === 403) {
            console.warn('[Background] Refresh token invalid, clearing auth data');
            await this.clearData();
          } else {
            console.warn('[Background] Server error during refresh, keeping auth data for retry');
          }
          return null;
        }

        const tokenData = await response.json();

        // Validate response structure
        if (!tokenData || !tokenData.access_token) {
          console.error('[Background] Invalid refresh response: missing access_token');
          return null;
        }

        // Calculate expiry from both JWT and expires_in
        const jwtExpiry = this.decodeTokenExpiry(tokenData.access_token);
        const expiresInMs = tokenData.expires_in ? tokenData.expires_in * 1000 : null;

        // Use the earlier expiry time to be safe
        let calculatedExpiry = null;
        if (jwtExpiry && expiresInMs) {
          const expiresInExpiry = Date.now() + expiresInMs;
          calculatedExpiry = Math.min(jwtExpiry, expiresInExpiry);
        } else if (jwtExpiry) {
          calculatedExpiry = jwtExpiry;
        } else if (expiresInMs) {
          calculatedExpiry = Date.now() + expiresInMs;
        }

        const updatedAuthData = {
          ...authData,
          token: tokenData.access_token,
          tokenExpiry: calculatedExpiry,
          lastUpdated: Date.now()
        };

        await this.setData(updatedAuthData);
        console.log('[Background] Token refreshed successfully', calculatedExpiry ? `(expires: ${new Date(calculatedExpiry).toISOString()})` : '');

        return tokenData.access_token;

      } catch (error) {
        console.error('[Background] Unexpected error refreshing token:', error);
        // Don't clear auth data on unexpected errors - might be recoverable
        return null;
      } finally {
        this._refreshLock = false;
      }
    })();

    try {
      return await this._refreshPromise;
    } finally {
      // Clear the promise after a delay to allow concurrent calls to wait
      setTimeout(() => {
        this._refreshPromise = null;
      }, 1000);
    }
  },

  async getApiBaseUrl() {
    try {
      const stored = await chrome.storage.local.get(['api_base_url']);
      return stored.api_base_url || 'https://ext.makememo.ai';
    } catch (error) {
      return 'https://ext.makememo.ai';
    }
  }
};


// ============================================================================
// OFFSCREEN DOCUMENT MANAGEMENT
// ============================================================================

async function ensureOffscreenDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDoc = existingContexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');

    if (!offscreenDoc) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Recording tab audio via tabCapture API'
      });
      console.log('[Background] Created offscreen document');
    }
  } catch (error) {
    console.error('[Background] Error creating offscreen document:', error);
    throw error;
  }
}

// ============================================================================
// WEBSOCKET MANAGEMENT
// ============================================================================

// ... (existing code)

// ============================================================================
// API HELPERS
// ============================================================================

async function createMeetingInBackend() {
  try {
    const token = await Auth.refreshIfNeeded();
    if (!token) throw new Error('Not authenticated');

    // Construct the correct URL for the init endpoint
    // The router is mounted at /api/v1/web/ws, and the endpoint is /init
    // So the full URL is /api/v1/web/ws/init
    const apiUrl = await Auth.getApiBaseUrl();
    const initUrl = `${apiUrl}/api/v1/web/stream/init`;

    console.log('[Background] Initializing meeting via API:', initUrl);

    const response = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(state.meetingDetails)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.id; // Assuming response has 'id' field

  } catch (error) {
    console.error('[Background] Error creating meeting:', error);
    throw error;
  }
}

// ... (existing code)

// ============================================================================
// HTTP STREAMING HELPERS
// ============================================================================

async function uploadDualChunk(micBlob, tabBlob) {
  try {
    const token = await Auth.refreshIfNeeded();
    if (!token) throw new Error('Not authenticated');

    const apiUrl = await Auth.getApiBaseUrl();
    const timestamp = Date.now();
    // Path param for meeting_id
    const url = `${apiUrl}/api/v1/web/stream/chunk/${state.meetingId}`;

    const formData = new FormData();
    formData.append('timestamp', timestamp.toString());

    if (micBlob && micBlob.size > 0) {
      formData.append('mic_audio', micBlob, `mic_${timestamp}.webm`);
    }

    if (tabBlob && tabBlob.size > 0) {
      formData.append('tab_audio', tabBlob, `tab_${timestamp}.webm`);
    }

    // If no audio to upload, skip
    if (!formData.has('mic_audio') && !formData.has('tab_audio')) {
      return true;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Content-Type header is set automatically by fetch for FormData
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error(`[Background] Error uploading dual chunk:`, error);
    return false;
  }
}

async function finalizeMeeting() {
  try {
    const token = await Auth.refreshIfNeeded();
    if (!token) return false;

    const apiUrl = await Auth.getApiBaseUrl();
    const url = `${apiUrl}/api/v1/web/stream/finalize/${state.meetingId}`;

    console.log('[Background] Finalizing meeting...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error(`[Background] Finalize failed: ${response.status}`);
      return false;
    }
    console.log('[Background] Meeting finalized successfully');
    return true;
  } catch (error) {
    console.error('[Background] Error finalizing meeting:', error);
    return false;
  }
}





// ============================================================================
// DUAL STREAM BUFFER MANAGEMENT
// ============================================================================

function startDualStreamUploadLoop() {
  if (state.uploadInterval) clearInterval(state.uploadInterval);

  console.log('[Background] Starting dual-stream upload loop (5s interval)');

  state.uploadInterval = setInterval(async () => {
    if (!state.isRecording || !state.meetingId) return;

    await flushBuffers();

  }, 5000); // 5 seconds
}

function stopDualStreamUploadLoop() {
  if (state.uploadInterval) {
    clearInterval(state.uploadInterval);
    state.uploadInterval = null;
  }
}

async function flushBuffers() {
  // Snapshot and clear buffers immediately to capture current data
  const currentMic = [...state.micBuffer];
  const currentTab = [...state.tabBuffer];

  state.micBuffer = [];
  state.tabBuffer = [];

  if (currentMic.length === 0 && currentTab.length === 0) return;

  console.log(`[Background] Flushing buffers: Mic=${currentMic.length}, Tab=${currentTab.length}`);

  let micBlob = null;
  if (currentMic.length > 0) {
    micBlob = new Blob(currentMic, { type: 'audio/webm' });
  }

  let tabBlob = null;
  if (currentTab.length > 0) {
    tabBlob = new Blob(currentTab, { type: 'audio/webm' });
  }

  await uploadDualChunk(micBlob, tabBlob);
}





// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

async function startRecording(tabId, meetingDetails) {
  if (state.isRecording) {
    console.log('[Background] Already recording');
    return { success: false, error: 'Already recording' };
  }

  try {
    console.log('[Background] Starting recording for tab:', tabId);

    // Verify tab exists and is a meeting page
    const tab = await chrome.tabs.get(tabId);
    const isMeetingTab = tab.url?.includes('meet.google.com') ||
      tab.url?.includes('teams.microsoft.com') ||
      tab.url?.includes('teams.live.com') ||
      tab.url?.includes('zoom.us') ||
      tab.url?.includes('zoom.com');

    if (!isMeetingTab) {
      return { success: false, error: 'Not a supported meeting page' };
    }

    // Detect platform
    let platform = 'teams'; // Default
    if (tab.url.includes('meet.google.com')) {
      platform = 'google_meet';
    } else if (tab.url.includes('zoom.us') || tab.url.includes('zoom.com')) {
      platform = 'zoom';
    }

    // Update state
    state.isRecording = true;
    state.currentTabId = tabId;
    state.recordingStartTime = Date.now();
    state.meetingDetails = { ...meetingDetails, platform };

    // Save template preference if selected
    if (meetingDetails?.templateId) {
      await Storage.savePreference('lastTemplateId', meetingDetails.templateId);
    }

    // Reset streaming state
    state.micBuffer = [];
    state.tabBuffer = [];
    state.isUploading = false;
    state.meetingId = null;

    // Create meeting via API to get ID and init recording status
    try {
      const meetingId = await createMeetingInBackend();
      state.meetingId = meetingId;
      console.log('[Background] Created meeting via API:', meetingId);

      // Notify popup about meeting creation success
      notifyPopup('MEETING_CREATED', { success: true, meetingId });
    } catch (e) {
      console.error('[Background] Failed to create meeting via API:', e);
      await resetState();
      return { success: false, error: 'Failed to create meeting on server: ' + e.message };
    }

    // Start tab audio capture via offscreen document
    await startTabCapture(tabId);

    // Tell content script to start microphone recording
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'START_MIC_RECORDING' });
    } catch (error) {
      console.warn('[Background] Could not send to content script, injecting...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await new Promise(r => setTimeout(r, 500));
        await chrome.tabs.sendMessage(tabId, { action: 'START_MIC_RECORDING' });
      } catch (injectError) {
        console.error('[Background] Failed to inject content script:', injectError);
      }
    }

    await Storage.saveState();
    startKeepAlive();
    startDualStreamUploadLoop();

    console.log('[Background] Recording started successfully');
    return { success: true };

  } catch (error) {
    console.error('[Background] Error starting recording:', error);
    await resetState();
    return { success: false, error: error.message || 'Failed to start recording' };
  }
}

async function resetState() {
  Object.assign(state, {
    isRecording: false,
    currentTabId: null,
    recordingStartTime: null,
    meetingDetails: null,
    meetingId: null,
    meetingId: null,
    micBuffer: [],
    tabBuffer: [],
    isUploading: false
  });
  await Storage.clearState();
}

async function stopRecording(autoUpload = false) {
  if (!state.isRecording) {
    console.log('[Background] Not recording');
    return { success: false, error: 'Not recording' };
  }

  try {
    console.log('[Background] Stopping recording...');

    // Mark as not recording immediately to prevent new chunks
    state.isRecording = false;

    // Stop keep alive first
    stopKeepAlive();

    // Stop audio capture
    await stopTabCapture();

    // Tell content script to stop microphone recording
    if (state.currentTabId) {
      try {
        await chrome.tabs.sendMessage(state.currentTabId, { action: 'STOP_MIC_RECORDING' });
      } catch (error) {
        console.warn('[Background] Could not stop content script recording');
      }
    }

    // Stop dual stream loop
    stopDualStreamUploadLoop();

    // Flush remaining buffers
    console.log(`[Background] Flushing final buffers...`);
    await flushBuffers();

    // Finalize meeting
    if (state.meetingId) {
      const success = await finalizeMeeting();
      if (success) {
        notifyPopup('UPLOAD_COMPLETE', { success: true, result: { id: state.meetingId } });
      } else {
        notifyPopup('UPLOAD_COMPLETE', { success: false, error: 'Failed to finalize meeting' });
      }
    }

    // Clear state and storage
    await resetState();

    console.log('[Background] Recording stopped and finalized');
    return { success: true, uploaded: true };

  } catch (error) {
    console.error('[Background] Error stopping recording:', error);
    return { success: false, error: error.message };
  }
}

async function startTabCapture(tabId) {
  await ensureOffscreenDocument();

  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId
  });

  if (!streamId) {
    throw new Error('Failed to get tab capture stream ID');
  }

  console.log('[Background] Got stream ID, starting offscreen recording');

  chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'START_TAB_RECORDING',
    streamId
  });
}

async function stopTabCapture() {
  try {
    // Send stop message to offscreen document
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'STOP_TAB_RECORDING'
    });

    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Close the offscreen document to fully release tab capture
    await closeOffscreenDocument();
  } catch (error) {
    console.warn('[Background] Error stopping tab capture:', error);
    // Still try to close offscreen document even if message failed
    try {
      await closeOffscreenDocument();
    } catch (e) {
      console.warn('[Background] Error closing offscreen document:', e);
    }
  }
}

async function closeOffscreenDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({});
    const offscreenDoc = existingContexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');

    if (offscreenDoc) {
      await chrome.offscreen.closeDocument();
      console.log('[Background] Closed offscreen document');
    }
  } catch (error) {
    console.warn('[Background] Error closing offscreen document:', error);
  }
}

// ============================================================================
// AUDIO DATA HANDLING
// ============================================================================

// Helper to decode Base64 to Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function handleAudioData(audioData, audioType, streamType, chunkIndex = 0) {
  try {
    if (!audioData) {
      console.warn('[Background] No audio data received');
      return;
    }

    // If not recording, ignore
    if (!state.isRecording || !state.meetingId) {
      return;
    }

    // Queue chunk for HTTP upload
    // Note: audioData from message might be an array or arraybuffer or base64 string.
    let dataToBuffer = audioData;

    if (typeof audioData === 'string') {
      // Decode Base64 string to Uint8Array
      dataToBuffer = base64ToUint8Array(audioData);
    } else if (Array.isArray(audioData)) {
      dataToBuffer = new Uint8Array(audioData);
    }

    // Fix: content.js sends 'microphone', we need to check for that
    if (streamType === 'mic' || streamType === 'microphone') {
      state.micBuffer.push(dataToBuffer);
    } else {
      state.tabBuffer.push(dataToBuffer);
    }

  } catch (error) {
    console.error('[Background] Error handling audio data:', error.message || error);
  }
}



// ============================================================================
// KEEP ALIVE
// ============================================================================

let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) return;

  keepAliveInterval = setInterval(async () => {
    if (state.isRecording) {
      await Storage.saveState();
      chrome.runtime.sendMessage({ target: 'offscreen', action: 'KEEP_ALIVE' }).catch(() => { });
    }
  }, CONFIG.KEEP_ALIVE_INTERVAL);
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// ============================================================================
// POPUP NOTIFICATIONS
// ============================================================================

function notifyPopup(action, data) {
  chrome.runtime.sendMessage({ action, ...data }).catch(() => {
    // Popup may not be open
  });
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ignore messages meant for offscreen
  if (request.target === 'offscreen') {
    return false;
  }

  console.log('[Background] Message:', request.action);

  const handleAsync = async () => {
    switch (request.action) {
      case 'START_RECORDING':
        return await startRecording(request.tabId, request.meetingDetails);

      case 'STOP_RECORDING':
        return await stopRecording(request.autoUpload || false);

      case 'GET_STATUS':
        return {
          isRecording: state.isRecording,
          currentTabId: state.currentTabId,
          recordingStartTime: state.recordingStartTime,
          duration: state.recordingStartTime ? Date.now() - state.recordingStartTime : 0,
          meetingDetails: state.meetingDetails,
          meetingDetails: state.meetingDetails,
          uploadStatus: state.isUploading ? 'uploading' : 'idle',
          queueSize: (state.micBuffer?.length || 0) + (state.tabBuffer?.length || 0)
        };

      case 'AUDIO_DATA':
        await handleAudioData(
          request.audioData,
          request.audioType,
          request.streamType,
          request.chunkIndex || 0
        );
        return { success: true };

      case 'GET_AUTH_DATA':
        const authData = await Auth.getData();
        return { success: true, authData, exists: !!authData };

      case 'SET_AUTH_DATA':
        await Auth.setData(request.authData);
        return { success: true };

      case 'CLEAR_AUTH_DATA':
        await Auth.clearData();
        return { success: true };

      case 'REFRESH_TOKEN_IF_NEEDED':
        try {
          const newToken = await Auth.refreshIfNeeded();
          return { success: !!newToken, token: newToken };
        } catch (error) {
          console.error('[Background] Error in REFRESH_TOKEN_IF_NEEDED handler:', error);
          return { success: false, token: null, error: error.message };
        }

      case 'GET_PREFERENCE':
        const prefValue = await Storage.getPreference(request.key);
        return { success: true, value: prefValue };

      case 'SET_PREFERENCE':
        await Storage.savePreference(request.key, request.value);
        return { success: true };

      case 'CLEAR_PENDING_AUDIO':
        // No-op for WebSocket streaming
        return { success: true };

      case 'MEETING_ENDED':
        // Stop recording when meeting ends (WebSocket will create meeting automatically)
        if (state.isRecording) {
          return await stopRecording();
        }
        return { success: false, error: 'Not recording' };

      case 'UPDATE_MEETING_TITLE':
        if (state.meetingDetails && request.title) {
          state.meetingDetails.title = request.title;
          await Storage.saveState();
        }
        return { success: true };

      default:
        return { success: false, error: 'Unknown action' };
    }
  };

  handleAsync().then(sendResponse).catch(error => {
    console.error('[Background] Handler error:', error);
    sendResponse({ success: false, error: error.message });
  });

  return true; // Keep message channel open
});

// ============================================================================
// TAB EVENTS
// ============================================================================

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === state.currentTabId && state.isRecording) {
    console.log('[Background] Recording tab closed, stopping recording...');
    await stopRecording(); // Will close WebSocket and create meeting
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Detect when user leaves meeting (URL changes away from meeting)
  if (tabId === state.currentTabId && state.isRecording && changeInfo.url) {
    const isMeetingUrl = changeInfo.url.includes('meet.google.com') ||
      changeInfo.url.includes('teams.microsoft.com') ||
      changeInfo.url.includes('teams.live.com');

    if (!isMeetingUrl) {
      console.log('[Background] User left meeting, stopping recording...');
      await stopRecording(); // Will close WebSocket and create meeting
    }
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

chrome.runtime.onStartup.addListener(() => Storage.loadState());
chrome.runtime.onInstalled.addListener(() => Storage.loadState());

// Load state on startup
Storage.loadState().then(restored => {
  if (restored && state.isRecording) {
    console.log('[Background] Found active recording on startup');
  }
});

console.log('[Background] Memo App Meeting Recorder loaded');
