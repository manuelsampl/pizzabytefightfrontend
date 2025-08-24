/**
 * Pizza Royale - Menu Handler
 * Manages the main menu interactions and game initialization
 */

import { setupRecordingChoice } from './recording-setup.js';

/**
 * Initializes the main menu functionality
 * Sets up event listeners for start game, import, and admin buttons
 */
export function initializeMenu() {
    const mainMenu = document.getElementById('main-menu');
    const startBtn = document.getElementById('startFightBtn');
    const importBtn = document.getElementById('importBtn');
    const adminBtn = document.getElementById('adminBtn');

    // Import Button - Redirects to Instagram follower import page
    importBtn.onclick = () => {
        window.location.href = 'import.html';
    };

    // Admin Button - Shows admin panel with database operations
    adminBtn.onclick = () => {
        showAdminPanel();
    };

    // Start Game Button - Shows recording setup before starting game
    startBtn.onclick = async () => {
        try {
            // Hide main menu
            mainMenu.style.display = 'none';

            // Get canvas element for recording setup
            const canvas = document.getElementById('game');

            // Show recording choice dialog and wait for user selection
            const recordingChoice = await setupRecordingChoice(canvas);

            if (recordingChoice.ready) {
                // Start the game with selected recording option
                const { startGameWithRecording } = await import('./game.js');
                await startGameWithRecording(recordingChoice);
            } else {
                // User cancelled or setup failed, return to menu
                mainMenu.style.display = 'flex';
            }

        } catch (error) {
            console.error('Error in game startup:', error);
            alert('Fehler beim Starten des Spiels: ' + error.message);
            mainMenu.style.display = 'flex';
        }
    };
}

/**
 * Shows the admin panel with database management options
 */
async function showAdminPanel() {
    // Create admin modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: "GT Maru Medium", system-ui, Arial;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
        background: #1a1a1a;
        color: white;
        padding: 40px;
        border-radius: 15px;
        text-align: center;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;

    // Load current stats
    let statsHtml = '<p>Loading statistics...</p>';
    try {
        const response = await fetch('http://localhost:4000/api/admin/stats');
        if (response.ok) {
            const stats = await response.json();
            statsHtml = `
                <div style="text-align: left; margin: 20px 0; padding: 20px; background: #2a2a2a; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #ffd700;">📊 Database Statistics</h4>
                    <p><strong>Users:</strong> ${stats.userCount}</p>
                    <p><strong>Matches:</strong> ${stats.matchCount}</p>
                    <p><strong>Game Sessions:</strong> ${stats.gameSessionCount}</p>
                    <p><strong>🍕 Total Pizzas Eaten:</strong> ${Math.round(stats.totalPizzasEaten * 100) / 100}</p>
                    
                    ${stats.recentSessions.length > 0 ? `
                        <h4 style="color: #ffd700;">🏆 Recent Games</h4>
                        ${stats.recentSessions.slice(0, 3).map(session => `
                            <div style="margin: 10px 0; padding: 10px; background: #333; border-radius: 5px; font-size: 14px;">
                                <strong>${session.winnerUsername || 'No winner'}</strong> - ${session.winningReason}<br>
                                <small>${session.totalPlayers} players, ${session.survivedPlayers} survived, ${session.durationSec || session.duration}s duration</small>
                            </div>
                        `).join('')}
                    ` : ''}
                </div>
            `;
        }
    } catch (error) {
        statsHtml = '<p style="color: #ff6b6b;">❌ Failed to load statistics</p>';
    }

    panel.innerHTML = `
        <h2 style="margin-bottom: 20px; color: #ffd700;">🔐 Admin Panel</h2>
        
        ${statsHtml}
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
            <button id="reset-database" style="
                padding: 15px 20px;
                background: linear-gradient(45deg, #e74c3c, #c0392b);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
            ">
                🗑️ Reset Database (Delete All Data)
            </button>
            
            <button id="close-admin" style="
                padding: 10px 20px;
                background: #666;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.3s;
            ">
                ✕ Close
            </button>
        </div>
        
        <div id="admin-status" style="margin-top: 20px; color: #ffd700; font-weight: bold;"></div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    const statusDiv = panel.querySelector('#admin-status');

    // Reset Database Button
    panel.querySelector('#reset-database').onclick = async () => {
        const confirmed = confirm(
            '⚠️ WARNING: This will permanently delete ALL data from the database!\n\n' +
            'This includes:\n' +
            '• All users and Instagram followers\n' +
            '• All matches and participants\n' +
            '• All game sessions and statistics\n' +
            '• All engagements\n\n' +
            'This action cannot be undone. Are you sure?'
        );

        if (!confirmed) return;

        // Double confirmation
        const doubleConfirmed = confirm('Are you REALLY sure? This will delete EVERYTHING!');
        if (!doubleConfirmed) return;

        statusDiv.textContent = '🗑️ Deleting all data...';

        try {
            const response = await fetch('http://localhost:4000/api/admin/reset-database', {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                statusDiv.textContent = '✅ Database reset completed successfully!';
                statusDiv.style.color = '#4CAF50';

                // Refresh stats after a delay
                setTimeout(() => {
                    document.body.removeChild(modal);
                    showAdminPanel(); // Reload with fresh stats
                }, 2000);
            } else {
                statusDiv.textContent = '❌ Failed to reset database';
                statusDiv.style.color = '#ff6b6b';
            }
        } catch (error) {
            statusDiv.textContent = '❌ Error: ' + error.message;
            statusDiv.style.color = '#ff6b6b';
        }
    };

    // Close Button
    panel.querySelector('#close-admin').onclick = () => {
        document.body.removeChild(modal);
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    // Add hover effects
    const buttons = panel.querySelectorAll('button');
    buttons.forEach(button => {
        button.onmouseenter = () => {
            button.style.transform = 'scale(1.05)';
        };
        button.onmouseleave = () => {
            button.style.transform = 'scale(1)';
        };
    });
}
