/**
 * Pizza Royale - Enhanced Canvas Recorder
 * High-quality canvas recording with manual frame capture and optimized video generation
 */

/**
 * Creates a high-quality recorder specifically for the game canvas
 * @param {HTMLCanvasElement} canvas - The game canvas to record
 * @returns {Object} Recorder with enhanced controls
 */
export function setupCanvasRecorder(canvas) {
    let isRecording = false;
    let frameData = [];
    let startTime = null;
    let frameInterval = null;
    const targetFPS = 20; // Increased FPS for better quality
    let frameCount = 0;

    const recorder = {
        async start() {
            if (isRecording) return false;

            console.log('🎬 Starting high-quality canvas recording at 20fps...');
            console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

            isRecording = true;
            frameData = [];
            frameCount = 0;
            startTime = performance.now();

            // Capture frames at reduced intervals for better performance
            frameInterval = setInterval(() => {
                if (!isRecording) return;

                frameCount++;

                // Use requestIdleCallback to capture frames during idle time
                if (window.requestIdleCallback) {
                    requestIdleCallback(() => captureFrame(), { timeout: 50 });
                } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(() => captureFrame(), 0);
                }
            }, 1000 / targetFPS);

            return true;
        },

        stop() {
            if (!isRecording) return;

            console.log(`🎬 Stopping canvas recording. Total frames: ${frameData.length}`);
            isRecording = false;

            if (frameInterval) {
                clearInterval(frameInterval);
                frameInterval = null;
            }

            // Start video generation
            setTimeout(() => {
                this.generateVideo();
            }, 100);
        },

        async generateVideo() {
            if (frameData.length === 0) {
                alert('❌ No frames captured. Recording was too short.');
                return;
            }

            if (frameData.length < 15) {
                alert(`⚠️ Warning: Only ${frameData.length} frames captured. Video may be very short.`);
            }

            console.log(`🎬 Generating video from ${frameData.length} frames...`);

            // Create loading overlay
            const loadingOverlay = this.createLoadingOverlay();

            try {
                // Always use regular HTML canvas (OffscreenCanvas doesn't support captureStream)
                const videoCanvas = document.createElement('canvas');
                videoCanvas.width = canvas.width;
                videoCanvas.height = canvas.height;

                // Hide the video canvas
                videoCanvas.style.position = 'absolute';
                videoCanvas.style.left = '-9999px';
                videoCanvas.style.top = '-9999px';
                document.body.appendChild(videoCanvas);

                const ctx = videoCanvas.getContext('2d');

                // Check if captureStream is supported
                if (typeof videoCanvas.captureStream !== 'function') {
                    throw new Error('captureStream is not supported in this browser');
                }

                // Set up MediaRecorder with optimal settings
                const stream = videoCanvas.captureStream(targetFPS);

                // Try MP4 format first, then fall back to WebM
                let mimeType = 'video/mp4;codecs=h264';
                let fileExtension = 'mp4';

                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm;codecs=vp9';
                    fileExtension = 'webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'video/webm;codecs=vp8';
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            mimeType = 'video/webm';
                        }
                    }
                }

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: mimeType,
                    videoBitsPerSecond: 8_000_000 // 8 Mbps
                });

                const chunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    // Clean up: remove temporary canvas
                    if (videoCanvas.parentNode) {
                        document.body.removeChild(videoCanvas);
                    }

                    // Remove loading overlay
                    this.removeLoadingOverlay(loadingOverlay);

                    if (chunks.length === 0) {
                        alert('❌ Video generation failed - no data.');
                        return;
                    }

                    const blob = new Blob(chunks, { type: mimeType });
                    this.downloadAndDisplayVideo(blob, fileExtension);
                };                // Start recording
                mediaRecorder.start(100);

                // Play back frames
                let frameIndex = 0;
                const frameDuration = 1000 / targetFPS;

                const playFrame = () => {
                    if (frameIndex >= frameData.length) {
                        // All frames played, stop recording
                        setTimeout(() => {
                            mediaRecorder.stop();
                        }, 500);
                        return;
                    }

                    const frame = frameData[frameIndex];
                    const img = new Image();

                    img.onload = () => {
                        ctx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
                        ctx.drawImage(img, 0, 0);

                        frameIndex++;
                        setTimeout(playFrame, frameDuration);
                    };

                    img.onerror = () => {
                        console.error('Failed to load frame:', frameIndex);
                        frameIndex++;
                        setTimeout(playFrame, frameDuration);
                    };

                    img.src = frame.data;
                };

                // Start playback
                playFrame();

            } catch (error) {
                console.error('❌ Video generation failed:', error);

                // Remove loading overlay
                this.removeLoadingOverlay(loadingOverlay);

                // Clean up canvas if it exists
                const tempCanvas = document.querySelector('canvas[style*="-9999px"]');
                if (tempCanvas && tempCanvas.parentNode) {
                    document.body.removeChild(tempCanvas);
                }

                // Provide alternative: download frames as images
                if (error.message.includes('captureStream')) {
                    console.log('📁 captureStream not supported, offering frame download instead...');
                    this.downloadFrames();
                } else {
                    alert('Video generation failed: ' + error.message);
                }
            }
        },

        downloadAndDisplayVideo(blob, fileExtension) {
            const url = URL.createObjectURL(blob);
            const timestamp = Date.now();
            const filename = `pizza-royale-canvas-${timestamp}.${fileExtension}`;

            // Download the video
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            console.log(`✅ Canvas video download completed! (${fileExtension.toUpperCase()})`);

            // Display video below canvas
            this.displayVideoPreview(url, filename);
        },

        displayVideoPreview(videoUrl, filename) {
            // Remove any existing video preview
            const existingPreview = document.getElementById('video-preview-container');
            if (existingPreview) {
                existingPreview.remove();
            }

            // Create video preview container
            const container = document.createElement('div');
            container.id = 'video-preview-container';
            container.style.cssText = `
                margin-top: 20px;
                text-align: center;
                padding: 20px;
                background: #1a1a1a;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            `;

            // Create title
            const title = document.createElement('h3');
            title.textContent = '🎬 Your Pizza Royale Recording';
            title.style.cssText = `
                color: #ffd700;
                margin-bottom: 15px;
                font-family: "GT Maru Medium", system-ui, Arial;
            `;

            // Create video element
            const video = document.createElement('video');
            video.src = videoUrl;
            video.controls = true;
            video.autoplay = false;
            video.loop = true;
            video.style.cssText = `
                max-width: 100%;
                max-height: 400px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            `;

            // Create download link
            const downloadLink = document.createElement('a');
            downloadLink.href = videoUrl;
            downloadLink.download = filename;
            downloadLink.textContent = `📥 Download ${filename}`;
            downloadLink.style.cssText = `
                display: inline-block;
                margin-top: 15px;
                padding: 10px 20px;
                background: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-family: "GT Maru Medium", system-ui, Arial;
                transition: background 0.3s;
            `;
            downloadLink.onmouseover = () => downloadLink.style.background = '#45a049';
            downloadLink.onmouseout = () => downloadLink.style.background = '#4CAF50';

            container.appendChild(title);
            container.appendChild(video);
            container.appendChild(document.createElement('br'));
            container.appendChild(downloadLink);

            // Insert after the game canvas
            const gameCanvas = document.getElementById('game');
            if (gameCanvas && gameCanvas.parentNode) {
                gameCanvas.parentNode.insertBefore(container, gameCanvas.nextSibling);
            } else {
                document.body.appendChild(container);
            }
        },

        downloadFrames() {
            console.log('📁 Downloading individual frames as fallback...');

            frameData.forEach((frame, index) => {
                const a = document.createElement('a');
                a.href = frame.data;
                a.download = `pizza-royale-frame-${String(index).padStart(4, '0')}.jpg`;
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            alert(`📁 Downloaded ${frameData.length} individual frames. You can use video editing software to create a video from these images.`);
        },

        createLoadingOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'video-generation-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: "GT Maru Medium", system-ui, Arial;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background: #1a1a1a;
                color: white;
                padding: 40px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                max-width: 400px;
            `;

            content.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 20px;">🎬</div>
                <h2 style="color: #ffd700; margin-bottom: 15px;">Generating Video...</h2>
                <p style="margin-bottom: 20px; opacity: 0.8;">Creating your Pizza Royale recording</p>
                <div class="spinner" style="
                    border: 3px solid #333;
                    border-top: 3px solid #ffd700;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            `;

            // Add spinner animation
            if (!document.getElementById('spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            overlay.appendChild(content);
            document.body.appendChild(overlay);

            return overlay;
        },

        removeLoadingOverlay(overlay) {
            if (overlay && overlay.parentNode) {
                document.body.removeChild(overlay);
            }
        },

        isRecording() {
            return isRecording;
        }
    };

    // Optimized frame capture function
    function captureFrame() {
        if (!isRecording) return;

        try {
            // Use higher quality for better results
            const dataURL = canvas.toDataURL('image/jpeg', 0.95);

            // Validate the captured data
            if (!dataURL || dataURL === 'data:,') {
                return;
            }

            const timestamp = performance.now() - startTime;

            frameData.push({
                data: dataURL,
                timestamp: timestamp
            });

            // Log progress every 50 frames (reduced logging)
            if (frameData.length % 50 === 0) {
                console.log(`📹 Captured ${frameData.length} frames`);
            } else if (frameData.length === 1) {
                console.log('✅ First frame captured successfully!');
            }
        } catch (error) {
            console.error('Frame capture error:', error);
            // If canvas is tainted, we can't use this method
            if (error.name === 'SecurityError') {
                console.log('❌ Canvas recording failed due to CORS. Stopping recording.');
                isRecording = false;
                if (frameInterval) {
                    clearInterval(frameInterval);
                }
            }
        }
    }

    return recorder;
}
