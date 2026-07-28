/**
 * OWNnote Meeting Recorder - Localhost Content Script
 * Syncs authentication data from the web app to the extension
 */

// ============================================================================
// STATE
// ============================================================================

let syncInterval = null;
let isContextValid = true;

// ============================================================================
// EXTENSION CONTEXT CHECK
// ============================================================================

function checkExtensionContext() {
  try {
    if (typeof chrome === 'undefined') return false;
    if (!chrome.runtime) return false;
    if (!chrome.runtime.id) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function stopAllIntervals() {
  isContextValid = false;
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// ============================================================================
// SAFE MESSAGE SENDER
// ============================================================================

function safeSendMessage(message, callback) {
  if (!isContextValid) return;
  if (!checkExtensionContext()) {
    stopAllIntervals();
    return;
  }

  try {
    chrome.runtime.sendMessage(message, function (response) {
      try {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || '';
          if (errorMsg.includes('Extension context invalidated') ||
            errorMsg.includes('message port closed') ||
            errorMsg.includes('Receiving end does not exist')) {
            stopAllIntervals();
          }
          return;
        }
        if (callback) callback(response);
      } catch (e) {
        stopAllIntervals();
      }
    });
  } catch (e) {
    // sendMessage itself threw - context is definitely invalid
    stopAllIntervals();
  }
}

// ============================================================================
// AUTH DATA SYNC
// ============================================================================

function syncAuthToExtension() {
  if (!isContextValid) return;
  if (!checkExtensionContext()) {
    stopAllIntervals();
    return;
  }

  let authDataString;
  try {
    authDataString = localStorage.getItem('ownnote_auth_data');
  } catch (e) {
    return;
  }

  if (!authDataString) {
    // If auth data is missing in web, clear it in extension too
    safeSendMessage({ action: 'CLEAR_AUTH_DATA' }, (response) => {
      if (response?.success) console.log('[LocalhostContent] Auth cleared (logged out from web)');
    });
    return;
  }

  let authData;
  try {
    authData = JSON.parse(authDataString);
  } catch (e) {
    return;
  }

  if (!authData || !authData.token) {
    safeSendMessage({ action: 'CLEAR_AUTH_DATA' });
    return;
  }

  safeSendMessage(
    { action: 'SET_AUTH_DATA', authData: authData },
    function (response) {
      if (response?.success) {
        console.log('[LocalhostContent] Auth synced from web');
      }
    }
  );
}

// ============================================================================
// STORAGE OBSERVER
// ============================================================================

window.addEventListener('storage', function (event) {
  if (!isContextValid) return;
  if (event.key === 'ownnote_auth_data') {
    syncAuthToExtension();
  }
});

// Intercept localStorage.setItem, removeItem, and clear so login AND logout
// (logout uses removeItem/clear, not setItem) both sync immediately instead
// of waiting for the next periodic check.
(function () {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (key === 'ownnote_auth_data' && isContextValid) {
      setTimeout(syncAuthToExtension, 100);
    }
  };

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    originalRemoveItem(key);
    if (key === 'ownnote_auth_data' && isContextValid) {
      setTimeout(syncAuthToExtension, 100);
    }
  };

  const originalClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function () {
    originalClear();
    if (isContextValid) {
      setTimeout(syncAuthToExtension, 100);
    }
  };
})();

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

if (checkExtensionContext()) {
  try {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (!isContextValid) return false;

      if (request.action === 'GET_WEB_AUTH_DATA') {
        try {
          const authDataString = localStorage.getItem('ownnote_auth_data');
          const authData = authDataString ? JSON.parse(authDataString) : null;
          sendResponse({ success: true, authData });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }

      if (request.action === 'CLEAR_WEB_AUTH_DATA') {
        try {
          // Mirror what the website's own logout() does, then reload so the
          // page picks up the cleared session immediately instead of showing
          // stale "logged in" UI until the user manually refreshes.
          localStorage.removeItem('dashboardUser');
          localStorage.removeItem('ownnote_access_token');
          localStorage.removeItem('ownnote_token_timestamp');
          localStorage.removeItem('ownnote_auth_data');
          localStorage.removeItem('ownnote_pro');
          sendResponse({ success: true });
          setTimeout(() => window.location.reload(), 50);
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return false;
    });
  } catch (e) {
    // Ignore - context invalid
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

if (checkExtensionContext()) {
  console.log('[LocalhostContent] Loaded');
  syncAuthToExtension();

  syncInterval = setInterval(function () {
    if (!isContextValid) {
      clearInterval(syncInterval);
      return;
    }
    if (!checkExtensionContext()) {
      stopAllIntervals();
      return;
    }
    syncAuthToExtension();
  }, 5000);
}
