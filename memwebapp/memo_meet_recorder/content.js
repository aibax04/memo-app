/**
 * Memo App Meeting Recorder - Content Script
 * Handles microphone recording, meeting platform detection, meeting title detection, and meeting end detection
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const PLATFORMS = {
  GOOGLE_MEET: 'google_meet',
  TEAMS: 'teams',
  ZOOM: 'zoom'
};

// ============================================================================
// STATE
// ============================================================================

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

let micStream = null;
let micMuted = false;
let detectedMeetingTitle = null;

// ============================================================================
// EXTENSION CONTEXT CHECK
// ============================================================================

function isExtensionContextValid() {
  try {
    return !!(chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

function safeSendMessage(message) {
  if (!isExtensionContextValid()) {
    console.log('[Content] Extension context invalidated');
    return Promise.resolve(null);
  }

  return chrome.runtime.sendMessage(message).catch(error => {
    if (error.message?.includes('Extension context invalidated')) {
      console.log('[Content] Extension was reloaded');
    } else {
      console.warn('[Content] Message error:', error.message);
    }
    return null;
  });
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

function detectPlatform() {
  const hostname = window.location.hostname;

  if (hostname.includes('meet.google.com')) {
    return PLATFORMS.GOOGLE_MEET;
  }
  if (hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com')) {
    return PLATFORMS.TEAMS;
  }
  if (hostname.includes('zoom.us') || hostname.includes('zoom.com')) {
    return PLATFORMS.ZOOM;
  }
  return null;
}

// ============================================================================
// MEETING TITLE DETECTION
// ============================================================================

function detectMeetingTitle() {
  const platform = detectPlatform();
  let title = null;

  if (platform === PLATFORMS.GOOGLE_MEET) {
    title = detectGoogleMeetTitle();
  } else if (platform === PLATFORMS.TEAMS) {
    title = detectTeamsTitle();
  } else if (platform === PLATFORMS.ZOOM) {
    title = detectZoomTitle();
  }

  if (title && title !== detectedMeetingTitle) {
    detectedMeetingTitle = title;
    console.log('[Content] Detected meeting title:', title);

    // Send to background
    safeSendMessage({
      action: 'UPDATE_MEETING_TITLE',
      title: title
    });
  }

  return title;
}

function detectZoomTitle() {
  const selectors = [
    '.meeting-info-phone-title', // Common in Zoom web client
    '#lblTitle',
    '.meeting-title',
    '[data-testid="meeting-title"]',
    'div[role="heading"]'
  ];

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const title = element.textContent?.trim();
        if (title && title.length > 0 && title.length < 200 && !title.includes('Zoom Meeting')) {
          return title;
        }
      }
    } catch (e) { }
  }

  // Fallback to document title
  const docTitle = document.title;
  if (docTitle) {
    // Remove " - Zoom" or "Zoom Meeting" suffix if present
    let cleanTitle = docTitle.replace(/ - Zoom$/, '').replace(/Zoom Meeting:?/, '').trim();
    if (cleanTitle.length > 0 && cleanTitle.length < 200) {
      return cleanTitle;
    }
  }

  return "Zoom Meeting";
}

function detectGoogleMeetTitle() {
  // Try multiple selectors for Google Meet title
  const selectors = [
    '[data-meeting-title]',
    '[data-call-title]',
    '.u6vdEc', // Meeting title class
    '.r6xAKc', // Another title class
    '[jsname="r4nke"]', // Meeting info
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.getAttribute('data-meeting-title') ||
        element.getAttribute('data-call-title') ||
        element.textContent?.trim();
      if (title && title.length > 0 && title.length < 200) {
        return title;
      }
    }
  }

  // Try to get from document title
  const docTitle = document.title;
  if (docTitle && !docTitle.includes('Google Meet') && docTitle.length < 200) {
    // Extract meeting name from title like "Meeting Name - Google Meet"
    const match = docTitle.match(/^(.+?)\s*[-–]\s*Google Meet/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Try URL for meeting code
  const meetingCode = window.location.pathname.replace('/', '');
  if (meetingCode && meetingCode.length > 0) {
    return `Google Meet: ${meetingCode}`;
  }

  return null;
}

function detectTeamsTitle() {
  // Try multiple selectors for Teams title
  const selectors = [
    '[data-tid="call-title"]',
    '[data-tid="meeting-title"]',
    '.ts-calling-screen-title',
    '.meeting-title',
    '#meeting-info-header',
    '.call-title',
    '[data-cid="title"]',
    '.ts-title-bar-title',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.textContent?.trim();
      if (title && title.length > 0 && title.length < 200) {
        return title;
      }
    }
  }

  // Try to get from document title
  const docTitle = document.title;
  if (docTitle) {
    // Extract meeting name from title like "Meeting Name | Microsoft Teams"
    const match = docTitle.match(/^(.+?)\s*[|]\s*Microsoft Teams/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Or just use the title if it doesn't contain "Microsoft Teams"
    if (!docTitle.includes('Microsoft Teams') && docTitle.length < 200) {
      return docTitle;
    }
  }

  return 'Teams Meeting';
}

// ============================================================================
// MEETING END DETECTION
// ============================================================================

function startMeetingEndDetection() {
  const platform = detectPlatform();

  if (platform === PLATFORMS.GOOGLE_MEET) {
    startGoogleMeetEndDetection();
  } else if (platform === PLATFORMS.TEAMS) {
    startTeamsEndDetection();
  }
}

function startGoogleMeetEndDetection() {
  // Store the original meeting URL to detect navigation away
  const originalMeetingUrl = window.location.href;
  const meetingCodePattern = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;

  // Text patterns that indicate meeting has ended
  const meetingEndedPatterns = [
    'You left the meeting',
    "You've left the meeting",
    'The meeting has ended',
    'Meeting ended',
    'Call ended',
    'Return to home screen',
    'Rejoin',
    'You were removed from the meeting',
    'Meeting code expired',
    'This meeting has ended',
    'The call has ended',
    'Your meeting has ended'
  ];

  // Check for meeting end via text content
  const checkForMeetingEndText = () => {
    if (!isRecording) return false;

    const bodyText = document.body.innerText;
    for (const pattern of meetingEndedPatterns) {
      if (bodyText.includes(pattern)) {
        console.log('[Content] Google Meet ended detected via text:', pattern);
        return true;
      }
    }
    return false;
  };

  // Check for meeting end via UI elements
  const checkForMeetingEndUI = () => {
    if (!isRecording) return false;

    // Check for "Rejoin" button which appears after leaving
    const rejoinButton = document.querySelector(
      'button[aria-label*="Rejoin"], ' +
      'button[aria-label*="rejoin"], ' +
      '[data-tooltip*="Rejoin"], ' +
      'button[jsname="Qx7uuf"]'
    );
    if (rejoinButton) {
      console.log('[Content] Google Meet ended detected via Rejoin button');
      return true;
    }

    // Check for "Return to home screen" link
    const returnHomeLink = document.querySelector(
      'a[href*="meet.google.com"], ' +
      '[aria-label*="Return to home"], ' +
      '[aria-label*="return to home"]'
    );
    if (returnHomeLink && document.body.innerText.includes('Return to home')) {
      console.log('[Content] Google Meet ended detected via Return to home link');
      return true;
    }

    // Check for post-meeting feedback dialog
    const feedbackDialog = document.querySelector(
      '[aria-label*="feedback"], ' +
      '[aria-label*="rate"], ' +
      '[role="dialog"][aria-modal="true"]'
    );
    if (feedbackDialog && document.body.innerText.includes('How was the')) {
      console.log('[Content] Google Meet ended detected via feedback dialog');
      return true;
    }

    return false;
  };

  // Check if URL indicates we're no longer in a meeting
  const checkForUrlChange = () => {
    if (!isRecording) return false;

    const currentUrl = window.location.href;

    // If we're no longer on a meeting URL pattern
    if (!meetingCodePattern.test(currentUrl)) {
      console.log('[Content] Google Meet ended detected via URL change');
      return true;
    }

    // If URL changed significantly (different meeting or left)
    if (currentUrl !== originalMeetingUrl && !currentUrl.includes(originalMeetingUrl.split('?')[0])) {
      // Check if it's just a parameter change vs actual navigation
      const originalPath = new URL(originalMeetingUrl).pathname;
      const currentPath = new URL(currentUrl).pathname;
      if (originalPath !== currentPath) {
        console.log('[Content] Google Meet ended detected via path change');
        return true;
      }
    }

    return false;
  };

  // Combined check function
  const checkForMeetingEnd = () => {
    if (!isRecording) return;

    if (checkForMeetingEndText() || checkForMeetingEndUI() || checkForUrlChange()) {
      notifyMeetingEnded();
    }
  };

  // Observe for leave button click
  const handleLeaveClick = (e) => {
    if (!isRecording) return;

    const target = e.target;
    const button = target.closest?.('button') || target;

    // Get all relevant attributes
    const ariaLabel = (button.getAttribute?.('aria-label') || '').toLowerCase();
    const dataTooltip = (button.getAttribute?.('data-tooltip') || '').toLowerCase();
    const title = (button.getAttribute?.('title') || '').toLowerCase();
    const combined = ariaLabel + dataTooltip + title;

    // Check for leave/end call indicators
    if (combined.includes('leave call') ||
      combined.includes('leave meeting') ||
      combined.includes('end call') ||
      combined.includes('hang up') ||
      combined.includes('hangup')) {
      console.log('[Content] Leave/End button clicked');
      // Give time for the meeting to actually end
      setTimeout(() => {
        if (isRecording) {
          // Double-check that meeting actually ended
          if (checkForMeetingEndText() || checkForMeetingEndUI()) {
            notifyMeetingEnded();
          } else {
            // Check again after another delay
            setTimeout(() => {
              if (isRecording && (checkForMeetingEndText() || checkForMeetingEndUI())) {
                notifyMeetingEnded();
              }
            }, 2000);
          }
        }
      }, 1500);
    }
  };

  document.addEventListener('click', handleLeaveClick, true);

  // Also listen for keyboard shortcut to leave (Ctrl+W or closing tab)
  window.addEventListener('keydown', (e) => {
    if (!isRecording) return;

    // Ctrl+W or Cmd+W to close
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      console.log('[Content] Close shortcut detected');
      notifyMeetingEnded();
    }
  });

  // Periodic check for meeting end
  const meetingEndCheckInterval = setInterval(checkForMeetingEnd, 2000);

  // Store interval ID for cleanup
  if (!window._memoappIntervals) {
    window._memoappIntervals = [];
  }
  window._memoappIntervals.push(meetingEndCheckInterval);
}

function startTeamsEndDetection() {
  const checkForMeetingEnd = () => {
    if (!isRecording) return;

    const endedIndicators = [
      'Call ended',
      'You left the meeting',
      'Meeting ended',
      'The meeting has ended'
    ];

    const bodyText = document.body.innerText;
    const hasEnded = endedIndicators.some(indicator => bodyText.includes(indicator));

    if (hasEnded) {
      console.log('[Content] Teams meeting ended detected');
      notifyMeetingEnded();
    }
  };

  // Observe for leave/hang up button click
  document.addEventListener('click', (e) => {
    const target = e.target;
    const button = target.closest?.('button');

    if (button) {
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      const title = button.getAttribute('title')?.toLowerCase() || '';
      const id = button.getAttribute('id')?.toLowerCase() || '';

      if (ariaLabel.includes('hang up') || ariaLabel.includes('leave') ||
        title.includes('hang up') || title.includes('leave') ||
        id.includes('hangup') || id.includes('leave')) {
        console.log('[Content] Teams leave/hangup button clicked');
        setTimeout(() => {
          if (isRecording) {
            notifyMeetingEnded();
          }
        }, 1000);
      }
    }
  }, true);

  setInterval(checkForMeetingEnd, 2000);
}

function notifyMeetingEnded() {
  if (!isRecording) return;

  console.log('[Content] Notifying background that meeting ended');
  safeSendMessage({ action: 'MEETING_ENDED' });
}

// ============================================================================
// MUTE DETECTION - GOOGLE MEET
// ============================================================================

function detectGoogleMeetMuteState() {
  // Strategy 0: Check for specific user-identified button attributes (High Confidence)
  // Muted: aria-label="Turn on microphone" , data-is-muted="true"
  // Unmuted: aria-label="Turn off microphone" , data-is-muted="false"

  try {
    // Check for Muted State
    const mutedBtn = document.querySelector('button[aria-label*="Turn on microphone"][data-is-muted="true"]');
    if (mutedBtn) return true;

    // Check for Unmuted State
    const unmutedBtn = document.querySelector('button[aria-label*="Turn off microphone"][data-is-muted="false"]');
    if (unmutedBtn) return false;

    // Fallback: Check just data-is-muted if specific aria-label match fails
    // (UI text might vary by language, but data-attribute should be stable)
    const dataMutedBtn = document.querySelector('button[data-is-muted]');
    if (dataMutedBtn) {
      return dataMutedBtn.getAttribute('data-is-muted') === 'true';
    }
  } catch (e) {
    console.warn('[Content] Error in Strategy 0 detection:', e);
  }

  // Strategy 1: Check aria-label on buttons (Legacy/Backup)
  // When unmuted, the button says "Turn off microphone" (action to mute)
  // When muted, the button says "Turn on microphone" (action to unmute)
  const unmuteIndicators = [
    '[aria-label*="Turn off microphone"]',
    '[aria-label*="turn off microphone"]',
    '[aria-label*="Mute microphone"]',
    '[aria-label*="mute microphone"]',
    'button[aria-label*="Mute ("]',
    'button[aria-label*="mute ("]',
    '[data-tooltip*="Turn off microphone"]',
    '[data-tooltip*="Mute microphone"]',
    // Additional indicators
    '[aria-label*="Turn off mic"]',
    '[aria-label*="turn off mic"]',
    '[aria-label*="Mute mic"]',
    '[aria-label*="mute mic"]'
  ];

  for (const selector of unmuteIndicators) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        // Double check visibility to avoid hidden elements
        if (el.offsetParent !== null) {
          return false; // Mic is ON (not muted)
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  const muteIndicators = [
    '[aria-label*="Turn on microphone"]',
    '[aria-label*="turn on microphone"]',
    '[aria-label*="Unmute microphone"]',
    '[aria-label*="unmute microphone"]',
    '[aria-label*="Unmute ("]',
    '[aria-label*="unmute ("]',
    '[data-tooltip*="Turn on microphone"]',
    '[data-tooltip*="Unmute"]',
    // Additional indicators
    '[aria-label*="Turn on mic"]',
    '[aria-label*="turn on mic"]',
    '[aria-label*="Unmute mic"]',
    '[aria-label*="unmute mic"]',
    '[aria-label*="Microphone off"]',
    '[aria-label*="microphone off"]'
  ];

  for (const selector of muteIndicators) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        if (el.offsetParent !== null) {
          return true; // Mic is OFF (muted)
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Strategy 2: Find microphone button by scanning all buttons
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    const dataTooltip = (btn.getAttribute('data-tooltip') || '').toLowerCase();
    const title = (btn.getAttribute('title') || '').toLowerCase();
    const combined = ariaLabel + dataTooltip + title;

    // Check if this is a microphone-related button
    if (combined.includes('microphone') || combined.includes('mic')) {
      // Check for unmuted state (button shows "turn off" or "mute")
      if (combined.includes('turn off') ||
        (combined.includes('mute') && !combined.includes('unmute'))) {
        return false; // Mic is ON
      }
      // Check for muted state (button shows "turn on" or "unmute")
      if (combined.includes('turn on') || combined.includes('unmute')) {
        return true; // Mic is OFF
      }
    }
  }

  // Strategy 3: Check for keyboard shortcut hint (Ctrl+D)
  // Google Meet shows keyboard shortcuts in tooltips
  const shortcutElements = document.querySelectorAll('[data-tooltip*="Ctrl+D"], [aria-label*="Ctrl+D"]');
  for (const el of shortcutElements) {
    const text = (el.getAttribute('data-tooltip') || el.getAttribute('aria-label') || '').toLowerCase();
    if (text.includes('unmute') || text.includes('turn on')) {
      return true; // Muted
    }
    if (text.includes('mute') && !text.includes('unmute')) {
      return false; // Unmuted
    }
  }

  // Strategy 4: Look for mic icon with slash (muted indicator)
  // Google Meet uses SVG icons - muted mic has a diagonal line
  const micButtons = document.querySelectorAll('button');
  for (const btn of micButtons) {
    const svg = btn.querySelector('svg');
    if (svg) {
      // Check if the SVG contains a "slash" path (indicates muted)
      const paths = svg.querySelectorAll('path');
      let hasMicPath = false;
      let hasSlashPath = false;

      for (const path of paths) {
        const d = path.getAttribute('d') || '';
        // Mic icon typically has specific path patterns
        if (d.includes('M12') || d.includes('m12')) {
          hasMicPath = true;
        }
        // Slash/line across the icon
        if (d.includes('M3') && d.includes('21') || d.includes('M1') && d.includes('23')) {
          hasSlashPath = true;
        }
      }

      // If we found a mic button with a slash, it's muted
      if (hasMicPath && hasSlashPath) {
        return true;
      }
    }
  }

  // Strategy 5: Check for specific Google Meet classes that indicate state
  const mutedClassIndicators = document.querySelectorAll(
    '[class*="muted"], [class*="Muted"], [class*="disabled"], [class*="off"]'
  );
  for (const el of mutedClassIndicators) {
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('microphone') || ariaLabel.includes('mic')) {
      return true;
    }
  }

  // Default: assume unmuted to ensure we capture audio if detection fails
  // But since user says "always recording", maybe we should default to true (muted) if unsure?
  // No, better to record audio than silence if we are unsure.
  // We suspect detection is returning false when it should be true.
  return false;
}

// ============================================================================
// MUTE DETECTION - MICROSOFT TEAMS
// ============================================================================

function detectTeamsMuteState() {
  // Strategy 0: Check for specific user-identified button attributes (High Confidence)
  // Muted: data-state="mic-off", aria-label="Unmute mic"
  // Unmuted: data-state="mic", aria-label="Mute mic"

  try {
    // Check for Muted State
    const mutedBtn = document.querySelector('button[aria-label*="Unmute mic"][data-state="mic-off"]');
    if (mutedBtn) return true;

    // Check for Unmuted State
    const unmutedBtn = document.querySelector('button[aria-label*="Mute mic"][data-state="mic"]');
    if (unmutedBtn) return false;

    // Fallback: Check just data-state if keys are present (more generic)
    const dataStateBtn = document.querySelector('button[data-state^="mic"]');
    if (dataStateBtn) {
      const state = dataStateBtn.getAttribute('data-state');
      if (state === 'mic-off') return true;
      if (state === 'mic') return false;
    }
  } catch (e) {
    console.warn('[Content] Error in Teams Strategy 0 detection:', e);
  }

  const micButton = document.querySelector(
    'button[id="microphone-button"], ' +
    'button[data-tid*="toggle-mute"], ' +
    'button[data-tid*="microphone"], ' +
    '[data-cid="calling-unified-bar-mic"]'
  );

  if (micButton) {
    const ariaPressed = micButton.getAttribute('aria-pressed');
    const ariaLabel = micButton.getAttribute('aria-label')?.toLowerCase() || '';
    const title = micButton.getAttribute('title')?.toLowerCase() || '';

    if (ariaPressed === 'true') return false;
    if (ariaPressed === 'false') return true;

    if (ariaLabel.includes('unmute') || title.includes('unmute')) return true;
    if (ariaLabel.includes('mute') || title.includes('mute')) return false;
  }

  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const label = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
    if (label.includes('microphone') || label.includes('mute')) {
      if (label.includes('unmute') || label.includes('turn on')) return true;
      if (label.includes('mute') || label.includes('turn off')) return false;
    }
  }

  return false;
}

// ============================================================================
// MUTE DETECTION - ZOOM
// ============================================================================

function detectZoomMuteState() {
  // Muted: aria-label="unmute my microphone"
  // Unmuted: aria-label="mute my microphone"

  try {
    // Check for Muted State
    // Try case-insensitive matching just in case, but prioritize user input
    const mutedBtn = document.querySelector('button[aria-label*="unmute my microphone"], button[aria-label*="Unmute my microphone"]');
    if (mutedBtn) return true;

    // Check for Unmuted State
    const unmutedBtn = document.querySelector('button[aria-label*="mute my microphone"], button[aria-label*="Mute my microphone"]');
    if (unmutedBtn) return false;

    // Fallback: Check for generic mute/unmute if specific phrase missing
    const genericUnmute = document.querySelector('button[aria-label="Unmute"], [data-tip="Unmute"]');
    if (genericUnmute) return true;

    const genericMute = document.querySelector('button[aria-label="Mute"], [data-tip="Mute"]');
    if (genericMute) return false;

  } catch (e) {
    console.warn('[Content] Error in Zoom mute detection:', e);
  }

  return false;
}

// ============================================================================
// UNIFIED MUTE DETECTION
// ============================================================================

function detectMuteState() {
  const platform = detectPlatform();

  if (platform === PLATFORMS.GOOGLE_MEET) {
    return detectGoogleMeetMuteState();
  }
  if (platform === PLATFORMS.TEAMS) {
    return detectTeamsMuteState();
  }
  if (platform === PLATFORMS.ZOOM) {
    return detectZoomMuteState();
  }

  return false;
}

// ============================================================================
// MICROPHONE RECORDING
// ============================================================================

async function startMicRecording() {
  if (isRecording) {
    console.log('[Content] Already recording');
    return;
  }

  try {
    console.log('[Content] Starting microphone recording');

    // Detect and send meeting title
    detectMeetingTitle();

    // Get microphone stream
    // NOTE: We only capture the microphone, not any system/tab audio
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Set initial mute state
    micMuted = detectMuteState();

    // Apply initial track state - this is the SIMPLEST and MOST ROBUST way to handle mute
    // When track.enabled = false, the MediaRecorder receives silence (zeros)
    if (micStream) {
      micStream.getAudioTracks().forEach(track => {
        track.enabled = !micMuted;
      });
    }

    console.log('[Content] Initial mute state:', micMuted ? 'MUTED (Silence)' : 'UNMUTED (Audio)');

    // Create MediaRecorder directly from the microphone stream
    // No need for intermediate AudioContext/GainNode which adds complexity and latency
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(micStream, {
      mimeType,
      audioBitsPerSecond: 64000
    });

    let chunkIndex = 0;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Stream chunks immediately via WebSocket
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];

          safeSendMessage({
            action: 'AUDIO_DATA',
            audioData: base64,
            audioType: event.data.type || 'audio/webm',
            streamType: 'microphone',
            timestamp: Date.now(),
            chunkIndex: chunkIndex++
          });
        };
        reader.onerror = (error) => {
          console.error('[Content] FileReader error:', error);
        };
        reader.readAsDataURL(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      console.log('[Content] MediaRecorder stopped');
      cleanup();
    };

    mediaRecorder.start(1000);
    isRecording = true;

    // Start mute detection polling
    startMuteDetection();

    // Start meeting end detection
    startMeetingEndDetection();

    // Start URL monitoring for Google Meet
    startUrlMonitoring();

    // Periodically check for title updates
    startTitleDetection();

    console.log('[Content] Microphone recording started - browser audio unaffected');

  } catch (error) {
    console.error('[Content] Failed to start recording:', error);
    cleanup();
    throw error;
  }
}

function stopMicRecording() {
  if (!isRecording) {
    console.log('[Content] Not recording');
    return;
  }

  console.log('[Content] Stopping microphone recording');
  isRecording = false;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  stopMuteDetection();
  stopTitleDetection();
}

function cleanup() {
  isRecording = false;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch (e) { }
  }

  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }



  stopMuteDetection();
  stopTitleDetection();
  stopUrlMonitoring();

  // Clean up any stored intervals
  if (window._memoappIntervals) {
    window._memoappIntervals.forEach(id => clearInterval(id));
    window._memoappIntervals = [];
  }
}



// ============================================================================
// MUTE STATE MONITORING
// ============================================================================

let muteDetectionInterval = null;

function startMuteDetection() {
  if (muteDetectionInterval) return;

  muteDetectionInterval = setInterval(() => {
    if (!isRecording) return;

    const currentMuteState = detectMuteState();

    if (currentMuteState !== micMuted) {
      micMuted = currentMuteState;

      // CRITICAL: Toggle track enabled state for hard mute (absolute silence)
      // This ensures the source stream produces silence frames
      if (micStream) {
        micStream.getAudioTracks().forEach(track => {
          track.enabled = !micMuted;
        });
      }

      console.log('[Content] Mute state changed:', micMuted ? 'MUTED (Recording Silence)' : 'UNMUTED (Recording Audio)');
    }
  }, 300);
}

function stopMuteDetection() {
  if (muteDetectionInterval) {
    clearInterval(muteDetectionInterval);
    muteDetectionInterval = null;
  }
}

// ============================================================================
// TITLE DETECTION POLLING
// ============================================================================

let titleDetectionInterval = null;

function startTitleDetection() {
  if (titleDetectionInterval) return;

  // Check for title every 5 seconds
  titleDetectionInterval = setInterval(() => {
    if (isRecording) {
      detectMeetingTitle();
    }
  }, 5000);
}

function stopTitleDetection() {
  if (titleDetectionInterval) {
    clearInterval(titleDetectionInterval);
    titleDetectionInterval = null;
  }
}

// ============================================================================
// DOM MUTATION OBSERVER
// ============================================================================

const mutationObserver = new MutationObserver((mutations) => {
  if (!isRecording) return;

  for (const mutation of mutations) {
    if (mutation.type === 'attributes' && mutation.target.tagName === 'BUTTON') {
      const currentMuteState = detectMuteState();

      // Update state if changed
      if (currentMuteState !== micMuted) {
        micMuted = currentMuteState;

        // CRITICAL: Toggle track enabled state for hard mute
        if (micStream) {
          micStream.getAudioTracks().forEach(track => {
            track.enabled = !micMuted;
          });
        }

        console.log('[Content] Mute state changed (observer):', micMuted ? 'MUTED (Silence)' : 'UNMUTED (Audio)');
      }
      // Stop checking other mutations in this batch if we found a change
      if (currentMuteState !== micMuted) break;
    }
  }
});

// Start observing
mutationObserver.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['aria-label', 'aria-pressed', 'data-is-muted', 'title', 'data-tooltip', 'class']
});

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

if (isExtensionContextValid()) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Content] Message:', request.action);

    switch (request.action) {
      case 'PING':
        sendResponse({ success: true, platform: detectPlatform() });
        break;

      case 'START_MIC_RECORDING':
        startMicRecording()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;

      case 'STOP_MIC_RECORDING':
        stopMicRecording();
        sendResponse({ success: true });
        break;

      case 'GET_STATUS':
        sendResponse({
          isRecording,
          platform: detectPlatform(),
          micMuted,
          meetingTitle: detectedMeetingTitle
        });
        break;

      case 'GET_MUTE_STATE':
        sendResponse({
          muted: detectMuteState(),
          platform: detectPlatform()
        });
        break;

      case 'GET_MEETING_TITLE':
        sendResponse({
          title: detectMeetingTitle(),
          platform: detectPlatform()
        });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }

    return false;
  });
}

// ============================================================================
// CLEANUP ON UNLOAD
// ============================================================================

window.addEventListener('beforeunload', () => {
  if (isRecording) {
    safeSendMessage({ action: 'MEETING_ENDED' });
  }
  cleanup();
  mutationObserver.disconnect();
});

// ============================================================================
// URL CHANGE MONITORING (For Google Meet)
// ============================================================================

// Store the initial meeting URL
let initialMeetingUrl = window.location.href;
let urlCheckInterval = null;

function startUrlMonitoring() {
  if (detectPlatform() !== PLATFORMS.GOOGLE_MEET) return;

  initialMeetingUrl = window.location.href;
  const meetingCodePattern = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;

  // Check if we're in a valid meeting URL
  const isInMeeting = () => {
    return meetingCodePattern.test(window.location.href);
  };

  // Handle URL changes via History API
  const handleUrlChange = () => {
    if (!isRecording) return;

    // If we navigated away from a meeting URL
    if (!isInMeeting()) {
      console.log('[Content] URL changed - no longer in meeting');
      notifyMeetingEnded();
    }
  };

  // Listen for popstate (back/forward navigation)
  window.addEventListener('popstate', handleUrlChange);

  // Listen for hashchange
  window.addEventListener('hashchange', handleUrlChange);

  // Intercept pushState and replaceState to detect SPA navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    handleUrlChange();
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    handleUrlChange();
    return result;
  };

  // Also periodically check URL as a fallback
  urlCheckInterval = setInterval(() => {
    if (!isRecording) return;

    if (!isInMeeting()) {
      console.log('[Content] Periodic URL check - no longer in meeting');
      notifyMeetingEnded();
    }
  }, 3000);
}

function stopUrlMonitoring() {
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
    urlCheckInterval = null;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[Content] Memo App content script loaded on', detectPlatform() || 'unknown platform');

// Detect title on load
setTimeout(detectMeetingTitle, 2000);
