/**
 * Pizza Royale - Recording Setup
 * Pre-game recording setup with user choice and permissions
 */

import { setupCanvasRecorder } from './canvas-recorder.js';

/**
 * Shows recording options dialog before game starts
 * @param {HTMLCanvasElement} canvas - The game canvas
 * @returns {Promise<Object>} Selected recorder and start permission
 */
export async function setupRecordingChoice(canvas) {
    return new Promise((resolve) => {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
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

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1a1a1a;
            color: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;

        dialog.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #ffd700;">🎬 Video Recording Setup</h2>
            <p style="margin-bottom: 30px; line-height: 1.6;">
                Choose if you want to record your Pizza Battle:
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button id="canvas-record" style="
                    padding: 15px 20px;
                    background: #4444ff;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s;
                ">
                    🎮 Record Game Video
                    <br><small style="opacity: 0.8;">Records the game as MP4 video</small>
                </button>
                
                <button id="no-record" style="
                    padding: 15px 20px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background 0.3s;
                ">
                    ⏭️ Skip Recording
                    <br><small style="opacity: 0.8;">Start game without recording</small>
                </button>
            </div>
            
            <div id="status" style="margin-top: 20px; color: #ffd700;"></div>
        `;

        modal.appendChild(dialog);
        document.body.appendChild(modal);

        const statusDiv = dialog.querySelector('#status');

        // Canvas recording option
        dialog.querySelector('#canvas-record').onclick = async () => {
            statusDiv.textContent = '🔄 Setting up canvas recording...';

            try {
                const canvasRecorder = setupCanvasRecorder(canvas);
                statusDiv.textContent = '✅ Canvas recording ready! Starting game...';

                setTimeout(() => {
                    document.body.removeChild(modal);
                    resolve({
                        recorder: canvasRecorder,
                        type: 'canvas',
                        ready: true
                    });
                }, 1000);
            } catch (error) {
                statusDiv.textContent = '❌ Canvas recording setup failed.';
                console.error('Canvas recording error:', error);
            }
        };

        // No recording option
        dialog.querySelector('#no-record').onclick = () => {
            statusDiv.textContent = '⏭️ Starting game without recording...';

            setTimeout(() => {
                document.body.removeChild(modal);
                resolve({
                    recorder: null,
                    type: 'none',
                    ready: true
                });
            }, 500);
        };

        // Add hover effects
        const buttons = dialog.querySelectorAll('button');
        buttons.forEach(button => {
            button.onmouseenter = () => {
                button.style.transform = 'scale(1.05)';
            };
            button.onmouseleave = () => {
                button.style.transform = 'scale(1)';
            };
        });
    });
}

/**
 * Creates a recording status indicator during the game
 * @param {Object} recorder - The active recorder
 * @param {string} type - Recording type ('screen', 'canvas', 'none')
 * @returns {HTMLElement} Status indicator element
 */
export function createRecordingStatus(recorder, type) {
    if (type === 'none' || !recorder) return null;

    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 10px 15px;
        border-radius: 20px;
        font-family: "GT Maru Medium", system-ui, Arial;
        font-size: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;

    const dot = document.createElement('div');
    dot.style.cssText = `
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: blink 1s infinite;
    `;

    // Add blinking animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
        }
    `;
    document.head.appendChild(style);

    indicator.appendChild(dot);
    indicator.appendChild(document.createTextNode(`Recording ${type}`));

    document.body.appendChild(indicator);

    return indicator;
}
