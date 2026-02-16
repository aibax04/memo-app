# Memo App - AI-Powered Meeting Recorder

**Memo App** meeting recorder is a Chrome extension that provides intelligent dual-stream audio recording for Google Meet and Microsoft Teams meetings. It captures both your microphone and meeting audio separately, with automatic mute detection, and seamlessly uploads recordings to your Memo App backend.

![Memo App](https://img.shields.io/badge/Version-2.1.4-blue) ![Chrome](https://img.shields.io/badge/Chrome-88%2B-green) ![Manifest](https://img.shields.io/badge/Manifest-V3-orange)

---

## 🎯 Overview

Memo App transforms your meeting experience by automatically recording, processing, and organizing your meetings. With intelligent mute detection, dual-stream audio capture, and seamless cloud integration, it's your AI memory for meeting recordings.

### Key Highlights

- **🎤 Dual-Stream Recording**: Captures microphone and tab audio separately for maximum control
- **🔇 Smart Mute Detection**: Automatically detects when you mute/unmute in Google Meet or Teams
- **☁️ Cloud Integration**: Automatic upload to Memo App backend with AI processing
- **📝 Template Support**: Use custom templates or predefined ones for meeting notes
- **🚀 Bandwidth Optimized**: Intelligent compression and chunked uploads for large files
- **🔐 Secure Authentication**: Seamless login integration with token refresh
- **💾 Local Backup**: Files automatically saved to Downloads folder

---

## ✨ Features

### 🎙️ Smart Microphone Recording

- **Automatic Mute Detection**: Intelligently detects when you mute/unmute in Google Meet or Microsoft Teams
- **Platform-Specific Detection**: Uses visual indicators, button states, and audio level analysis
- **Privacy-First**: Only records your microphone when you're actually unmuted
- **Real-Time Status**: Live feedback on recording status in the extension popup

### 📺 Tab Audio Recording

- **High-Quality Capture**: Uses Chrome's `tabCapture` API for pristine audio quality
- **Independent Recording**: Works separately from microphone recording
- **Meeting Audio**: Captures all meeting participants, presentations, and system sounds
- **Automatic Playback**: Desktop audio plays through speakers during recording

### 🔇 Automatic Mute Detection

**Google Meet Detection:**
- Monitors mute button states via ARIA labels and data attributes
- Detects visual indicators (red stroke on mic icon)
- Tracks button press states and tooltip changes

**Microsoft Teams Detection:**
- Monitors `data-state` attributes (`mic-on`/`mic-off`)
- Tracks `data-tid` attributes for microphone buttons
- Detects ARIA labels and title attributes
- Fallback to audio level analysis for non-standard interfaces

**Fallback Detection:**
- Audio level analysis using Web Audio API
- RMS (Root Mean Square) calculation for accurate detection
- Adaptive thresholds for different microphone sensitivities

### 🔊 Desktop Audio Playback

- **Real-Time Playback**: Desktop audio automatically plays through speakers
- **Audio Controls**: Mute, unmute, pause, play, and volume control
- **Visual Feedback**: Status indicators in the extension popup
- **Volume Slider**: Adjustable volume control (0-100%)

### 📁 Dual File Output

Creates two separate audio files for maximum flexibility:

- **Microphone Audio**: `google_meet_mic_[timestamp].webm` or `teams_mic_[timestamp].webm`
- **Tab Audio**: `google_meet_tab_[timestamp].webm` or `teams_tab_[timestamp].webm`

Files are automatically saved to your Downloads folder with timestamps.

### ☁️ Cloud Upload & Processing

- **Automatic Upload**: Recordings automatically uploaded to Memo App backend
- **Progress Tracking**: Real-time upload progress with visual indicators
- **Chunked Uploads**: Large files uploaded in chunks for reliability
- **Bandwidth Optimization**: Intelligent compression before upload
- **Template Integration**: Associate recordings with custom or predefined templates
- **Meeting Metadata**: Title, description, and participant information

### 🛡️ Privacy & Security

- **Separate Streams**: Microphone and tab audio recorded independently
- **Mute-Aware Recording**: Microphone only records when unmuted
- **Local Storage**: Auth tokens stored securely in extension storage
- **Token Refresh**: Automatic token refresh for seamless sessions
- **No Data Leakage**: All communication happens within extension's secure context

### 🎨 Modern User Interface

- **State-Based UI**: Clean interface with distinct states (Ready, Starting, Recording, Complete)
- **Visual Feedback**: Animated status indicators and progress bars
- **Responsive Design**: Beautiful gradient-based design with smooth transitions
- **Error Handling**: User-friendly error messages and recovery options
- **Loading States**: Clear feedback during initialization and upload

---

## 🚀 Installation

### Prerequisites

- Chrome 88+ (for Manifest V3 support)
- Active internet connection for cloud features
- Microphone permissions
- Tab capture permissions

### Steps

1. **Download or Clone**
   ```bash
   git clone <repository-url>
   cd memo_meet_recorder
   ```

2. **Load Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `memo_meet_recorder` folder

3. **Grant Permissions**
   - The extension will request necessary permissions
   - Grant microphone and tab capture permissions when prompted

4. **Authenticate**
   - Click the extension icon
   - Click "Go to Login Page" if not authenticated
   - Log in at `http://localhost:5173`
   - Auth data will be automatically synced

---

## 📖 Usage Guide

### Starting a Recording

1. **Navigate to Meeting**
   - Open Google Meet (`meet.google.com`) or Microsoft Teams (`teams.microsoft.com`)
   - Join or start a meeting

2. **Open Extension**
   - Click the Memo App icon in your Chrome toolbar
   - The popup will show "Ready to Record" state

3. **Configure Meeting Details** (Optional)
   - Enter meeting title
   - Add description
   - Select a template (if available)

4. **Start Recording**
   - Click "Start Recording"
   - Wait for initialization (2-3 seconds)
   - Recording will begin automatically

### During Recording

- **Status Display**: See real-time recording status and duration
- **Mute Detection**: Extension automatically detects your mute/unmute state
- **Update Details**: You can modify meeting title, description, or template during recording
- **Stop Options**:
  - **Stop Recording**: Stops recording without saving
  - **Stop & Save**: Stops recording, saves files, and uploads to cloud

### After Recording

1. **Files Saved**: Two audio files saved to Downloads folder
2. **Upload Progress**: See upload progress in the popup
3. **Cloud Processing**: Recording processed on Memo App backend
4. **Next Steps**: 
   - Click "Record Another Meeting" to start a new recording
   - Or close the popup and access recordings in your dashboard

---

## 🏗️ Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Extension Architecture                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Popup UI   │◄────►│  Background  │                │
│  │  (popup.js)  │      │   Service    │                │
│  │              │      │  (background)│                │
│  └──────┬───────┘      └──────┬───────┘                │
│         │                      │                        │
│         │                      │                        │
│  ┌──────▼───────┐      ┌───────▼──────┐                │
│  │   Content    │      │   Offscreen   │                │
│  │   Script     │      │   Document    │                │
│  │ (content.js)│      │ (offscreen.js) │                │
│  │              │      │               │                │
│  │ • Mic Record │      │ • Tab Record  │                │
│  │ • Mute Detect│      │ • Audio Play  │                │
│  └──────────────┘      └───────────────┘                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
memo_meet_recorder/
├── manifest.json              # Extension manifest (Manifest V3)
├── background.js              # Service worker (state management, uploads)
├── content.js                 # Content script (mic recording, mute detection)
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic and UI management
├── offscreen.html             # Offscreen document HTML
├── offscreen.js               # Tab audio recording and playback
├── localhost-content.js       # Auth data sync from localhost
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                  # This file
```

### Audio Streams

1. **Microphone Stream**
   - Captured via `getUserMedia` API in content script
   - Processed through Web Audio API with gain control
   - Mute detection via platform-specific UI monitoring
   - Recorded using MediaRecorder API

2. **Tab Audio Stream**
   - Captured via `chrome.tabCapture` API
   - Processed in offscreen document
   - Automatically played through speakers
   - Recorded using MediaRecorder API

### Data Flow

```
Recording Flow:
User Action → Popup → Background → Content Script/Offscreen
                                    ↓
                              Audio Capture
                                    ↓
                              Chunk Collection
                                    ↓
                              Blob Creation
                                    ↓
                              Base64 Encoding
                                    ↓
                              Background Storage
                                    ↓
                              File Download
                                    ↓
                              Cloud Upload
```

---

## 🔧 Technical Details

### Recording Technology

- **MediaRecorder API**: For audio capture and encoding
- **Web Audio API**: For audio processing and gain control
- **Chrome TabCapture API**: For tab audio capture
- **Offscreen Documents**: For background audio processing
- **Service Workers**: For persistent state management

### Audio Formats

- **Primary**: WebM with Opus codec (`audio/webm;codecs=opus`)
- **Fallback**: WebM (`audio/webm`)
- **Alternative**: MP4 (`audio/mp4`)

### Bandwidth Optimization

- **Bitrate Control**: 
  - Microphone: 48-64 kbps (adaptive based on recording length)
  - Tab Audio: 48 kbps
- **File Compression**: Intelligent compression before upload
- **Chunked Uploads**: Files >10MB uploaded in 5MB chunks
- **Progress Tracking**: Real-time upload progress updates

### Mute Detection Algorithms

**Google Meet:**
```javascript
// Multiple detection strategies
- ARIA label analysis: "Turn on microphone" / "Turn off microphone"
- Data attributes: data-is-muted="true/false"
- Visual indicators: Red stroke on mic icon
- Button states: aria-pressed attributes
```

**Microsoft Teams:**
```javascript
// Teams-specific detection
- data-state attributes: "mic-on" / "mic-off"
- data-tid attributes: Microphone button identification
- ARIA labels: "Mute mic" / "Unmute mic"
- Fallback: Audio level analysis
```

### State Management

- **Persistent State**: Recording state saved to `chrome.storage.local`
- **Service Worker Recovery**: State restored on service worker restart
- **Tab Tracking**: Monitors active tab and handles tab switches
- **Keep-Alive Mechanism**: Prevents service worker termination during recording

---

## 🔐 Authentication

### Auth Flow

1. **Login**: User logs in at `http://localhost:5173`
2. **Token Storage**: Auth data stored in `localStorage` as `memoapp_auth_data`
3. **Extension Sync**: Content script monitors and syncs to extension storage
4. **Token Validation**: Extension validates token expiry
5. **Auto Refresh**: Automatic token refresh when expired

### Auth Data Structure

```javascript
{
  token: "access_token",
  refreshToken: "refresh_token",
  tokenExpiry: timestamp,
  isAuthenticated: true,
  user: {
    id: "user_id",
    name: "User Name",
    email: "user@example.com",
    company: "Company Name"
  }
}
```

### Security Features

- **Secure Storage**: Auth data stored in extension's local storage
- **Token Expiry**: Automatic validation and refresh
- **HTTPS Only**: All API calls use HTTPS
- **No Token Exposure**: Tokens never logged or exposed in console

---

## 📡 API Integration

### Endpoints

**Base URL**: `http://localhost:8000/api/v1`

- **Upload Recording**: `POST /web/meetings`
  - Query params: `?templateid={id}` (optional)
  - Body: FormData with audio files and metadata
  
- **Get Templates**: `GET /web/templates?active_only=true&limit=100`
  - Returns: List of available templates
  
- **Refresh Token**: `POST /auth/refresh`
  - Body: `{ refresh_token: string }`

### Upload Payload

```javascript
FormData {
  audio_file: Blob,              // Microphone audio
  second_audio_file: Blob,       // Tab audio
  title: string,                 // Meeting title
  description: string,           // Meeting description
  participants: string,          // Participant list
  custom_template_points: string // Custom template points
}
```

---

## 🛠️ Development

### Prerequisites

- Node.js (for development tools)
- Chrome browser with Developer mode enabled
- Access to Memo App API (for testing uploads)

### Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd memo_meet_recorder
   ```

2. **Load Extension**
   - Follow installation steps above
   - Enable "Developer mode" in Chrome extensions

3. **Make Changes**
   - Edit files as needed
   - Reload extension in `chrome://extensions/`
   - Test changes in a meeting environment

4. **Debug**
   - **Popup**: Right-click extension icon → "Inspect popup"
   - **Background**: Go to `chrome://extensions/` → "Service worker" link
   - **Content Script**: Open DevTools on meeting page → Sources tab
   - **Offscreen**: Check background script console for offscreen logs

### Testing

1. **Local Testing**
   - Test on `meet.google.com` or `teams.microsoft.com`
   - Use test accounts for authentication
   - Monitor console logs for errors

2. **Auth Testing**
   - See `AUTH_TESTING.md` for detailed auth testing guide
   - Test localStorage sync from `http://localhost:5173`
   - Verify token refresh mechanism

3. **Upload Testing**
   - Test with small recordings first
   - Verify chunked upload for large files
   - Check upload progress indicators

---

## 🐛 Troubleshooting

### Microphone Not Recording

**Symptoms**: No microphone audio in recording

**Solutions**:
- Check microphone permissions in Chrome settings
- Click "Request Permissions" in the popup
- Ensure you're unmuted in Google Meet/Teams
- Check browser console for errors
- Verify microphone is not being used by another application

### Tab Audio Not Recording

**Symptoms**: No meeting audio in recording

**Solutions**:
- Ensure the tab has active audio playing
- Check `tabCapture` permissions are granted
- Refresh the page and try again
- Verify you're on a supported platform (Google Meet/Teams)
- Check offscreen document is created (background console)

### Desktop Audio Not Playing

**Symptoms**: Can't hear meeting audio during recording

**Solutions**:
- Check system volume is not muted
- Ensure browser audio permissions are granted
- Refresh the page and restart recording
- Check that the tab has active audio content
- Verify offscreen document audio player is working

### Upload Fails

**Symptoms**: Recording saved but upload fails

**Solutions**:
- Check internet connection
- Verify authentication token is valid
- Check API endpoint is accessible
- Review upload progress for specific error
- Try refreshing auth token
- Check file sizes aren't too large

### Mute Detection Not Working

**Symptoms**: Microphone records even when muted

**Solutions**:
- Refresh the meeting page
- Check console for detection errors
- Verify you're on a supported platform
- Try manually muting/unmuting to trigger detection
- Check that content script is injected properly

### Extension Context Invalidated

**Symptoms**: "Extension context invalidated" errors

**Solutions**:
- Reload the extension in `chrome://extensions/`
- Refresh the meeting page
- Restart Chrome if issue persists
- Check for extension updates

---

## 📋 Permissions

### Required Permissions

- **`activeTab`**: Access current tab for recording
- **`storage`**: Store recording metadata and auth data
- **`tabs`**: Query tab information
- **`background`**: Background script functionality
- **`scripting`**: Inject content scripts
- **`downloads`**: Save audio files
- **`tabCapture`**: Capture tab audio
- **`offscreen`**: Create offscreen document for tab audio

### Host Permissions

- `https://meet.google.com/*` - Google Meet support
- `https://teams.microsoft.com/*` - Microsoft Teams support
- `https://*.teams.microsoft.com/*` - Teams subdomains
- `http://localhost:8000/*` - API endpoints
- `http://localhost:5173/*` - Frontend / Authentication

---

## 🌐 Browser Compatibility

### Supported Browsers

- **Chrome 88+** (Primary support)
- **Edge 88+** (Chromium-based, should work)
- **Opera 74+** (Chromium-based, should work)

### Required Features

- Manifest V3 support
- `tabCapture` API
- Offscreen documents
- Service workers
- MediaRecorder API
- Web Audio API

### Unsupported Browsers

- Firefox (uses different extension API)
- Safari (uses different extension API)
- Older Chrome versions (<88)

---

## 📝 Changelog

### Version 1.0.2

- ✅ Dual-stream recording (microphone + tab audio)
- ✅ Automatic mute detection for Google Meet and Teams
- ✅ Cloud upload with progress tracking
- ✅ Template support for meeting notes
- ✅ Bandwidth optimization and chunked uploads
- ✅ Authentication with token refresh
- ✅ Modern UI with state management
- ✅ Local file backup to Downloads

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly** on Google Meet and Teams
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Code Style

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Follow existing code patterns
- Test on both Google Meet and Teams

---

## 📄 License

This project is open source and available under the MIT License. 

---

## 🔗 Links

- **Frontend (login)**: [http://localhost:5173](http://localhost:5173)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Support**: Contact support through the extension dashboard

---

## 💡 Tips & Best Practices

### For Best Recording Quality

1. **Stable Connection**: Ensure stable internet for uploads
2. **Close Unnecessary Tabs**: Reduces system resource usage
3. **Grant All Permissions**: Allow all requested permissions
4. **Keep Extension Open**: Don't close popup during upload
5. **Check Mute Status**: Verify mute detection is working

### For Optimal Performance

1. **Regular Updates**: Keep extension updated
2. **Clear Old Recordings**: Remove old files from Downloads
3. **Monitor Storage**: Check extension storage usage
4. **Test Before Important Meetings**: Test recording before critical meetings

### Privacy Considerations

1. **Mute When Needed**: Extension respects your mute state
2. **Review Recordings**: Check recordings before sharing
3. **Secure Storage**: Auth tokens stored locally only
4. **No Data Collection**: Extension doesn't collect usage data

---

## 🎓 How It Works

### Recording Process

1. **Initialization**: Extension checks authentication and permissions
2. **Stream Setup**: Creates microphone and tab audio streams
3. **Mute Detection**: Starts monitoring mute/unmute state
4. **Recording**: Captures audio chunks every 1-3 seconds
5. **Processing**: Converts chunks to Blob format
6. **Storage**: Saves to Downloads and prepares for upload
7. **Upload**: Uploads to cloud with progress tracking
8. **Completion**: Recording available in dashboard

### Mute Detection Process

1. **Platform Detection**: Identifies Google Meet or Teams
2. **UI Monitoring**: Observes button states and attributes
3. **State Analysis**: Determines current mute state
4. **Gain Control**: Adjusts microphone gain (0 for muted, 1 for unmuted)
5. **Verification**: Double-checks gain was applied correctly
6. **Continuous Monitoring**: Repeats every 500ms during recording

---

## 🚨 Known Issues

- **Service Worker Termination**: Service worker may terminate during long recordings (mitigated with keep-alive)
- **Tab Reload**: Recording stops if tab is reloaded (state is saved for recovery)
- **Large File Uploads**: Very large files (>100MB) may take longer to upload
- **Teams Detection**: Some Teams UI variations may not be detected (fallback to audio analysis)

---

## 📞 Support

For issues, questions, or feature requests:

1. Check this README for solutions
2. Review troubleshooting section
3. Check browser console for errors
4. Contact support through extension dashboard

---

**Made with ❤️ for better meeting experiences**
