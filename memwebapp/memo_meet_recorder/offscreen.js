/**
 * Memo App Meeting Recorder - Offscreen Document
 * Handles tab audio capture via tabCapture API
 * 
 * IMPORTANT: Tab audio playback routing
 * Chrome's tabCapture in Manifest V3 sometimes suppresses audio playback.
 * We need to explicitly route the captured audio to speakers to ensure playback.
 */

let mediaRecorder = null;
let currentStream = null;
let isRecording = false;
let audioContext = null;
let audioElement = null;
let audioSourceNode = null; // Track the source node for cleanup
let resumeIntervalId = null; // Track the resume interval for cleanup
let chunkIndex = 0; // Track chunk index for WebSocket streaming

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;
  
  console.log('[Offscreen] Message:', message.action);
  
  switch (message.action) {
    case 'START_TAB_RECORDING':
      startRecording(message.streamId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'STOP_TAB_RECORDING':
      stopRecording();
      sendResponse({ success: true });
      break;
      
    case 'KEEP_ALIVE':
      // Just acknowledge to keep the document alive
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return false;
});

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

async function startRecording(streamId) {
  if (isRecording) {
    console.log('[Offscreen] Already recording');
    return;
  }
  
  try {
    console.log('[Offscreen] Starting tab audio capture with stream ID:', streamId);
    
    // Get the tab audio stream
    currentStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    });
    
    console.log('[Offscreen] Got tab audio stream');
    
    // CRITICAL FIX: ALWAYS use Web Audio API for reliable audio routing
    // Special handling for Google Meet which has aggressive audio management
    try {
      audioContext = new AudioContext();
      
      // Create source from the captured stream
      audioSourceNode = audioContext.createMediaStreamSource(currentStream);
      
      // Connect directly to speakers (destination = system audio output)
      audioSourceNode.connect(audioContext.destination);
      
      console.log('[Offscreen] ✅ Audio routed to speakers via Web Audio API');
      console.log('[Offscreen] AudioContext state:', audioContext.state);
      console.log('[Offscreen] AudioContext sampleRate:', audioContext.sampleRate);
      
      // CRITICAL: Resume AudioContext (especially important for Google Meet)
      // Google Meet's audio processing can suspend our AudioContext
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('[Offscreen] ✅ AudioContext resumed - audio now flowing to speakers');
      }
      
      // GOOGLE MEET FIX: Add a small delay and force resume again
      // Google Meet sometimes re-suspends the AudioContext
      setTimeout(async () => {
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('[Offscreen] ✅ AudioContext re-resumed (Google Meet fix)');
        }
      }, 500);
      
      // Also ensure we keep checking and resuming if needed
      resumeIntervalId = setInterval(async () => {
        if (!isRecording) {
          clearInterval(resumeIntervalId);
          resumeIntervalId = null;
          return;
        }
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('[Offscreen] ✅ AudioContext auto-resumed during recording');
        }
      }, 2000); // Check every 2 seconds
      
    } catch (err) {
      console.error('[Offscreen] ❌ Web Audio API routing failed:', err);
      
      // Fallback: Try HTML5 Audio element (less reliable but worth trying)
      try {
        audioElement = new Audio();
        audioElement.srcObject = currentStream;
        audioElement.volume = 1.0;
        audioElement.muted = false; // Explicitly unmute
        audioElement.autoplay = true;
        
        await audioElement.play();
        console.log('[Offscreen] ✅ Fallback: Audio playing via HTML5 Audio element');
      } catch (audioErr) {
        console.error('[Offscreen] ❌ Both methods failed! Audio will be muted:', audioErr);
      }
    }
    
    // Determine MIME type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
    
    console.log('[Offscreen] Using MIME type:', mimeType || 'default');
    
    // Create MediaRecorder from the SAME stream
    // This ensures we record exactly what's being played
    const options = mimeType ? { mimeType, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 };
    
    try {
      mediaRecorder = new MediaRecorder(currentStream, options);
    } catch (e) {
      console.warn('[Offscreen] MediaRecorder with options failed, using default');
      mediaRecorder = new MediaRecorder(currentStream);
    }
    
    isRecording = true;
    chunkIndex = 0;
    
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        // Stream chunks immediately via WebSocket
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          
          // Send chunk via background script to WebSocket
          chrome.runtime.sendMessage({
            action: 'AUDIO_DATA',
            audioData: base64,
            audioType: event.data.type || 'audio/webm',
            streamType: 'tab',
            timestamp: Date.now(),
            chunkIndex: chunkIndex++
          }).catch(error => {
            console.error('[Offscreen] Failed to send audio chunk:', error);
          });
        };
        reader.onerror = (error) => {
          console.error('[Offscreen] FileReader error:', error);
        };
        reader.readAsDataURL(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('[Offscreen] MediaRecorder stopped');
    };
    
    mediaRecorder.onerror = (event) => {
      console.error('[Offscreen] MediaRecorder error:', event);
      chrome.runtime.sendMessage({
        action: 'TAB_RECORDING_ERROR',
        error: 'Tab audio recording error'
      });
    };
    
    mediaRecorder.start(1000);
    console.log('[Offscreen] Tab audio recording started - audio now playing through speakers');
    
    chrome.runtime.sendMessage({ action: 'TAB_RECORDING_STARTED' });
    
  } catch (error) {
    console.error('[Offscreen] Failed to start recording:', error);
    cleanup();
    throw error;
  }
}

function stopRecording() {
  if (!isRecording) {
    console.log('[Offscreen] Not recording');
    return;
  }
  
  console.log('[Offscreen] Stopping tab audio recording');
  isRecording = false;
  
  // Stop MediaRecorder
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  // Cleanup all resources immediately
  cleanup();
}

function cleanup() {
  isRecording = false;
  
  // Clear resume interval
  if (resumeIntervalId) {
    clearInterval(resumeIntervalId);
    resumeIntervalId = null;
  }
  
  // Disconnect and cleanup audio source node
  if (audioSourceNode) {
    try {
      audioSourceNode.disconnect();
    } catch (e) {
      console.warn('[Offscreen] Error disconnecting audio source:', e);
    }
    audioSourceNode = null;
  }
  
  // Stop and remove audio element
  if (audioElement) {
    audioElement.pause();
    audioElement.srcObject = null;
    audioElement = null;
  }
  
  // Close audio context
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(e => console.warn('[Offscreen] Error closing audio context:', e));
    audioContext = null;
  }
  
  // Stop stream tracks - CRITICAL: This releases tab capture access
  if (currentStream) {
    currentStream.getTracks().forEach(track => {
      track.stop();
      console.log('[Offscreen] Stopped stream track:', track.kind, track.id);
    });
    currentStream = null;
  }
  
  mediaRecorder = null;
  recordedChunks = [];
  
  console.log('[Offscreen] Cleanup complete - all resources released');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[Offscreen] Memo App offscreen document loaded');
