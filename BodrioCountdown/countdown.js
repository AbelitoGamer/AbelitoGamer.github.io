// Dark mode effect for last 60-50 seconds
let darkModeTimeout = null;
let darkModeActive = false;
// State variables
let timeOffset = 0; // Difference between server time and local time
let targetTimestamp = null;
let eventTzName = "Event";
let config = null;

// Load configuration from the window.lastLoadedData (set by main.js)
async function loadConfig() {
    try {
        // Wait for main.js to load the data
        await new Promise(resolve => {
            const checkData = () => {
                const data = window.lastLoadedData;
                if (data && data.countdown) {
                    config = data.countdown;
                    resolve();
                } else {
                    setTimeout(checkData, 100);
                }
            };
            checkData();
        });

        // Update event name display
        document.getElementById('eventName').textContent = config.eventName;
    } catch (error) {
        console.error('Error loading configuration:', error);
    }
}

// Get user's local timezone name
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

async function syncTime() {
    try {
        if (!config) {
            throw new Error('Configuration not loaded');
        }

        // Fetch current time in the event's timezone
        const response = await fetch(`https://worldtimeapi.org/api/timezone/${config.eventTimezone}`);
        const data = await response.json();
        
        // Get the current time in the target timezone
        const serverTime = new Date(data.datetime).getTime();
        const localTime = new Date().getTime();
        
        // Calculate offset between server time and local time
        timeOffset = serverTime - localTime;

        // Create target date in the specified timezone
        const targetDateString = `${config.targetYear}-${String(config.targetMonth).padStart(2, '0')}-${String(config.targetDay).padStart(2, '0')}T${String(config.targetHour).padStart(2, '0')}:${String(config.targetMinute).padStart(2, '0')}:${String(config.targetSecond).padStart(2, '0')}${data.datetime.slice(19)}`;
        targetTimestamp = new Date(targetDateString).getTime();

        // Set event timezone display name
        eventTzName = config.eventTimezone.split('/')[1].replace('_', ' ');
        document.getElementById('eventTzName').textContent = eventTzName;

        // Update time displays
        updateTimeDisplays();

        // Start the countdown
        updateCountdown();
        setInterval(updateCountdown, 1000);
        setInterval(updateTimeDisplays, 1000);
    } catch (error) {
        document.getElementById('countdown').innerHTML = '<div class="error">⚠️ Could not sync time. Please check your internet connection.</div>';
        console.error('Time sync error:', error);
    }
}


let lastSecond = null;
let tickAudio = null;
let oneMinuteAudio = null;
const ONE_MINUTE_AUDIO_PATH = '../Resources/audio/BodrioCollection/One Minute to MCC!.ogg';
const ONE_MINUTE_AUDIO_LENGTH = 59; // seconds (audio is now 59s)
const ONE_MINUTE_DURATION = 59; // seconds (play for last 59 seconds)
let oneMinuteStarted = false;
let oneMinuteFadeInterval = null;

let domeAudio = null;
const DOME_AUDIO_PATH = '../Resources/audio/BodrioCollection/Decision Dome.ogg';
let domeFadeInterval = null;
let domeStarted = false;

// Preload the one minute and dome audio on script load
function preloadOneMinuteAudio() {
    if (!oneMinuteAudio) {
        oneMinuteAudio = new Audio(ONE_MINUTE_AUDIO_PATH);
        oneMinuteAudio.preload = 'auto';
        oneMinuteAudio.volume = 0.5;
        oneMinuteAudio.load();
    }
}
function preloadDomeAudio() {
    if (!domeAudio) {
        domeAudio = new Audio(DOME_AUDIO_PATH);
        domeAudio.preload = 'auto';
        domeAudio.volume = 0.5;
        domeAudio.loop = true;
        domeAudio.load();
    }
}
preloadOneMinuteAudio();
preloadDomeAudio();

