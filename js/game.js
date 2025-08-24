/**
 * Pizza Royale - Game Engine
 * Core game logic for the Battle Royale pizza eating competition
 */

import { setupRecorder } from './recorder.js';
import { createRecordingStatus } from './recording-setup.js';

/**
 * Main game entry point with recording integration
 * @param {Object} recordingChoice - Selected recording option from setup
 */
export async function startGameWithRecording(recordingChoice = { recorder: null, type: 'none' }) {
    return startGame(recordingChoice);
}

/**
 * Main game entry point
 * Initializes and runs the complete Pizza Royale game
 * @param {Object} recordingChoice - Optional recording configuration
 */
export async function startGame(recordingChoice = { recorder: null, type: 'none' }) {
    // === GAME CONSTANTS ===
    const WIDTH = 1080, HEIGHT = 1920;  // Instagram Reel format
    const WINNER_DISPLAY_TIME = 5.0;    // Seconds to show winner
    const MAX_ANIMATED_PLAYERS = 2000;  // Maximum animated participants for performance
    const MAX_SPEED = 18;               // Maximum avatar movement speed
    const PIZZA_CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
    const EAT_RADIUS = 150;             // Pizza eating radius
    const CULL_DURATION = 5;          // Seconds to eliminate non-animated players
    const ATTACK_BOOST_PER_BITE = 2;  // Attack increase per pizza eaten
    const pizzaImage = await loadImage('./pizza.png');
    const defaultUserImage = await loadImage('./user.jpeg');  // Default image for static players
    const defaultUserImageUrl = defaultUserImage.src;
    let PIZZA_HP_MULITPLIER = 1.5;

    // === CANVAS SETUP ===
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // === FONT LOADING ===
    // Load custom font for canvas rendering
    const fontFace = new FontFace('GT Maru Medium',
        'url("./fonts/GT-Maru-Medium.woff2") format("woff2"), url("./fonts/GT-Maru-Medium.woff") format("woff"), url("./fonts/GT-Maru-Medium.ttf") format("truetype")',
        { weight: '500', style: 'normal' }
    );

    try {
        await fontFace.load();
        document.fonts.add(fontFace);
        await document.fonts.ready;
    } catch (e) {
        console.warn('Font loading failed:', e);
    }

    const CANVAS_FONT_FAMILY = '"GT Maru Medium", system-ui, Segoe UI, Arial';

    // === UTILITY FUNCTIONS ===
    // Seeded random number generator for consistent gameplay
    const SEED = Date.now() % 1e9;
    let rng = (s => () => (s = Math.imul(48271, s) % 2147483647) / 2147483647)(SEED);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;

    // Generate position outside pizza area
    const generateSafePosition = (radius) => {
        let x, y, distFromPizza;
        const minDistFromPizza = EAT_RADIUS + radius + 20; // Extra margin

        do {
            x = radius * 3 + rng() * (WIDTH - radius * 6);
            y = radius * 3 + rng() * (HEIGHT - radius * 6);
            distFromPizza = Math.hypot(x - PIZZA_CENTER.x, y - PIZZA_CENTER.y);
        } while (distFromPizza < minDistFromPizza);

        return { x, y };
    };

    // === ROSTER LOADING ===
    // Fetch player roster from backend or use fallback data
    let roster;
    try {
        console.log('Fetching roster from API...');
        const res = await fetch('http://localhost:4000/api/roster');
        if (res.ok) {
            roster = await res.json();
            console.log(`✅ Successfully loaded ${roster.length} players from API`);
        } else {
            console.warn('API response not OK:', res.status, res.statusText);
        }
    } catch (e) {
        console.warn('Failed to load roster from API:', e);
    }

    // Fallback to generated demo players if API unavailable
    if (!Array.isArray(roster) || roster.length === 0) {
        console.log('⚠️ Using fallback demo players');
        roster = Array.from({ length: 100000 }, (_, i) => ({
            igUserId: 'p' + i,
            username: 'Player ' + (i + 1),
            avatarUrl: defaultUserImageUrl,
            baseHp: 100,
            baseArmor: 0,
            baseMass: 1.0,
            boostHp: 0,
            boostArmor: 0,
            boostShield: 0,
            eatRate: 15 + (i % 10)
        }));
    }

    // Limit roster size and ensure eatRate property
    roster = roster.map(p => ({ ...p, eatRate: p.eatRate ?? 20 }));
    const participants = roster.length;

    console.log(`🎮 Game starting with ${participants} total participants`);

    // === PERFORMANCE OPTIMIZATION FOR LARGE GROUPS ===
    // For >1000 players, only animate a subset for performance
    const animatedPlayers = participants > MAX_ANIMATED_PLAYERS
        ? roster.slice().sort(() => rng() - 0.5).slice(0, MAX_ANIMATED_PLAYERS)  // Random selection
        : roster;

    const staticPlayers = participants > MAX_ANIMATED_PLAYERS
        ? roster.filter(p => !animatedPlayers.some(ap => ap.igUserId === p.igUserId))
        : [];

    console.log(`Game setup: ${participants} total, ${animatedPlayers.length} animated, ${staticPlayers.length} static`);

    // === PIZZA HP SCALING ===
    // Dynamic pizza HP multiplier based on animated player count
    // Base: 2.5, increase by 0.1 for every 50 animated players (so 1000 players = 4.5)
    const animatedPlayerGroups = Math.floor(animatedPlayers.length / 50);
    PIZZA_HP_MULITPLIER = 1.5 + (animatedPlayerGroups * 0.08);
    console.log(`Pizza HP Multiplier adjusted: ${PIZZA_HP_MULITPLIER} (${animatedPlayers.length} animated players, ${animatedPlayerGroups} groups of 50)`);

    // Dynamic pizza HP based on ANIMATED participant count (for game balance)
    const PIZZA_HP_TOTAL = animatedPlayers.length * PIZZA_HP_MULITPLIER;  // Based on animated players only

    // === IMAGE LOADING ===
    // Load pizza image and player avatars with proxy support
    async function loadImage(url) {
        return new Promise(resolve => {
            const img = new Image();
            let imageUrl = url;

            // Set crossOrigin to prevent canvas tainting for recording
            img.crossOrigin = 'anonymous';

            // Use proxy for cross-origin images (Instagram CDN)
            if (url && /^https?:\/\//.test(url) && !url.startsWith('http://localhost') && !url.startsWith('https://localhost')) {
                imageUrl = `http://localhost:4000/api/proxy-image?url=${encodeURIComponent(url)}`;
            }

            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn('Failed to load image:', url);
                resolve(null);
            };
            img.src = imageUrl;
        });
    }


    const images = new Map();

    // Load all player avatar images (only for animated players to save memory)
    await Promise.all(animatedPlayers.map(async p => {
        const img = p.avatarUrl ? await loadImage(p.avatarUrl) : null;
        images.set(p.igUserId, img);
    }));

    // Helper function for player initials
    const initials = (name) => (name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

    // === DYNAMIC AVATAR SIZING ===
    // Avatar size scales based on number of alive players
    const avatarSizeByAlive = (n) => {
        if (n > MAX_ANIMATED_PLAYERS) return 10;
        if (n > 700) return 15;
        if (n > 500) return 35;
        if (n > 100) return 55;
        if (n > 20) return 75;
        if (n > 10) return 95;
        if (n > 5) return 105;
        return 135;
    };

    // === GAME STATE INITIALIZATION ===
    let pizzaHP = PIZZA_HP_TOTAL;
    const initialAlive = participants;        // Total participants including static (for display)
    const initialAnimated = animatedPlayers.length;  // Initial animated count (for balance)

    // Adaptive controllers for dynamic gameplay
    let damageScale = 1.0;  // Combat intensity scaling
    let eatScale = 2;     // Pizza consumption rate scaling
    let emaRate = 0;        // Exponential moving average of consumption rate
    let lastPizzaHP = pizzaHP;
    let globalEatIntensity = 1.2;  // Global eat intensity multiplier
    let lastAnimatedAliveCount = animatedPlayers.length;  // Track deaths for eat intensity

    // Endgame progression system (only active when <= 50 players)
    let endgameActive = false;  // Flag to track if endgame bonuses are active
    let endgameStartTime = 0;   // When endgame phase started

    // Avatar size caching for performance optimization
    let cachedAvatarSize = avatarSizeByAlive(participants);
    let lastSizeThreshold = participants;
    const sizeThresholds = [MAX_ANIMATED_PLAYERS + 50000, MAX_ANIMATED_PLAYERS + 10000, MAX_ANIMATED_PLAYERS, 500, 100, 20, 10, 5, 1];

    // Function to check if avatar size needs to be recalculated
    const updateAvatarSizeIfNeeded = (aliveCount) => {
        // Find which threshold we're currently in
        const currentThreshold = sizeThresholds.find(t => aliveCount > t) || 0;
        const lastThreshold = sizeThresholds.find(t => lastSizeThreshold > t) || 0;

        // Only recalculate if we crossed a threshold
        if (currentThreshold !== lastThreshold) {
            cachedAvatarSize = avatarSizeByAlive(aliveCount);
            lastSizeThreshold = aliveCount;
            console.log(`Avatar size updated: ${cachedAvatarSize}px for ${aliveCount} players`);
        }
    };

    // Initialize ANIMATED player objects with random positions and stats
    let players = animatedPlayers.map(p => {
        const initSize = cachedAvatarSize;  // Use cached size for consistency
        const R = initSize / 2;
        const pos = generateSafePosition(R);  // Generate position outside pizza area
        const ang = rng() * Math.PI * 2;

        return {
            id: p.igUserId,
            name: p.username,
            img: images.get(p.igUserId),
            x: pos.x,
            y: pos.y,
            vx: Math.cos(ang) * MAX_SPEED,
            vy: Math.sin(ang) * MAX_SPEED,
            score: 0,
            endgameScore: 0,  // Score from pizza eaten during endgame (<=50 players)
            eatRate: p.eatRate,
            hp: randInt(8, 70),      // Random health
            def: randInt(10, 20),    // Defense stat
            atk: randInt(10, 20),    // Attack stat (will increase with pizza eating)
            alive: true,
            rot: rng() * Math.PI * 2, // Rotation angle
            isAnimated: true         // Flag to identify animated players
        };
    });

    // Initialize STATIC player dots (visual only, will be culled over time)
    let staticDots = staticPlayers.map((p, index) => {
        const pos = generateSafePosition(1);  // Use minimal radius for tiny dots

        return {
            id: p.igUserId,
            name: p.username,
            x: pos.x,
            y: pos.y,
            baseX: pos.x,  // Store original position for wiggle animation
            baseY: pos.y,  // Store original position for wiggle animation
            wiggleOffset: index * 0.03,  // Even faster staggered animation
            alive: true,
            isAnimated: false,  // Static dot
            cullTime: rng() * CULL_DURATION  // Random time within cull period to die
        };
    });

    console.log(`Static dots initialized: ${staticDots.length}, will be culled over ${CULL_DURATION}s`);

    // === VIDEO RECORDING SETUP ===
    let activeRecorder = null;
    let recordingIndicator = null;

    if (recordingChoice.recorder && recordingChoice.type !== 'none') {
        activeRecorder = recordingChoice.recorder;

        // Create recording status indicator
        recordingIndicator = createRecordingStatus(activeRecorder, recordingChoice.type);

        // Start recording based on type
        if (recordingChoice.type === 'canvas') {
            // Delay canvas recording start until after first render
            setTimeout(() => {
                activeRecorder.start();
                console.log('✅ Canvas recording started after initial render');
            }, 200);
        }
    } else {
        console.log('ℹ️ No recording selected');
    }

    // Fallback recorder for compatibility (only used if canvas recording is chosen but no recorder exists)
    let fallbackRecorder = null;

    // Render initial frame
    drawBackground();
    drawPizza(ctx, PIZZA_CENTER.x, PIZZA_CENTER.y, EAT_RADIUS, 1.0, CANVAS_FONT_FAMILY, true);

    // Start fallback recording only if canvas recording was chosen but no recorder exists
    if (!activeRecorder && recordingChoice.type === 'canvas') {
        fallbackRecorder = setupRecorder(canvas);
        setTimeout(() => fallbackRecorder.start(1000), 120);
    }    // === MAIN GAME LOOP ===
    let time = 0;
    let last = performance.now();
    let gameEnded = false;
    let gameEndTime = 0;
    let gameEndReason = '';  // Track how the game ended
    let frameCount = 0; // For performance optimizations

    requestAnimationFrame(loop);

    function loop(now) {
        // Calculate delta time with clamping
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
        last = now;
        time += dt;

        // Current game state
        const animatedAliveCount = players.reduce((n, p) => n + (p.alive ? 1 : 0), 0);

        // Check if animated players died and increase eat intensity
        if (animatedAliveCount < lastAnimatedAliveCount) {
            const playersDied = lastAnimatedAliveCount - animatedAliveCount;

            // Reduce eat intensity increase during endgame to slow down pizza consumption
            const intensityIncrease = endgameActive ? 0.015 : 0.035;  // 1.5% during endgame vs 3.5% normal
            globalEatIntensity += playersDied * intensityIncrease;

            console.log(`${playersDied} players died. Global eat intensity now: ${globalEatIntensity.toFixed(2)}x ${endgameActive ? '(endgame)' : ''}`);
            lastAnimatedAliveCount = animatedAliveCount;
        }

        // Check if endgame phase should start (<=50 animated players)
        if (!endgameActive && animatedAliveCount <= 50) {
            endgameActive = true;
            endgameStartTime = time;
            console.log(`🔥 ENDGAME ACTIVATED! ${animatedAliveCount} players remaining. Pizza bonuses now active!`);

            // Reset endgame scores for all players
            for (const p of players) {
                if (p.alive) {
                    p.endgameScore = 0;
                }
            }
        }

        // Cull static dots gradually over CULL_DURATION seconds
        let dotsKilledThisFrame = 0;
        if (time <= CULL_DURATION) {
            for (const dot of staticDots) {
                if (dot.alive && dot.cullTime <= time) {
                    dot.alive = false;
                    dotsKilledThisFrame++;
                }
            }
        } else {
            // After CULL_DURATION, force all remaining static dots to die
            for (const dot of staticDots) {
                if (dot.alive) {
                    dot.alive = false;
                    dotsKilledThisFrame++;
                }
            }
        }

        // Debug logging for dot culling
        if (dotsKilledThisFrame > 0) {
            const remainingDots = staticDots.filter(d => d.alive).length;
            console.log(`Time ${time.toFixed(1)}s: Killed ${dotsKilledThisFrame} dots, ${remainingDots} remaining`);
        }

        // Calculate real alive count: animated players + remaining static dots
        const staticAliveCount = staticDots.filter(d => d.alive).length;
        const totalAliveCount = animatedAliveCount + staticAliveCount;

        // Update avatar size only when crossing thresholds (performance optimization)
        updateAvatarSizeIfNeeded(totalAliveCount);
        const AVATAR_SIZE = cachedAvatarSize;  // Use cached size instead of recalculating every frame
        const AVA_R = AVATAR_SIZE / 2;

        // Pre-clamp player positions to new radius (important when sizes change)
        for (const p of players) {
            if (!p.alive) continue;
            if (p.x < AVA_R) p.x = AVA_R;
            else if (p.x > WIDTH - AVA_R) p.x = WIDTH - AVA_R;
            if (p.y < AVA_R) p.y = AVA_R;
            else if (p.y > HEIGHT - AVA_R) p.y = HEIGHT - AVA_R;
        }

        // === ADAPTIVE CONTROLLERS ===

        // 1) Damage scaling to maintain 5-10 survivors at finish
        {
            const eatenFrac = clamp((PIZZA_HP_TOTAL - pizzaHP) / PIZZA_HP_TOTAL, 0, 1);
            const targetEndAvg = 7.5;
            const desiredAlive = targetEndAvg + (initialAnimated - targetEndAvg) * (1 - eatenFrac);
            const error = animatedAliveCount - desiredAlive;
            damageScale *= (1 + 0.6 * (error / Math.max(20, initialAnimated)));
            damageScale = clamp(damageScale, 0.7, 3.5);
        }

        // 2) Simplified eat-rate controller for consistent 20-30 second duration
        {
            const deltaConsumed = Math.max(0, lastPizzaHP - pizzaHP);
            const instRate = dt > 0 ? deltaConsumed / dt : 0;
            emaRate = emaRate ? (emaRate * 0.92 + instRate * 0.08) : instRate;

            // Target timing parameters - strict 20-30 second window
            const T_MIN = 20, T_TARGET = 25, T_MAX = 30;
            const elapsed = time;
            const remainingTarget = clamp(T_TARGET - elapsed, T_MIN - elapsed, T_MAX - elapsed);

            const desiredRateBase = pizzaHP > 0 ? (pizzaHP / Math.max(remainingTarget, 0.001)) : 0;

            // Simplified crowd-based multiplier - scale based on INITIAL player count, not current
            let crowdMult = 1.0;  // Start with neutral multiplier

            // Scale based on initial animated players to prevent rate increases as players die
            if (initialAnimated <= 50) {
                crowdMult = 0.9;  // Slightly slower for few players
            } else if (initialAnimated >= 100) {
                // Less aggressive scaling for better timing
                const excessPlayers = initialAnimated - 100;
                crowdMult = Math.max(0.15, 0.8 - (excessPlayers / 1200));  // Less aggressive scaling
            }

            const desiredRate = desiredRateBase * crowdMult;
            const currentRate = Math.max(emaRate, 0.001);
            let newEatScale = desiredRate / currentRate;

            // Remove early boost and late brake to maintain consistent timing
            eatScale = clamp(eatScale * 0.90 + newEatScale * 0.10, 0.30, 3.0);
        }

        // === GAME END CONDITION ===
        const justEnded = !gameEnded && (pizzaHP <= 0.1 || animatedAliveCount <= 1);
        if (justEnded) {
            gameEnded = true;
            gameEndTime = time;

            // Determine end reason
            if (pizzaHP <= 0.1) {
                gameEndReason = 'Pizza eaten up';
            } else if (animatedAliveCount <= 1) {
                gameEndReason = 'Only one survivor';
            }
        }

        if (gameEnded) {
            render(true, AVA_R, AVATAR_SIZE, CANVAS_FONT_FAMILY, time, totalAliveCount, gameEndReason);
            if (time - gameEndTime >= WINNER_DISPLAY_TIME) {
                // Show save data modal instead of automatically saving
                showSaveDataModal(time, gameEndReason, players, staticDots);
                return;
            }
        } else {
            step(dt, AVA_R, AVATAR_SIZE);
            render(false, AVA_R, AVATAR_SIZE, CANVAS_FONT_FAMILY, time, totalAliveCount, '');
        }        // Update DOM ranking only every 10 frames for performance
        frameCount++;
        if (frameCount % 10 === 0) {
            updateRanking();
        }
        lastPizzaHP = pizzaHP;

        requestAnimationFrame(loop);
    }

    /**
     * Game physics and logic step
     * Handles movement, collisions, combat, and pizza eating
     */
    function step(dt, AVA_R, AVATAR_SIZE) {
        // === MOVEMENT AND WALL BOUNCING ===
        // Pre-calculate pizza collision values for performance
        const pizzaCenterX = PIZZA_CENTER.x;
        const pizzaCenterY = PIZZA_CENTER.y;
        const pizzaBoundary = EAT_RADIUS - AVA_R;
        const pizzaEatZoneMin = EAT_RADIUS - AVA_R;
        const pizzaEatZoneMax = EAT_RADIUS + AVA_R;

        for (const p of players) {
            if (!p.alive) continue;

            // Apply endgame speed reduction (50% slower during endgame)
            const speedMultiplier = endgameActive ? 0.7 : 1.0;
            p.x += p.vx * speedMultiplier;
            p.y += p.vy * speedMultiplier;

            // Check pizza collision FIRST - prevent flying over pizza (optimized)
            const dx = p.x - pizzaCenterX;
            const dy = p.y - pizzaCenterY;
            const distSq = dx * dx + dy * dy; // Use squared distance to avoid sqrt
            const pizzaBoundarySq = pizzaBoundary * pizzaBoundary;

            if (distSq < pizzaBoundarySq) {
                // Player is inside pizza area, push them out
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                p.x = pizzaCenterX + nx * pizzaBoundary;
                p.y = pizzaCenterY + ny * pizzaBoundary;

                // Bounce velocity away from pizza center
                const vdot = p.vx * nx + p.vy * ny;
                if (vdot < 0) {
                    p.vx -= 2 * vdot * nx;
                    p.vy -= 2 * vdot * ny;
                }
            } let bounced = false;
            if (p.x <= AVA_R) { p.x = AVA_R; p.vx = -p.vx; bounced = true; }
            if (p.x >= WIDTH - AVA_R) { p.x = WIDTH - AVA_R; p.vx = -p.vx; bounced = true; }
            if (p.y <= AVA_R) { p.y = AVA_R; p.vy = -p.vy; bounced = true; }
            if (p.y >= HEIGHT - AVA_R) { p.y = HEIGHT - AVA_R; p.vy = -p.vy; bounced = true; }

            if (bounced) {
                const s = Math.hypot(p.vx, p.vy);
                if (s > 0) {
                    p.vx = (p.vx / s) * MAX_SPEED;
                    p.vy = (p.vy / s) * MAX_SPEED;
                }
            }
        }

        // === COLLISION DETECTION AND COMBAT (Optimized with Spatial Partitioning) ===
        // Create spatial grid for efficient collision detection
        const GRID_SIZE = AVA_R * 4; // Grid cell size
        const gridCols = Math.ceil(WIDTH / GRID_SIZE);
        const gridRows = Math.ceil(HEIGHT / GRID_SIZE);
        const grid = Array.from({ length: gridCols * gridRows }, () => []);

        // Populate grid with alive players
        const alivePlayers = players.filter(p => p.alive);
        for (const p of alivePlayers) {
            const gridX = Math.floor(p.x / GRID_SIZE);
            const gridY = Math.floor(p.y / GRID_SIZE);
            const gridIndex = gridY * gridCols + gridX;
            if (gridIndex >= 0 && gridIndex < grid.length) {
                grid[gridIndex].push(p);
            }
        }

        // Check collisions only within nearby grid cells
        for (let gridIndex = 0; gridIndex < grid.length; gridIndex++) {
            const cell = grid[gridIndex];
            if (cell.length < 2) continue; // Skip cells with 0 or 1 players

            // Check collisions within this cell
            for (let i = 0; i < cell.length; i++) {
                const A = cell[i];
                for (let j = i + 1; j < cell.length; j++) {
                    const B = cell[j];

                    const dx = B.x - A.x;
                    const dy = B.y - A.y;
                    const dist = Math.hypot(dx, dy);

                    // Calculate dynamic player sizes based on endgame pizza eaten (only active if <=50 players)
                    const pizzaBonusA = endgameActive ? Math.floor(A.endgameScore) * 0.5 : 0;  // Reduced from 2 to 0.5
                    const pizzaBonusB = endgameActive ? Math.floor(B.endgameScore) * 0.5 : 0;  // Reduced from 2 to 0.5
                    const radiusA = AVA_R + pizzaBonusA;
                    const radiusB = AVA_R + pizzaBonusB;
                    const minDist = radiusA + radiusB;

                    if (dist > 0 && dist < minDist) {
                        // Collision response
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const overlap = (minDist - dist) / 2;

                        A.x -= nx * overlap;
                        A.y -= ny * overlap;
                        B.x += nx * overlap;
                        B.y += ny * overlap;

                        // Velocity exchange
                        const avn = A.vx * nx + A.vy * ny;
                        const bvn = B.vx * nx + B.vy * ny;
                        A.vx += (bvn - avn) * nx;
                        A.vy += (bvn - avn) * ny;
                        B.vx += (avn - bvn) * nx;
                        B.vy += (avn - bvn) * ny;

                        // Speed clamping
                        const as = Math.hypot(A.vx, A.vy);
                        const bs = Math.hypot(B.vx, B.vy);
                        if (as > 0) { A.vx = (A.vx / as) * MAX_SPEED; A.vy = (A.vy / as) * MAX_SPEED; }
                        if (bs > 0) { B.vx = (B.vx / bs) * MAX_SPEED; B.vy = (B.vy / bs) * MAX_SPEED; }

                        // Combat calculations
                        const luckA = randInt(-10, 10);
                        const luckB = randInt(-10, 10);
                        const relNormSpeed = Math.abs((B.vx - A.vx) * nx + (B.vy - A.vy) * ny);
                        const intensity = 0.5 + (relNormSpeed / MAX_SPEED);

                        const dmgToA = Math.max(0, (B.atk + luckB) - A.def) * intensity * damageScale;
                        const dmgToB = Math.max(0, (A.atk + luckA) - B.def) * intensity * damageScale;

                        // Apply damage but ensure at least one survivor
                        const currentAliveCount = players.reduce((n, p) => n + (p.alive ? 1 : 0), 0);

                        if (dmgToA > 0) {
                            A.hp -= dmgToA;
                            if (A.hp <= 0) {
                                // Check if this would be the last player
                                if (currentAliveCount <= 2) {
                                    // Last battle: keep the one with less negative HP
                                    const finalHpA = A.hp;
                                    const finalHpB = B.hp - dmgToB;
                                    if (finalHpA >= finalHpB) {
                                        // A survives with 1 HP
                                        A.hp = 1;
                                        A.alive = true;
                                        if (dmgToB > 0) { B.hp -= dmgToB; if (B.hp <= 0) B.alive = false; }
                                    } else {
                                        // A dies, B will survive
                                        A.alive = false;
                                    }
                                } else {
                                    A.alive = false;
                                }
                            }
                        }
                        if (dmgToB > 0) {
                            B.hp -= dmgToB;
                            if (B.hp <= 0) {
                                // Check if this would be the last player
                                if (currentAliveCount <= 2) {
                                    // Last battle: keep the one with less negative HP
                                    const finalHpA = A.hp;
                                    const finalHpB = B.hp;
                                    if (finalHpB >= finalHpA && A.alive) {
                                        // B survives with 1 HP
                                        B.hp = 1;
                                        B.alive = true;
                                    } else if (!A.alive) {
                                        // A is already dead, B must survive
                                        B.hp = 1;
                                        B.alive = true;
                                    } else {
                                        // B dies, A survives
                                        B.alive = false;
                                    }
                                } else {
                                    B.alive = false;
                                }
                            }
                        }
                    }
                }
            }
        }

        // === PIZZA EATING MECHANICS ===
        for (const p of players) {
            if (!p.alive) continue;

            const dx = p.x - PIZZA_CENTER.x;
            const dy = p.y - PIZZA_CENTER.y;
            const d = Math.hypot(dx, dy);

            // Calculate dynamic player size based on endgame pizza eaten (only active if <=50 players)
            const pizzaBonus = endgameActive ? Math.floor(p.endgameScore) * 0.5 : 0;  // Reduced from 2 to 0.5
            const currentPlayerRadius = AVA_R + pizzaBonus;

            // Use same collision zone for both bounce and eating with dynamic player size
            if (d >= EAT_RADIUS - currentPlayerRadius && d <= EAT_RADIUS + currentPlayerRadius) {
                // Position player at rim (same as bounce logic)
                const nx = dx / d;
                const ny = dy / d;
                p.x = PIZZA_CENTER.x + nx * (EAT_RADIUS + currentPlayerRadius);
                p.y = PIZZA_CENTER.y + ny * (EAT_RADIUS + currentPlayerRadius);

                // Bounce off pizza edge (same as collision logic)
                const vdot = p.vx * nx + p.vy * ny;
                if (vdot < 0) {
                    p.vx -= 2 * vdot * nx;
                    p.vy -= 2 * vdot * ny;
                }

                // Eat pizza with adaptive scaling
                if (pizzaHP > 0) {
                    const aliveAnimatedCount = players.reduce((n, pp) => n + (pp.alive ? 1 : 0), 0);

                    let baseEat = p.eatRate * 0.035;

                    // Crowd-based eating modifier - use INITIAL player count to prevent rate increases
                    let biteCrowd = 1.0;
                    if (initialAnimated < 50) {
                        biteCrowd = Math.max(0.50, initialAnimated / 50);
                    } else if (initialAnimated > 100) {
                        // Less aggressive scaling for better timing
                        const excessPlayers = initialAnimated - 100;
                        biteCrowd = Math.max(0.08, 0.9 - (excessPlayers / 600));  // Less aggressive (8% minimum)
                    }

                    let eatAmount = baseEat * eatScale * biteCrowd * globalEatIntensity;  // Apply global eat intensity

                    // Late-game brake for few survivors (based on animated players)
                    const eatenFrac = clamp((PIZZA_HP_TOTAL - pizzaHP) / PIZZA_HP_TOTAL, 0, 1);
                    if (eatenFrac > 0.6 && aliveAnimatedCount < 25) {
                        const scarcity = clamp((25 - aliveAnimatedCount) / 25, 0, 1);
                        eatAmount *= (1 - 0.45 * scarcity);
                    }

                    // 🔥 ENDGAME MODERATE SLOWDOWN: Prevent too fast pizza consumption in final phase
                    if (endgameActive && eatenFrac > 0.85 && pizzaHP < PIZZA_HP_TOTAL * 0.10) {
                        const finalPhaseSlowdown = Math.max(0.7, 1 - (eatenFrac - 0.85) * 1.5);
                        eatAmount *= finalPhaseSlowdown;
                        console.log(`🔥 FINAL PHASE SLOWDOWN: ${finalPhaseSlowdown.toFixed(2)}x, pizzaHP: ${pizzaHP.toFixed(1)}, eatenFrac: ${eatenFrac.toFixed(2)}`);
                    }

                    if (pizzaHP >= eatAmount) {
                        p.score += eatAmount;
                        pizzaHP -= eatAmount;

                        // Track endgame score for size/stat bonuses (only when <=50 players)
                        if (endgameActive) {
                            p.endgameScore += eatAmount;
                        }

                        // ⚡ PIZZA BITE BONUSES (only active during endgame):
                        if (endgameActive) {
                            p.atk += ATTACK_BOOST_PER_BITE;  // Attack increase
                            p.hp += 1;  // HP increase by 1 point per bite
                            p.def += 0.5;  // Defense increase by 0.5 per bite

                            // Speed increase (higher boost, capped at reasonable limit)
                            const currentSpeed = Math.hypot(p.vx, p.vy);
                            if (currentSpeed > 0 && currentSpeed < MAX_SPEED * 1.8) {  // Cap at 180% of MAX_SPEED
                                const speedBoost = 1.04;  // 4% speed increase per bite
                                p.vx *= speedBoost;
                                p.vy *= speedBoost;
                            }
                        }
                    } else {
                        p.score += pizzaHP;

                        // Track endgame score for size/stat bonuses (only when <=50 players)
                        if (endgameActive) {
                            p.endgameScore += pizzaHP;
                        }

                        // ⚡ PIZZA BITE BONUSES: Even for final bite (only active during endgame)
                        if (endgameActive) {
                            p.atk += ATTACK_BOOST_PER_BITE;
                            p.hp += 1;  // HP increase by 1 point per bite
                            p.def += 0.5;  // Defense increase by 0.5 per bite

                            // Speed increase for final bite
                            const currentSpeed = Math.hypot(p.vx, p.vy);
                            if (currentSpeed > 0 && currentSpeed < MAX_SPEED * 1.8) {
                                const speedBoost = 1.04;  // 4% speed increase per bite
                                p.vx *= speedBoost;
                                p.vy *= speedBoost;
                            }
                        }
                        pizzaHP = 0;
                    }
                }
            }
        }
    }

    /**
     * Renders the complete game state
     * Draws background, pizza, players, HUD, and winner screen
     */
    function render(final, AVA_R, AVATAR_SIZE, FONT, elapsed, aliveCount, endReason = '') {
        drawBackground();

        // === STATIC DOTS RENDERING (non-animated players) ===
        // Render tiny static dots with extreme motion animation
        const aliveDots = staticDots.filter(d => d.alive);
        if (aliveDots.length > 0) {
            // Update wiggle positions every frame with extreme motion
            const wiggleTime = time * 15;  // Much faster wiggle frequency (almost double)
            const wiggleAmplitude = 25;  // Even larger wiggle amplitude (more extreme motion)

            for (const dot of aliveDots) {
                const wigglePhase = wiggleTime + dot.wiggleOffset;
                // Add more complex motion patterns for more chaotic movement
                dot.x = dot.baseX + Math.sin(wigglePhase) * wiggleAmplitude + Math.sin(wigglePhase * 2.3) * (wiggleAmplitude * 0.3);
                dot.y = dot.baseY + Math.cos(wigglePhase * 1.7) * wiggleAmplitude + Math.cos(wigglePhase * 0.7) * (wiggleAmplitude * 0.4);
            }

            // Render round dots with defaultUserImage background
            for (const dot of aliveDots) {
                ctx.save();
                ctx.translate(Math.round(dot.x), Math.round(dot.y));

                // Draw round dot with defaultUserImage
                const dotSize = 5;  // Diameter of the dot
                const dotRadius = dotSize / 2;

                ctx.beginPath();
                ctx.arc(0, 0, dotRadius, 0, 2 * Math.PI);
                ctx.clip();

                if (defaultUserImage) {
                    ctx.drawImage(defaultUserImage, -dotRadius, -dotRadius, dotSize, dotSize);
                } else {
                    // Fallback to white circle if no image
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, dotRadius, 0, 2 * Math.PI);
                    ctx.fill();
                }

                ctx.restore();
            }
        }        // === PIZZA RENDERING (now in foreground) ===
        drawPizza(ctx, PIZZA_CENTER.x, PIZZA_CENTER.y, EAT_RADIUS, pizzaHP / PIZZA_HP_TOTAL, FONT);

        // === ANIMATED PLAYERS RENDERING (with Level-of-Detail) ===
        const alivePlayers = players.filter(p => p.alive);
        const playerCount = alivePlayers.length;

        // Use LOD for performance with many players
        const useSimpleRendering = playerCount > 300;

        for (const a of alivePlayers) {
            ctx.save();
            ctx.translate(a.x, a.y);

            // Calculate player size based on endgame pizza eaten (only active if <=50 players)
            const pizzaBonus = endgameActive ? Math.floor(a.endgameScore) * 0.5 : 0;  // Reduced from 2 to 0.5
            const playerRadius = AVA_R + pizzaBonus;
            const playerSize = playerRadius * 2;

            if (useSimpleRendering) {
                // Simple rendering for many players with size bonus
                ctx.fillStyle = "#334155";
                ctx.beginPath();
                ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
                ctx.fill();

                // Simple white initial
                ctx.fillStyle = "#fff";
                ctx.font = `bold ${Math.max(8, Math.floor(playerRadius * 0.8))}px ${FONT}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(a.name ? a.name[0].toUpperCase() : "?", 0, 1);
            } else {
                // Full quality rendering for fewer players with size bonus
                a.rot = (a.rot || 0) + 0.01;
                ctx.rotate(a.rot);

                // Draw halo/shadow with increased size
                ctx.fillStyle = "#0e1a27";
                ctx.beginPath();
                ctx.arc(0, 0, playerRadius + 6, 0, Math.PI * 2);
                ctx.fill();

                // Draw avatar with increased size
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
                ctx.clip();

                if (a.img) {
                    ctx.drawImage(a.img, -playerRadius, -playerRadius, playerSize, playerSize);
                } else {
                    // Fallback to colored square with initial and increased size
                    ctx.fillStyle = "#334155";
                    ctx.fillRect(-playerRadius, -playerRadius, playerSize, playerSize);
                    ctx.fillStyle = "#fff";
                    ctx.font = `bold ${Math.max(12, Math.floor(playerRadius))}px ${FONT}`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(a.name ? a.name[0].toUpperCase() : "?", 0, 1);
                }
                ctx.restore();
            }

            // Draw HP ring only during endgame (<=50 players)
            if (endgameActive) {
                const hpRatio = Math.max(0, a.hp) / 100;
                ctx.strokeStyle = hpRatio > 0.5 ? "#41ff9e" : hpRatio > 0.2 ? "#ffc148" : "#ff4d5a";
                ctx.lineWidth = Math.max(2, Math.floor(playerRadius / 8));  // Scale with player size
                ctx.beginPath();
                ctx.arc(0, 0, playerRadius + 10, -Math.PI / 2, -Math.PI / 2 + hpRatio * 2 * Math.PI);
                ctx.stroke();
            }

            ctx.restore();
        }

        // === PERMANENT TEXT BOXES AROUND PIZZA (IN FOREGROUND) ===
        // Box above pizza: "FOLLOW TO JOIN NEXT BATTLE" with line break
        const topBoxY = PIZZA_CENTER.y - EAT_RADIUS - 220;  // Increased margin by 80px
        const topBoxWidth = 700;
        const topBoxHeight = 160;  // Increased height for two lines
        const topBoxX = (WIDTH - topBoxWidth) / 2;

        ctx.fillStyle = "rgba(0,0,0,0.9)";
        ctx.fillRect(topBoxX - 10, topBoxY - 90, topBoxWidth + 20, topBoxHeight);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = `bold 60px ${FONT}`;
        ctx.fillText("FOLLOW TO", WIDTH / 2, topBoxY - 20);
        ctx.fillText("JOIN NEXT BATTLE", WIDTH / 2, topBoxY + 40);

        // Box below pizza: "1. PIZZA BATTLE - with {{allPlayersCount}} Followers"
        const bottomBoxY = PIZZA_CENTER.y + EAT_RADIUS + 340;  // Increased margin by 80px
        const bottomBoxWidth = 700;
        const bottomBoxHeight = 100;
        const bottomBoxX = (WIDTH - bottomBoxWidth) / 2;

        ctx.fillStyle = "rgba(0,0,0,0.9)";
        ctx.fillRect(bottomBoxX - 10, bottomBoxY - 65, bottomBoxWidth + 20, bottomBoxHeight);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = `bold 50px ${FONT}`;
        ctx.fillText(`1. DAY - (${participants} Players)`, WIDTH / 2, bottomBoxY);        // === LIVE RANKING (During Game) ===
        if (!final) {
            const top3 = players.filter(p => p.alive && p.isAnimated).sort((a, b) => b.score - a.score).slice(0, 3);

            const marginTop = 270;  // Moved further down to avoid HUD overlap
            const marginLeft = 50;
            const boxWidth = 300;
            const boxHeight = Math.min(top3.length * 32 + 40, 200);

            // Background box
            ctx.fillStyle = "rgba(0,0,0,.9)";
            ctx.fillRect(marginLeft - 30, marginTop - 80, boxWidth + 80, boxHeight + 80);

            // Title
            ctx.fillStyle = "#fff";
            ctx.textAlign = "left";
            ctx.font = `bold 32px ${FONT}`;
            ctx.fillText("🏆 CURRENT TOP 3:", marginLeft, marginTop - 20);

            // Ranking rows
            ctx.font = `28px ${FONT}`;
            top3.forEach((p, i) => {
                const y = marginTop + 40 + i * 32;
                const leader = i === 0 && p.score > 0;

                ctx.fillStyle = leader ? "#ffd700" : "#ffffff";
                const name = p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name;
                ctx.fillText(`${i + 1}. ${name}`, marginLeft + 10, y);

                ctx.fillStyle = leader ? "#ffd700" : "#41ff9e";
                ctx.textAlign = "right";
                ctx.fillText(Math.round(p.score).toString(), marginLeft + boxWidth - 10, y);
                ctx.textAlign = "left";
            });
        }

        // === WINNER SCREEN ===
        if (final) {
            const aliveNow = players.filter(p => p.alive && p.isAnimated).sort((a, b) => b.score - a.score);
            const top = aliveNow[0];

            // Dark overlay - moved down 300px from original position
            const overlayY = HEIGHT * 0.3 + 300;
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            ctx.fillRect(0, overlayY, WIDTH, 500);

            if (top) {
                // Winner avatar (larger and moved up) - moved down 300px
                if (top.img) {
                    const winnerSize = Math.max(80, Math.floor(AVATAR_SIZE * 1.7));  // Increased from 3/2 to 2.5
                    const wR = winnerSize / 2;
                    const wx = WIDTH / 2;
                    const wy = overlayY + 30;  // Moved up from 50 to 30

                    ctx.save();
                    ctx.translate(wx, wy);
                    ctx.fillStyle = "#ffd700";
                    ctx.beginPath();
                    ctx.arc(0, 0, wR + 8, 0, Math.PI * 2);  // Increased border
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(0, 0, wR, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(top.img, -wR, -wR, winnerSize, winnerSize);
                    ctx.restore();
                }

                // Winner text - adjusted spacing
                ctx.fillStyle = "#ffd700";
                ctx.textAlign = "center";
                ctx.font = `bold 64px ${FONT}`;
                ctx.fillText("🏆 WINNER 🏆", WIDTH / 2, overlayY + 250);  // Moved up from 180

                ctx.fillStyle = "#fff";
                ctx.font = `bold 48px ${FONT}`;
                ctx.fillText(top.name, WIDTH / 2, overlayY + 310);  // Moved up from 240

                ctx.fillStyle = "#41ff9e";
                ctx.font = `36px ${FONT}`;
                ctx.fillText(`${Math.round(top.score)} Pizza eaten! 🍕`, WIDTH / 2, overlayY + 360);  // Moved up from 290

                // Podium - adjusted spacing
                const medals = ["🥇", "🥈", "🥉"];
                aliveNow.slice(0, 3).forEach((p, i) => {
                    ctx.fillStyle = "#fff";
                    ctx.font = `24px ${FONT}`;
                    ctx.fillText(
                        `${medals[i]} ${p.name}: ${Math.round(p.score)}`,
                        WIDTH / 2,
                        overlayY + 400 + i * 30  // Moved up from 330
                    );
                });
            }
            // Note: "No survivors" case removed - there will always be at least one survivor
        }

        // === PERMANENT INFO BOXES ===
        // Remove the old permanent info boxes since we now have them around the pizza

        // === TOP HUD: Timer and Alive Counter (RENDERED LAST FOR Z-INDEX) ===
        ctx.save();
        ctx.textAlign = "center";

        if (!final) {
            // During game: Show current time and alive count
            ctx.font = `bold 52px ${FONT}`;
            ctx.lineWidth = 6;
            ctx.strokeStyle = "#000";
            ctx.strokeText(`${elapsed.toFixed(1)}s`, WIDTH / 2, 140);  // Same Y as marginTop
            ctx.fillStyle = "#fff";
            ctx.fillText(`${elapsed.toFixed(1)}s`, WIDTH / 2, 140);

            // Alive count (smaller) - moved down accordingly
            ctx.font = `bold 32px ${FONT}`;
            ctx.lineWidth = 5;
            ctx.strokeStyle = "#000";
            ctx.strokeText(`${aliveCount} Players alive`, WIDTH / 2, 178);  // Moved down
            ctx.fillStyle = "#fff";
            ctx.fillText(`${aliveCount} Players alive`, WIDTH / 2, 178);
        } else {
            // Game finished: Show final stats
            ctx.font = `bold 52px ${FONT}`;
            ctx.lineWidth = 6;
            ctx.strokeStyle = "#000";
            ctx.strokeText(`Game took ${gameEndTime.toFixed(1)} seconds`, WIDTH / 2, 140);  // Use gameEndTime instead of elapsed
            ctx.fillStyle = "#fff";
            ctx.fillText(`Game took ${gameEndTime.toFixed(1)} seconds`, WIDTH / 2, 140);

            // Survivor count with initial count
            ctx.font = `bold 32px ${FONT}`;
            ctx.lineWidth = 5;
            ctx.strokeStyle = "#000";
            ctx.strokeText(`${aliveCount} Player(s) survived out of ${participants}`, WIDTH / 2, 178);
            ctx.fillStyle = "#fff";
            ctx.fillText(`${aliveCount} Player(s) survived out of ${participants}`, WIDTH / 2, 178);

            // Game end reason
            ctx.font = `bold 28px ${FONT}`;
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#000";
            ctx.strokeText(`Game ended: ${endReason}`, WIDTH / 2, 210);
            ctx.fillStyle = "#ffd700";
            ctx.fillText(`Game ended: ${endReason}`, WIDTH / 2, 210);
        }
        ctx.restore();
    }

    /**
     * Draws the background gradient
     */
    function drawBackground() {
        const g = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, HEIGHT / 2);
        g.addColorStop(0, '#101722');
        g.addColorStop(1, '#070a0f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    /**
     * Updates the DOM ranking sidebar
     * Only shows animated players since static dots don't have scores
     */
    function updateRanking() {
        const list = players
            .filter(p => p.alive && p.isAnimated)  // Only animated players
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        document.getElementById('rank').innerHTML = list
            .map(p => `<li>${p.name}: ${Math.round(p.score)} Pizza</li>`)
            .join('');
    }

    /**
     * Draws the pizza with consumption visualization
     */
    function drawPizza(ctx, x, y, r, ratio, FONT, first = false) {
        ctx.save();

        if (pizzaImage) {
            const size = r * 2;
            ctx.translate(x, y);
            ctx.drawImage(pizzaImage, -r, -r, size, size);

            // Draw eaten portion as black overlay
            const eaten = 1 - clamp(ratio, 0, 1);
            if (eaten > 0) {
                ctx.fillStyle = "rgba(0,0,0,1)";
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + eaten * 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Percentage indicator with stroke
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = `bold 42px ${FONT}`;
        const text = `${Math.round(ratio * 100)}% eaten`;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000";
        ctx.strokeText(text, x, y + 8);
        ctx.fillText(text, x, y + 8);

        ctx.restore();
    }

    /**
     * Saves game session data to the database
     */
    async function saveGameSession(gameDuration, endReason, allPlayers, allStaticDots) {
        try {
            console.log('💾 Saving game session data...');

            // Get winner (player with highest score among alive players)
            const alivePlayers = allPlayers.filter(p => p.alive);
            const winner = alivePlayers.length > 0
                ? alivePlayers.reduce((max, p) => p.score > max.score ? p : max)
                : null;

            // Prepare player stats for all players (animated ones)
            const playerStats = allPlayers.map((player, index) => ({
                igUserId: player.id, // player.id contains the igUserId
                username: player.name,
                pizzasEaten: Math.round(player.score * 100) / 100, // Round to 2 decimal places
                survived: player.alive,
                finalRank: player.alive ? (index + 1) : null // Simple ranking based on array order
            }));

            // Count total and survived players (including static dots)
            const totalPlayers = allPlayers.length + allStaticDots.length;
            const survivedPlayers = alivePlayers.length + allStaticDots.filter(d => d.alive).length;

            const gameData = {
                duration: Math.round(gameDuration), // Duration in seconds
                winnerId: winner?.id || null, // winner.id contains the igUserId
                winnerUsername: winner?.name || null,
                winningReason: endReason,
                totalPlayers: totalPlayers,
                survivedPlayers: survivedPlayers,
                playerStats: playerStats
            };

            console.log('📊 Game data:', gameData);

            // Create new match via backend API first (optional)
            try {
                const matchRes = await fetch('http://localhost:4000/api/matches', {
                    method: 'POST'
                });

                if (matchRes.ok) {
                    console.log('✅ Match created for game session');
                } else {
                    console.warn('⚠️ Match creation failed, but continuing with game session save');
                }
            } catch (apiError) {
                console.warn('⚠️ Match API unavailable, but continuing with game session save');
            }

            // Send to backend
            const response = await fetch('http://localhost:4000/api/game-sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Game session saved:', result.gameSessionId);
            } else {
                console.error('❌ Failed to save game session:', response.status);
            }

        } catch (error) {
            console.error('❌ Error saving game session:', error);
        }
    }

    /**
     * Shows a modal asking if the user wants to save the game data
     */
    function showSaveDataModal(gameDuration, endReason, allPlayers, allStaticDots) {
        // Create modal overlay
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

        // Get winner info for display
        const alivePlayers = allPlayers.filter(p => p.alive);
        const winner = alivePlayers.length > 0
            ? alivePlayers.reduce((max, p) => p.score > max.score ? p : max)
            : null;

        const totalPlayers = allPlayers.length + allStaticDots.length;
        const survivedPlayers = alivePlayers.length + allStaticDots.filter(d => d.alive).length;

        // Create modal panel
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: #1a1a1a;
            color: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;

        panel.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #ffd700;">🎮 Spiel beendet!</h2>
            
            <div style="text-align: left; margin: 20px 0; padding: 20px; background: #2a2a2a; border-radius: 8px;">
                <h4 style="margin-top: 0; color: #ffd700;">📊 Spiel-Statistiken</h4>
                <p><strong>Gewinner:</strong> ${winner ? winner.name : 'Keiner'}</p>
                <p><strong>Grund:</strong> ${endReason}</p>
                <p><strong>Dauer:</strong> ${Math.round(gameDuration)}s</p>
                <p><strong>Spieler:</strong> ${totalPlayers} (${survivedPlayers} überlebt)</p>
                ${winner ? `<p><strong>🍕 Pizzas gegessen:</strong> ${Math.round(winner.score * 100) / 100}</p>` : ''}
            </div>
            
            <p style="margin: 20px 0; color: #ccc;">
                Möchten Sie die Spieldaten in der Datenbank speichern?<br>
                <small>Dies wird die Pizza-Statistiken für alle überlebenden Spieler aktualisieren.</small>
            </p>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 20px;">
                <button id="save-data" style="
                    padding: 15px 25px;
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    💾 Daten speichern
                </button>
                
                <button id="skip-save" style="
                    padding: 15px 25px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                ">
                    ⏭️ Überspringen
                </button>
            </div>
            
            <div id="save-status" style="margin-top: 20px; color: #ffd700; font-weight: bold;"></div>
        `;

        modal.appendChild(panel);
        document.body.appendChild(modal);

        const statusDiv = panel.querySelector('#save-status');

        // Save Data Button
        panel.querySelector('#save-data').onclick = async () => {
            statusDiv.textContent = '💾 Speichere Daten...';

            try {
                await saveGameSession(gameDuration, endReason, allPlayers, allStaticDots);
                statusDiv.textContent = '✅ Daten erfolgreich gespeichert!';
                statusDiv.style.color = '#4CAF50';

                // Auto-close after success
                setTimeout(() => {
                    finishGameCleanup();
                    document.body.removeChild(modal);
                }, 2000);

            } catch (error) {
                statusDiv.textContent = '❌ Fehler beim Speichern: ' + error.message;
                statusDiv.style.color = '#ff6b6b';
            }
        };

        // Skip Save Button
        panel.querySelector('#skip-save').onclick = () => {
            console.log('💭 Spieler hat das Speichern übersprungen');
            finishGameCleanup();
            document.body.removeChild(modal);
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

    /**
     * Finishes game cleanup (recording, etc.)
     */
    function finishGameCleanup() {
        // Stop active recording
        if (activeRecorder) {
            if (recordingChoice.type === 'canvas') {
                activeRecorder.stop();
            }

            // Remove recording indicator
            if (recordingIndicator) {
                document.body.removeChild(recordingIndicator);
            }
        } else if (fallbackRecorder) {
            // Stop fallback recorder only if it exists
            try { fallbackRecorder.requestData(); } catch (e) { }
            fallbackRecorder.stop();
        }
    }
}
