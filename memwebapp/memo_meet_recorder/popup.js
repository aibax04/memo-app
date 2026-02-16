/**
 * Memo App Meeting Recorder - Popup Script
 * Clean, modular popup for controlling recording
 * Features: Template caching, pending upload handling
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
  API: {
    BASE_URL: 'http://localhost:8000',
    WEB_APP_URL: 'http://localhost:5173',
    ENDPOINTS: {
      TEMPLATES: '/api/v1/web/templates'
    }
  },
  TOKEN: {
    MIN_VALIDITY_HOURS: 2
  },
  UI: {
    TOAST_DURATION: 3000,
    STATUS_CHECK_INTERVAL: 3000,
    AUTH_CHECK_INTERVAL: 2000
  }
};

// ============================================================================
// STATE
// ============================================================================

let state = {
  isRecording: false,
  recordingStartTime: null,
  isAuthenticated: false,
  authData: null,
  currentPlatform: null,
  durationInterval: null,
  templates: [],
  lastTemplateId: null,
  pendingUpload: false
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {};

function initElements() {
  elements.loginGate = document.getElementById('loginGate');
  elements.mainContent = document.getElementById('mainContent');
  elements.logoutBtn = document.getElementById('logoutBtn');
  elements.loginBtn = document.getElementById('loginBtn');

  // Mask backgrounds
  elements.maskBgAuth = document.getElementById('maskBgAuth');
  elements.maskBgRecord = document.getElementById('maskBgRecord');

  // Pre-recording
  elements.preRecordingState = document.getElementById('preRecordingState');
  elements.statusIconContainer = document.getElementById('statusIconContainer');
  elements.statusIcon = document.getElementById('statusIcon');
  elements.statusTitle = document.getElementById('statusTitle');
  elements.statusSubtitle = document.getElementById('statusSubtitle');
  elements.platformBadge = document.getElementById('platformBadge');
  elements.platformName = document.getElementById('platformName');
  elements.meetingTitle = document.getElementById('meetingTitle');
  elements.meetingDescription = document.getElementById('meetingDescription');
  elements.templateSelect = document.getElementById('templateSelect');
  elements.startBtn = document.getElementById('startBtn');

  // Recording
  elements.recordingState = document.getElementById('recordingState');
  elements.duration = document.getElementById('duration');
  elements.recordingPlatformBadge = document.getElementById('recordingPlatformBadge');
  elements.recordingPlatformName = document.getElementById('recordingPlatformName');
  elements.stopBtn = document.getElementById('stopBtn');

  // Post-recording
  elements.postRecordingState = document.getElementById('postRecordingState');
  elements.postMeetingTitle = document.getElementById('postMeetingTitle');
  elements.postTemplateSelect = document.getElementById('postTemplateSelect');
  elements.uploadSection = document.getElementById('uploadSection');
  elements.uploadIcon = document.getElementById('uploadIcon');
  elements.uploadTitle = document.getElementById('uploadTitle');
  elements.uploadMessage = document.getElementById('uploadMessage');
  elements.progressFill = document.getElementById('progressFill');
  elements.uploadBtn = document.getElementById('uploadBtn');
  elements.newRecordingBtn = document.getElementById('newRecordingBtn');
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

function showState(stateName) {
  elements.preRecordingState?.classList.add('hidden');
  elements.recordingState?.classList.add('hidden');
  elements.postRecordingState?.classList.add('hidden');

  switch (stateName) {
    case 'pre-recording':
      elements.preRecordingState?.classList.remove('hidden');
      break;
    case 'recording':
      elements.recordingState?.classList.remove('hidden');
      break;
    case 'post-recording':
      elements.postRecordingState?.classList.remove('hidden');
      break;
  }
}

function showLogin() {
  elements.loginGate?.classList.remove('hidden');
  elements.mainContent?.classList.add('hidden');
  elements.logoutBtn?.classList.add('hidden');

  // Show auth mask background
  elements.maskBgAuth?.classList.remove('hidden');
  elements.maskBgRecord?.classList.add('hidden');
}

function showMain() {
  elements.loginGate?.classList.add('hidden');
  elements.mainContent?.classList.remove('hidden');
  elements.logoutBtn?.classList.remove('hidden');

  // Show record mask background
  elements.maskBgAuth?.classList.add('hidden');
  elements.maskBgRecord?.classList.remove('hidden');
}

function updatePlatformBadge(platform) {
  if (!platform) {
    elements.platformBadge?.classList.add('hidden');
    return;
  }

  elements.platformBadge?.classList.remove('hidden');

  if (platform === 'google_meet') {
    elements.platformBadge?.classList.remove('teams');
    elements.platformBadge?.classList.add('google-meet');
    if (elements.platformName) elements.platformName.textContent = 'Google Meet';
    if (elements.recordingPlatformName) elements.recordingPlatformName.textContent = 'Google Meet';
  } else if (platform === 'teams') {
    elements.platformBadge?.classList.remove('google-meet', 'zoom');
    elements.platformBadge?.classList.add('teams');
    if (elements.platformName) elements.platformName.textContent = 'Microsoft Teams';
    if (elements.recordingPlatformName) elements.recordingPlatformName.textContent = 'Microsoft Teams';
  } else if (platform === 'zoom') {
    elements.platformBadge?.classList.remove('google-meet', 'teams');
    elements.platformBadge?.classList.add('zoom');
    if (elements.platformName) elements.platformName.textContent = 'Zoom';
    if (elements.recordingPlatformName) elements.recordingPlatformName.textContent = 'Zoom';
  }
}

// ============================================================================
// DURATION TIMER
// ============================================================================

function startDurationTimer() {
  if (state.durationInterval) {
    clearInterval(state.durationInterval);
  }

  state.durationInterval = setInterval(() => {
    if (state.recordingStartTime) {
      const duration = Date.now() - state.recordingStartTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      if (elements.duration) {
        elements.duration.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }
  }, 1000);
}

function stopDurationTimer() {
  if (state.durationInterval) {
    clearInterval(state.durationInterval);
    state.durationInterval = null;
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

// ============================================================================
// UI HELPERS
// ============================================================================

const UI = {
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, CONFIG.UI.TOAST_DURATION);
  },

  setButtonLoading(button, text, icon = null) {
    if (!button) return;
    button.disabled = true;
    button.innerHTML = icon
      ? `<svg class="spinner" style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg> ${text}`
      : text;
  },

  setButtonNormal(button, text, icon = null) {
    if (!button) return;
    button.disabled = false;
    button.innerHTML = icon ? `${icon} ${text}` : text;
  }
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

const Auth = {
  decodeTokenExpiry(token) {
    if (!token || typeof token !== 'string') return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch (error) {
      console.error('[Popup] Error decoding token:', error);
      return null;
    }
  },

  isTokenValid(token, minValidityHours = null) {
    if (!token) return false;

    const expiry = this.decodeTokenExpiry(token);
    if (!expiry) return false;

    // Use provided min validity or default from config
    const minValidityMs = (minValidityHours || CONFIG.TOKEN.MIN_VALIDITY_HOURS) * 60 * 60 * 1000;
    const timeUntilExpiry = expiry - Date.now();

    // Token is valid if it has at least minValidityMs remaining
    return timeUntilExpiry > minValidityMs;
  },

  async refreshIfNeeded() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'REFRESH_TOKEN_IF_NEEDED' });

      if (response?.success && response.token) {
        // Get updated auth data after refresh
        const authResponse = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });
        if (authResponse?.success && authResponse.authData) {
          state.authData = authResponse.authData;
          state.isAuthenticated = true;
          return true;
        }
      }

      // If refresh failed, check if we still have a valid token
      if (!response?.success) {
        const authResponse = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });
        if (authResponse?.success && authResponse.authData?.token) {
          // Check if token is still valid (might have been a network error)
          if (this.isTokenValid(authResponse.authData.token, 0.5)) {
            state.authData = authResponse.authData;
            state.isAuthenticated = true;
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('[Popup] Token refresh failed:', error);
      // Try to get current auth data even if refresh failed
      try {
        const authResponse = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });
        if (authResponse?.success && authResponse.authData?.token) {
          if (this.isTokenValid(authResponse.authData.token, 0.5)) {
            state.authData = authResponse.authData;
            state.isAuthenticated = true;
            return true;
          }
        }
      } catch (e) {
        console.error('[Popup] Failed to get auth data after refresh error:', e);
      }
      return false;
    }
  }
};

async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });

    if (response?.success && response.authData?.token) {
      const token = response.authData.token;

      // Check if token is expired or will expire soon
      const tokenExpiry = Auth.decodeTokenExpiry(token);
      const isExpired = tokenExpiry && tokenExpiry <= Date.now();
      const isLowValidity = !Auth.isTokenValid(token, 0.5); // Less than 30 minutes

      if (isExpired || isLowValidity) {
        console.log('[Popup] Token invalid or expiring soon, attempting refresh...');
        const refreshed = await Auth.refreshIfNeeded();

        if (refreshed) {
          // Get updated data after refresh
          const updatedResponse = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });
          if (updatedResponse?.success && updatedResponse.authData?.token) {
            state.isAuthenticated = true;
            state.authData = updatedResponse.authData;
            return true;
          }
        }

        // If refresh failed but token isn't expired, still allow access
        if (!isExpired && Auth.isTokenValid(token, 0.1)) {
          console.log('[Popup] Refresh failed but token still valid, allowing access');
          state.isAuthenticated = true;
          state.authData = response.authData;
          return true;
        }

        // Token is expired or refresh failed
        state.isAuthenticated = false;
        state.authData = null;
        return false;
      } else {
        // Token is valid
        state.isAuthenticated = true;
        state.authData = response.authData;
        return true;
      }
    }

    state.isAuthenticated = false;
    state.authData = null;
    return false;
  } catch (error) {
    console.error('[Popup] Auth check failed:', error);
    state.isAuthenticated = false;
    state.authData = null;
    return false;
  }
}

async function logout() {
  try {
    await chrome.runtime.sendMessage({ action: 'CLEAR_AUTH_DATA' });
    state.isAuthenticated = false;
    state.authData = null;
    showLogin();
    UI.showToast('Logged out successfully', 'success');
  } catch (error) {
    console.error('[Popup] Logout failed:', error);
    UI.showToast('Logout failed. Please try again.', 'error');
  }
}

// ============================================================================
// TEMPLATES
// ============================================================================

async function loadTemplates() {
  // Ensure we have a valid token before API call
  if (!state.authData?.token || !Auth.isTokenValid(state.authData.token, 0.5)) {
    const refreshed = await Auth.refreshIfNeeded();
    if (!refreshed) {
      console.warn('[Popup] No valid auth token available for loading templates');
      // Don't force login, just show error
      state.templates = [];
      populateTemplateSelects();
      return;
    }
  }

  if (!state.authData?.token) {
    console.warn('[Popup] No auth token available for loading templates');
    state.templates = [];
    populateTemplateSelects();
    return;
  }

  try {
    const url = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.TEMPLATES}?active_only=true&limit=100`;
    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${state.authData.token}`,
        'Content-Type': 'application/json'
      }
    });

    // Handle 401 - token expired, try refresh and retry once
    if (response.status === 401) {
      console.log('[Popup] Got 401, attempting token refresh...');
      const refreshed = await Auth.refreshIfNeeded();
      if (refreshed) {
        // Get updated token
        const authResponse = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });
        if (authResponse?.success && authResponse.authData?.token) {
          state.authData = authResponse.authData;
          // Retry with new token
          response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${state.authData.token}`,
              'Content-Type': 'application/json'
            }
          });
        } else {
          throw new Error('Authentication failed. Please log in again.');
        }
      } else {
        throw new Error('Authentication failed. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Popup] Template API error:', response.status, errorText);
      throw new Error(`Failed to load templates (${response.status})`);
    }

    const data = await response.json();
    state.templates = data.data || [];

    console.log(`[Popup] Loaded ${state.templates.length} templates`);

    populateTemplateSelects();
    await loadTemplatePreference();

  } catch (error) {
    console.error('[Popup] Failed to load templates:', error);
    UI.showToast('Unable to load templates. You can still record without selecting one.', 'error');
    state.templates = [];
    populateTemplateSelects();
  }
}

function populateTemplateSelects() {
  [elements.templateSelect, elements.postTemplateSelect].forEach(select => {
    if (!select) return;

    select.innerHTML = '<option value="">Select a template...</option>';
    state.templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.title;
      select.appendChild(option);
    });
  });
}

async function loadTemplatePreference() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'GET_PREFERENCE',
      key: 'lastTemplateId'
    });

    if (response?.success && response.value) {
      state.lastTemplateId = response.value;

      // Set the template select to the last used value
      if (elements.templateSelect) {
        elements.templateSelect.value = response.value;
      }
      if (elements.postTemplateSelect) {
        elements.postTemplateSelect.value = response.value;
      }
    }
  } catch (error) {
    console.error('[Popup] Failed to load template preference:', error);
  }
}

async function saveTemplatePreference(templateId) {
  if (!templateId) return;

  try {
    await chrome.runtime.sendMessage({
      action: 'SET_PREFERENCE',
      key: 'lastTemplateId',
      value: templateId
    });
    state.lastTemplateId = templateId;
  } catch (error) {
    console.error('[Popup] Failed to save template preference:', error);
  }
}

// ============================================================================
// RECORDING CONTROL
// ============================================================================

async function startRecording() {
  try {
    // Check and refresh token before starting recording
    if (!state.authData?.token || !Auth.isTokenValid(state.authData.token, 0.5)) {
      const refreshed = await Auth.refreshIfNeeded();
      if (!refreshed) {
        // Check if we still have a valid token (might have been network error)
        const authResponse = await chrome.runtime.sendMessage({ action: 'GET_AUTH_DATA' });
        if (authResponse?.success && authResponse.authData?.token) {
          if (Auth.isTokenValid(authResponse.authData.token, 0.1)) {
            state.authData = authResponse.authData;
            // Continue with recording
          } else {
            UI.showToast('Please log in to start recording', 'error');
            showLogin();
            return;
          }
        } else {
          UI.showToast('Please log in to start recording', 'error');
          showLogin();
          return;
        }
      }
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      UI.showToast('No active tab found', 'error');
      return;
    }

    // Check if it's a meeting page
    const isMeetingPage = tab.url?.includes('meet.google.com') ||
      tab.url?.includes('teams.microsoft.com') ||
      tab.url?.includes('teams.live.com') ||
      tab.url?.includes('zoom.us') ||
      tab.url?.includes('zoom.com');

    if (!isMeetingPage) {
      UI.showToast('Please navigate to a Google Meet, Teams, or Zoom meeting first', 'error');
      return;
    }

    UI.setButtonLoading(elements.startBtn, 'Starting...');

    // Collect meeting details
    const templateId = elements.templateSelect?.value || '';
    const meetingDetails = {
      title: elements.meetingTitle?.value?.trim() || '',
      description: elements.meetingDescription?.value?.trim() || '',
      templateId
    };

    // Save template preference
    if (templateId) {
      await saveTemplatePreference(templateId);
    }

    // Send start recording message
    const response = await chrome.runtime.sendMessage({
      action: 'START_RECORDING',
      tabId: tab.id,
      meetingDetails
    });

    if (response?.success) {
      state.isRecording = true;
      state.recordingStartTime = Date.now();

      if (tab.url.includes('meet.google.com')) {
        state.currentPlatform = 'google_meet';
      } else if (tab.url.includes('teams.microsoft.com') || tab.url.includes('teams.live.com')) {
        state.currentPlatform = 'teams';
      } else if (tab.url.includes('zoom.us') || tab.url.includes('zoom.com')) {
        state.currentPlatform = 'zoom';
      } else {
        state.currentPlatform = 'unknown';
      }

      updatePlatformBadge(state.currentPlatform);
      showState('recording');
      startDurationTimer();
      UI.showToast('Recording started successfully', 'success');
    } else {
      UI.showToast(response?.error || 'Failed to start recording. Please try again.', 'error');
    }

  } catch (error) {
    console.error('[Popup] Start recording failed:', error);
    UI.showToast('Failed to start recording. Please try again.', 'error');
  } finally {
    UI.setButtonNormal(
      elements.startBtn,
      'Start Recording',
      '<img src="icons/record-button.svg" alt="" style="width: 18px; height: 18px;">'
    );
  }
}

async function stopRecording() {
  try {
    UI.setButtonLoading(elements.stopBtn, 'Stopping...');

    const response = await chrome.runtime.sendMessage({
      action: 'STOP_RECORDING',
      autoUpload: true
    });

    if (response?.success) {
      state.isRecording = false;
      stopDurationTimer();

      // Copy title to post-recording form
      if (elements.postMeetingTitle && elements.meetingTitle) {
        elements.postMeetingTitle.value = elements.meetingTitle.value;
      }
      if (elements.postTemplateSelect && elements.templateSelect) {
        elements.postTemplateSelect.value = elements.templateSelect.value;
      }

      showState('post-recording');

      // Always hide upload option since manual upload is deprecated (streaming only)
      if (elements.uploadBtn) elements.uploadBtn.classList.add('hidden');
      if (elements.uploadSection) elements.uploadSection.classList.add('hidden');

      if (response.uploaded) {
        // Update status text
        const statusTitle = elements.postRecordingState.querySelector('.status-title');
        const statusSubtitle = elements.postRecordingState.querySelector('.status-subtitle');
        if (statusTitle) statusTitle.textContent = 'Recording Saved!';
        if (statusSubtitle) statusSubtitle.textContent = 'Your meeting has been safely recorded.';

        UI.showToast('Recording saved successfully', 'success');
      } else {
        // Session ended without active WebSocket (already closed or failed)
        const statusTitle = elements.postRecordingState.querySelector('.status-title');
        if (statusTitle) statusTitle.textContent = 'Recording Ended';

        UI.showToast('Recording stopped.', 'info');
      }
    } else {
      UI.showToast(response?.error || 'Failed to stop recording. Please try again.', 'error');
    }

  } catch (error) {
    console.error('[Popup] Stop recording failed:', error);
    UI.showToast('Failed to stop recording. Please try again.', 'error');
  } finally {
    UI.setButtonNormal(
      elements.stopBtn,
      'Stop Recording',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>'
    );
  }
}

async function uploadRecording() {
  try {
    if (elements.uploadBtn) {
      elements.uploadBtn.disabled = true;
    }

    // Show upload progress
    elements.uploadSection?.classList.remove('hidden');
    elements.uploadSection?.classList.remove('success', 'error');
    updateUploadProgress(10, 'Preparing upload...');

    const templateId = elements.postTemplateSelect?.value || '';
    const meetingDetails = {
      title: elements.postMeetingTitle?.value?.trim() || 'Untitled Recording',
      templateId
    };

    // Save template preference
    if (templateId) {
      await saveTemplatePreference(templateId);
    }

    const response = await chrome.runtime.sendMessage({
      action: 'UPLOAD_RECORDING',
      meetingDetails
    });

    if (response?.success) {
      updateUploadProgress(100, 'Upload complete!');
      elements.uploadSection?.classList.add('success');
      if (elements.uploadIcon) {
        elements.uploadIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      }
      UI.showToast('Recording uploaded successfully', 'success');
    } else {
      elements.uploadSection?.classList.add('error');
      if (elements.uploadIcon) {
        elements.uploadIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      }
      if (elements.uploadTitle) elements.uploadTitle.textContent = 'Upload Failed';
      if (elements.uploadMessage) elements.uploadMessage.textContent = response?.error || 'Unknown error occurred';
      UI.showToast('Upload failed. Please try again.', 'error');
    }

  } catch (error) {
    console.error('[Popup] Upload failed:', error);
    UI.showToast('Upload failed. Please try again.', 'error');
  } finally {
    if (elements.uploadBtn) {
      elements.uploadBtn.disabled = false;
    }
  }
}

function updateUploadProgress(progress, message) {
  if (elements.progressFill) {
    elements.progressFill.style.width = `${progress}%`;
  }
  if (elements.uploadTitle) {
    elements.uploadTitle.textContent = progress < 100 ? 'Uploading...' : 'Complete';
  }
  if (elements.uploadMessage) {
    elements.uploadMessage.textContent = message;
  }
}

async function startNewRecording() {
  // Clear any pending audio
  try {
    await chrome.runtime.sendMessage({ action: 'CLEAR_PENDING_AUDIO' });
  } catch (error) {
    console.error('[Popup] Failed to clear pending audio:', error);
  }

  // Reset forms but keep template selection
  if (elements.meetingTitle) elements.meetingTitle.value = '';
  if (elements.meetingDescription) elements.meetingDescription.value = '';
  if (elements.postMeetingTitle) elements.postMeetingTitle.value = '';

  // Keep template selections (user preference)

  // Hide upload section
  elements.uploadSection?.classList.add('hidden');

  // Show pre-recording state
  showState('pre-recording');
}

// ============================================================================
// STATUS CHECK
// ============================================================================

async function checkRecordingStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });

    if (response?.isRecording) {
      state.isRecording = true;
      state.recordingStartTime = response.recordingStartTime;
      state.currentPlatform = response.meetingDetails?.platform;
      updatePlatformBadge(state.currentPlatform);
      showState('recording');
      startDurationTimer();
    } else if (response?.pendingUpload || response?.hasAudio) {
      state.pendingUpload = true;

      // Pre-fill meeting details if available
      if (response.meetingDetails) {
        if (elements.postMeetingTitle) {
          elements.postMeetingTitle.value = response.meetingDetails.title || '';
        }
        if (elements.postTemplateSelect && response.meetingDetails.templateId) {
          elements.postTemplateSelect.value = response.meetingDetails.templateId;
        }
      }

      showState('post-recording');
      UI.showToast('You have a pending recording to upload', 'success');
    } else {
      showState('pre-recording');
    }

  } catch (error) {
    console.error('[Popup] Status check failed:', error);
  }
}

async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) return;

    if (tab.url.includes('meet.google.com')) {
      state.currentPlatform = 'google_meet';
      updatePlatformBadge('google_meet');
      if (elements.statusSubtitle) elements.statusSubtitle.textContent = 'Google Meet detected';
      await fetchMeetingTitle(tab.id);
    } else if (tab.url.includes('teams.microsoft.com') || tab.url.includes('teams.live.com')) {
      state.currentPlatform = 'teams';
      updatePlatformBadge('teams');
      if (elements.statusSubtitle) elements.statusSubtitle.textContent = 'Microsoft Teams detected';
      await fetchMeetingTitle(tab.id);
    } else if (tab.url.includes('zoom.us') || tab.url.includes('zoom.com')) {
      state.currentPlatform = 'zoom';
      updatePlatformBadge('zoom');
      if (elements.statusSubtitle) elements.statusSubtitle.textContent = 'Zoom detected';
      await fetchMeetingTitle(tab.id);
    } else {
      state.currentPlatform = null;
      updatePlatformBadge(null);
      if (elements.statusSubtitle) {
        elements.statusSubtitle.textContent = 'Navigate to a meeting to start';
      }
    }

  } catch (error) {
    console.error('[Popup] Tab check failed:', error);
  }
}

async function fetchMeetingTitle(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_MEETING_TITLE' });

    if (response?.title) {
      // Auto-fill the meeting title if empty
      if (elements.meetingTitle && !elements.meetingTitle.value) {
        elements.meetingTitle.value = response.title;
      }
      console.log('[Popup] Got meeting title:', response.title);
    }
  } catch (error) {
    // Content script may not be injected yet
    console.log('[Popup] Could not get meeting title:', error.message);
  }
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'UPLOAD_PROGRESS':
      elements.uploadSection?.classList.remove('hidden');
      updateUploadProgress(message.progress, message.message);
      break;

    case 'UPLOAD_COMPLETE':
      if (message.success) {
        updateUploadProgress(100, 'Upload complete!');
        elements.uploadSection?.classList.add('success');
        if (elements.uploadIcon) {
          elements.uploadIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        }
        UI.showToast('Recording uploaded successfully', 'success');
      } else {
        elements.uploadSection?.classList.add('error');
        if (elements.uploadIcon) {
          elements.uploadIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        }
        if (elements.uploadTitle) elements.uploadTitle.textContent = 'Upload Failed';
        if (elements.uploadMessage) elements.uploadMessage.textContent = message.error || 'Unknown error occurred';
      }
      break;

    case 'AUDIO_READY':
      UI.showToast('Audio files ready for upload', 'success');
      break;
  }
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  elements.loginBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: CONFIG.API.WEB_APP_URL });
  });

  elements.logoutBtn?.addEventListener('click', logout);
  elements.startBtn?.addEventListener('click', startRecording);
  elements.stopBtn?.addEventListener('click', stopRecording);
  elements.uploadBtn?.addEventListener('click', uploadRecording);
  elements.newRecordingBtn?.addEventListener('click', startNewRecording);

  // Save template preference when changed
  elements.templateSelect?.addEventListener('change', (e) => {
    if (e.target.value) {
      saveTemplatePreference(e.target.value);
    }
  });

  elements.postTemplateSelect?.addEventListener('change', (e) => {
    if (e.target.value) {
      saveTemplatePreference(e.target.value);
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initialize() {
  console.log('[Popup] Initializing...');

  initElements();
  setupEventListeners();

  // Check authentication (this will also refresh token if needed)
  const isAuthenticated = await checkAuth();

  if (isAuthenticated) {
    showMain();
    await Promise.all([
      checkRecordingStatus(),
      checkCurrentTab(),
      loadTemplates()
    ]);
  } else {
    showLogin();
  }

  console.log('[Popup] Initialized');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Periodic status check
setInterval(async () => {
  if (state.isAuthenticated && !state.isRecording) {
    await checkCurrentTab();
  }
}, CONFIG.UI.STATUS_CHECK_INTERVAL);

// Check auth periodically when on login screen
setInterval(async () => {
  if (!state.isAuthenticated) {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
      showMain();
      await Promise.all([
        checkRecordingStatus(),
        checkCurrentTab(),
        loadTemplates()
      ]);
    }
  }
}, CONFIG.UI.AUTH_CHECK_INTERVAL);