function updateCountdown() {
    // Get current time adjusted by the offset
    const now = new Date().getTime() + timeOffset;
    const distance = targetTimestamp - now;
    // Calculate seconds left
    let days = Math.floor(distance / (1000 * 60 * 60 * 24));
    let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((distance % (1000 * 60)) / 1000);
    let totalSecondsLeft = Math.floor(distance / 1000);

    // Dark mode for last 59 seconds and after
    if (totalSecondsLeft === 59 && !darkModeActive) {
        document.body.classList.add('countdown-darkmode');
        darkModeActive = true;
    }
    // If event has started and dark mode was triggered, keep it
    if (distance < 0 && darkModeActive) {
        document.body.classList.add('countdown-darkmode');
    }
    if (distance < 0) {
    document.getElementById('countdown').innerHTML = '<button class="gamebanana-btn" onclick="window.open(\'https://gamebanana.com/mods/623463\', \'_blank\')"><img src=\'https://cdn.brandfetch.io/idR3RhicYy/w/32/h/32/theme/dark/logo.png?c=1bxid64Mup7aczewSAYMX&t=1756464458605\' alt=\'GameBanana\' style=\'height:1.3em;vertical-align:middle;margin-right:0.5em;\'>Disponible en gamebanana</button>';
        // Show mute button and update its state
        const muteBtn = document.getElementById('muteButton');
        if (muteBtn) {
            muteBtn.style.display = '';
            muteBtn.innerHTML = domeAudio && domeAudio.muted ? '<i class="fas fa-volume-up"></i> Unmute' : '<i class="fas fa-volume-mute"></i> Mute';
            // Attach handler only once
            if (!muteBtn._handlerAttached) {
                muteBtn.addEventListener('click', function() {
                    if (domeAudio) {
                        domeAudio.muted = !domeAudio.muted;
                        muteBtn.innerHTML = domeAudio.muted ? '<i class="fas fa-volume-up"></i> Unmute' : '<i class="fas fa-volume-mute"></i> Mute';
                    }
                });
                muteBtn._handlerAttached = true;
            }
        }
        if (oneMinuteAudio && !oneMinuteAudio.paused) {
            oneMinuteAudio.pause();
        }
        // Play Decision Dome music
        preloadDomeAudio();
        if (!domeStarted) {
            // User is present at the moment event starts: play at 50% volume, no fade
            domeAudio.currentTime = 0;
            domeAudio.volume = 0.5;
            domeAudio.play();
            domeStarted = true;
        }
        return;
    } else {
        // Hide mute button if not event time
        const muteBtn = document.getElementById('muteButton');
        if (muteBtn) muteBtn.style.display = 'none';
    }

    // (Declarations moved above, do not redeclare)

    // Handle ticking and one minute music
    if (totalSecondsLeft > ONE_MINUTE_DURATION) {
        // Normal ticking
        if (oneMinuteAudio && !oneMinuteAudio.paused) {
            oneMinuteAudio.pause();
            oneMinuteAudio.currentTime = 0;
        }
        oneMinuteStarted = false;
        if (domeAudio && !domeAudio.paused) {
            domeAudio.pause();
            domeAudio.currentTime = 0;
        }
        domeStarted = false;
        if (lastSecond !== null && seconds !== lastSecond) {
            if (!tickAudio) {
                tickAudio = new Audio('..\/Resources\/audio\/BodrioCollection\/Tick.ogg');
            }
            tickAudio.currentTime = 0;
            tickAudio.play();
        }
    } else {
        // Last 59 seconds: stop ticking, play/sync music
        preloadOneMinuteAudio();
        if (domeAudio && !domeAudio.paused) {
            domeAudio.pause();
            domeAudio.currentTime = 0;
        }
        domeStarted = false;
        if (!oneMinuteStarted) {
            // Audio is now 59s, so sync directly to seconds left
            let offset = ONE_MINUTE_DURATION - totalSecondsLeft;
            if (offset < 0) offset = 0;
            if (offset > ONE_MINUTE_AUDIO_LENGTH) offset = ONE_MINUTE_AUDIO_LENGTH;
            oneMinuteAudio.currentTime = offset;
            oneMinuteAudio.volume = 0.5;
            oneMinuteAudio.play();
            // Fade in
            if (oneMinuteFadeInterval) clearInterval(oneMinuteFadeInterval);
            let fadeStep = 0.05;
            oneMinuteFadeInterval = setInterval(() => {
                if (oneMinuteAudio.volume < 0.5) {
                    oneMinuteAudio.volume = Math.min(0.5, oneMinuteAudio.volume + fadeStep);
                } else {
                    clearInterval(oneMinuteFadeInterval);
                }
            }, 100);
            oneMinuteStarted = true;
        } else if (oneMinuteAudio.paused) {
            // If paused (e.g. user resumes tab), sync position
            let offset = ONE_MINUTE_DURATION - totalSecondsLeft;
            if (offset < 0) offset = 0;
            if (offset > ONE_MINUTE_AUDIO_LENGTH) offset = ONE_MINUTE_AUDIO_LENGTH;
            oneMinuteAudio.currentTime = offset;
            oneMinuteAudio.volume = 0.5;
            oneMinuteAudio.play();
            // Fade in again
            if (oneMinuteFadeInterval) clearInterval(oneMinuteFadeInterval);
            let fadeStep = 0.05;
            oneMinuteFadeInterval = setInterval(() => {
                if (oneMinuteAudio.volume < 0.5) {
                    oneMinuteAudio.volume = Math.min(0.5, oneMinuteAudio.volume + fadeStep);
                } else {
                    clearInterval(oneMinuteFadeInterval);
                }
            }, 100);
        }
    }
    lastSecond = seconds;

    // If user enters after event has started, play Decision Dome with fade in
    if (distance < 0 && !domeStarted) {
        preloadDomeAudio();
        domeAudio.currentTime = 0;
        domeAudio.volume = 0;
        domeAudio.play();
        if (domeFadeInterval) clearInterval(domeFadeInterval);
        let fadeStep = 0.05;
        domeFadeInterval = setInterval(() => {
            if (domeAudio.volume < 0.5) {
                domeAudio.volume = Math.min(0.5, domeAudio.volume + fadeStep);
            } else {
                clearInterval(domeFadeInterval);
            }
        }, 100);
        domeStarted = true;
    }

    // Update countdown display, hiding units that are zero and no longer needed
    let html = '';
    if (days > 0) {
        html += `<div class="time-unit">
            <span class="time-value">${days}</span>
            <span class="time-label">Days</span>
        </div>`;
    }
    if (hours > 0 || days > 0) {
        html += `<div class="time-unit">
            <span class="time-value">${hours}</span>
            <span class="time-label">Hours</span>
        </div>`;
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        html += `<div class="time-unit">
            <span class="time-value">${minutes}</span>
            <span class="time-label">Minutes</span>
        </div>`;
    }
    html += `<div class="time-unit">
        <span class="time-value">${seconds}</span>
        <span class="time-label">Seconds</span>
    </div>`;
    document.getElementById('countdown').innerHTML = html;
}

