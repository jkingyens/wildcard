function log(msg, ...args) {
    chrome.runtime.sendMessage({
        type: 'OFFSCREEN_LOG',
        message: msg,
        timestamp: new Date().toISOString()
    });
    console.log(msg, ...args);
}

let recorder;
let data = [];

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'START_RECORDING') {
        startRecording(message.streamId);
    } else if (message.type === 'START_MIC_RECORDING') {
        startMicRecording();
    } else if (message.type === 'STOP_RECORDING') {
        stopRecording();
    }
});

async function startMicRecording() {
    if (recorder && recorder.state !== 'inactive') return;

    log('[Offscreen] Starting microphone recording');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });

        log('[Offscreen] Mic stream obtained');
        setupRecorder(stream);
    } catch (e) {
        log(`[Offscreen] Mic recording failed. Name: ${e.name}, Message: ${e.message}`);
        chrome.runtime.sendMessage({
            type: 'RECORDING_ERROR',
            error: `${e.name}: ${e.message}`
        });
    }
}

function setupRecorder(stream) {
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    data = [];

    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            data.push(event.data);
        }
    };

    recorder.onstop = () => {
        log('[Offscreen] Recorder stopped, chunks: ' + data.length);
        const blob = new Blob(data, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
            chrome.runtime.sendMessage({
                type: 'AUDIO_RECORDING_RESULT',
                dataUrl: reader.result
            });
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach(t => t.stop());
    };

    recorder.start();
    log('[Offscreen] Recorder started');
    chrome.runtime.sendMessage({ type: 'RECORDING_STARTED' });
}

async function startRecording(streamId) {
    if (recorder && recorder.state !== 'inactive') return;

    log('[Offscreen] Starting recording with streamId:', streamId);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        log('[Offscreen] Stream obtained');

        // Continue playing audio in the tab while recording
        const output = new AudioContext();
        const source = output.createMediaStreamSource(stream);
        source.connect(output.destination);

        setupRecorder(stream);
    } catch (e) {
        log('[Offscreen] recording failed: ' + e.message);
        chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: e.message });
    }
}

function stopRecording() {
    log('[Offscreen] stopRecording requested, state: ' + (recorder?.state || 'undefined'));
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
        log('[Offscreen] recorder.stop() called');
    } else {
        log('[Offscreen] recorder.stop() NOT called: state is ' + (recorder?.state || 'undefined'));
    }
}
