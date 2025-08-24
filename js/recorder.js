/**
 * Pizza Royale - Video Recorder
 * Handles automatic game recording with cross-browser compatibility
 */

/**
 * Sets up a robust MediaRecorder for the game canvas with manual frame capture
 * @param {HTMLCanvasElement} canvas - The game canvas to record
 * @returns {Object} Recorder object with enhanced controls
 */
export function setupRecorder(canvas) {
    let isRecording = false;
    let frames = [];
    let frameRate = 30; // Target FPS
    let recordingInterval;
    let startTime;

    const recorder = {
        start: (timeslice = 1000) => {
            if (isRecording) return;

            console.log('🎬 Starting manual frame recording...');
            isRecording = true;
            frames = [];
            startTime = Date.now();

            // Capture frames manually at specified FPS
            recordingInterval = setInterval(() => {
                if (!isRecording) return;

                // Convert canvas to blob and store
                canvas.toBlob((blob) => {
                    if (blob && isRecording) {
                        frames.push({
                            blob: blob,
                            timestamp: Date.now() - startTime
                        });
                    }
                }, 'image/webp', 0.9);
            }, 1000 / frameRate);
        },

        stop: () => {
            if (!isRecording) return;

            console.log(`🎬 Stopping recording. Captured ${frames.length} frames.`);
            isRecording = false;
            clearInterval(recordingInterval);

            // Process frames into video
            setTimeout(() => {
                createVideoFromFrames();
            }, 100);
        },

        requestData: () => {
            // For compatibility - no-op in manual recording
        }
    };

    // Create video from captured frames using MediaRecorder with manual stream
    async function createVideoFromFrames() {
        if (frames.length === 0) {
            alert('❌ Keine Frames aufgenommen. Spiel möglicherweise zu kurz.');
            return;
        }

        try {
            // Create a new canvas for video generation
            const videoCanvas = document.createElement('canvas');
            videoCanvas.width = canvas.width;
            videoCanvas.height = canvas.height;
            const ctx = videoCanvas.getContext('2d');

            // Try different video formats
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm';
                }
            }

            // Create stream from video canvas
            const stream = videoCanvas.captureStream(frameRate);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 8_000_000 // 8 Mbps for high quality
            });

            const videoChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    videoChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log(`🎬 Video generation complete. Creating download...`);

                if (videoChunks.length === 0) {
                    alert('❌ Video-Generierung fehlgeschlagen.');
                    return;
                }

                const videoBlob = new Blob(videoChunks, { type: mimeType });

                // Create download
                const url = URL.createObjectURL(videoBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pizza-royale-${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log('✅ Video download triggered!');
            };

            // Start recording the video canvas
            mediaRecorder.start(100);

            // Play back frames on video canvas
            console.log(`🎬 Generating video from ${frames.length} frames...`);

            let frameIndex = 0;
            const playbackInterval = setInterval(async () => {
                if (frameIndex >= frames.length) {
                    clearInterval(playbackInterval);
                    // Stop recording after all frames played
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, 500);
                    return;
                }

                const frame = frames[frameIndex];
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(frame.blob);

                frameIndex++;
            }, 1000 / frameRate);

        } catch (error) {
            console.error('❌ Video creation failed:', error);
            alert('❌ Video-Erstellung fehlgeschlagen: ' + error.message);
        }
    }

    return recorder;
}