function updateTimeDisplays() {
    if (!targetTimestamp) return;

    // Current time in user's own timezone
    const now = new Date();
    const userTimeString = now.toLocaleString('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    // Format as 'Month Day, Year at HH:MM:SS AM/PM'
    // userTimeString is like 'October 4, 2025, 04:14:14 AM'
    // We want to keep the comma between date and time, not add 'at'
    document.getElementById('currentEventTime').textContent = userTimeString;
    // Update label to user's timezone name
    const tzLabel = document.getElementById('eventTzName');
    if (tzLabel) {
        tzLabel.textContent = userTimezone.replace(/_/g, ' ');
    }

    // Target time in user's local timezone
    const targetLocalTime = new Date(targetTimestamp);
    const localTimeString = targetLocalTime.toLocaleString('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    document.getElementById('targetLocalTime').textContent = localTimeString;
}

// Initialize on document load
async function initialize() {
    try {
        // Wait for main.js to initialize first
        await new Promise(resolve => {
            const checkInit = () => {
                if (document.querySelector('.topbar .nav-item')) {
                    resolve();
                } else {
                    setTimeout(checkInit, 100);
                }
            };
            checkInit();
        });

        await loadConfig();
        await syncTime();
        // Initial updates
        updateTimeDisplays();
        updateCountdown();
        // Set up intervals
        setInterval(updateTimeDisplays, 1000);
        setInterval(updateCountdown, 1000);
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('countdown').innerHTML = '<div class="error">⚠️ Could not initialize countdown. Please refresh the page.</div>';
    }
}

// Wait for main.js to load before initializing countdown
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}