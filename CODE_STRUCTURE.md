# Pizza Royale - Code Structure Documentation

## Overview
Pizza Royale ist ein Browser-basiertes Battle Royale Spiel, bei dem Instagram Follower als Avatare um eine Pizza kämpfen. Das Spiel wird automatisch als Video aufgezeichnet und für Instagram Stories optimiert.

## Dateistruktur

### Frontend
```
frontend/
├── index.html          # Haupt-HTML Datei (sauber refactoriert)
├── import.html         # Instagram Follower Import Seite
├── pizza.png          # Pizza Grafik für das Spiel
├── css/
│   └── main.css       # Alle Styles für die Anwendung
├── js/
│   ├── app.js         # Haupt-Eingangsschritt der Anwendung
│   ├── menu.js        # Menu-Verwaltung und Navigation
│   ├── game.js        # Haupt-Spiellogik und Canvas Rendering
│   └── recorder.js    # Video-Aufnahme Funktionalität
└── fonts/
    ├── GT-Maru-Medium.woff2
    ├── GT-Maru-Medium.woff
    └── GT-Maru-Medium.ttf
```

## Code-Module Übersicht

### 1. app.js - Application Entry Point
**Zweck**: Initialisiert die gesamte Anwendung
- Startet das Menu-System
- Koordiniert alle Module
- Behandelt DOM-Ready Events

### 2. menu.js - Menu Handler
**Zweck**: Verwaltet das Hauptmenü und die Navigation
- **Import Button**: Weiterleitung zur Follower-Import Seite
- **Start Button**: Startet ein neues Spiel via Backend API
- **Fallback**: Demo-Modus falls Backend nicht verfügbar

### 3. game.js - Game Engine
**Zweck**: Komplette Spiellogik und Rendering
#### Hauptkomponenten:
- **Canvas Setup**: 1080x1920px (Instagram Reel Format)
- **Font Loading**: Custom GT Maru Medium Font
- **Roster Loading**: Lädt Spieler vom Backend oder Fallback-Daten
- **Dynamic Scaling**: Avatar-Größe passt sich Spieleranzahl an
- **Physics Engine**: Bewegung, Kollisionen, Kampf-System
- **Adaptive Controllers**: 
  - Damage Scaling für optimale Überlebenden-Anzahl
  - Eat-Rate Controller für 20-30 Sekunden Spielzeit
- **Rendering**: Canvas-basierte Grafiken mit HUD und Rankings
- **Winner Screen**: 5-Sekunden Gewinner-Anzeige

#### Spielmechaniken:
- **Movement**: Spieler bewegen sich mit konstanter Geschwindigkeit
- **Combat**: Kollisions-basiertes Kampfsystem mit HP/Attack/Defense
- **Pizza Eating**: Spieler essen Pizza am Rand, erhalten Punkte
- **Survival**: Letzter Überlebender oder höchste Punktzahl gewinnt

### 4. recorder.js - Video Recording
**Zweck**: Automatische Spielaufnahme
- **Format Detection**: MP4 > WebM VP9 > WebM VP8 > WebM fallback
- **High Quality**: 60fps, 6 Mbps Bitrate
- **Robust Recording**: Timeslicing, Error Handling
- **Auto Download**: Automatischer Download nach Spielende

### 5. main.css - Styles
**Zweck**: Komplettes UI Styling
#### Hauptbereiche:
- **Font Definitions**: GT Maru Medium Custom Font
- **Layout**: Dark theme, centered canvas
- **Main Menu**: Gradient buttons, animations
- **Game UI**: Overlay-System, ranking boards
- **Responsive**: Desktop-optimierte 9:16 Skalierung

## Technische Details

### Canvas Rendering (game.js)
- **Coordinate System**: 1080x1920 pixels (Instagram format)
- **Dynamic Avatar Sizing**: Größe basiert auf lebenden Spielern
- **Image Loading**: Async mit Proxy für Cross-Origin Support
- **Performance**: RequestAnimationFrame-basierte Game Loop

### Video Recording (recorder.js)
- **MediaRecorder API**: Browser-native Aufnahme
- **Format Priority**: MP4 bevorzugt, WebM als Fallback
- **Quality Settings**: 6 Mbps für Instagram-kompatible Qualität
- **Error Handling**: Graceful Degradation bei unsupported formats

### Styling Architecture (main.css)
- **CSS Custom Properties**: Wiederverwendbare Farben und Größen
- **Flexbox Layout**: Responsive Menu und UI Komponenten
- **Backdrop Filter**: Moderne Blur-Effekte für UI Elemente
- **CSS Gradients**: Attraktive Button und Background Designs

## API Integration

### Backend Endpoints
- `POST /api/matches` - Startet ein neues Spiel
- `GET /api/roster` - Lädt die Spieler-Liste
- `GET /api/proxy-image` - Proxy für Instagram CDN Bilder

### Error Handling
- Graceful Fallback zu Demo-Daten wenn Backend nicht verfügbar
- Retry-Logic für Netzwerk-Anfragen
- User-freundliche Fehlermeldungen

## Performance Optimizations

### Image Loading
- Parallel Loading aller Avatar-Bilder
- Proxy-System für Cross-Origin Support
- Fallback zu Initialen wenn Bild nicht ladbar

### Game Loop
- Efficient Collision Detection (O(n²) optimiert)
- Adaptive Scaling basierend auf Spieler-Count
- Memory-efficient Player State Management

### Video Recording
- Timeslicing für bessere Memory Usage
- Asynchrone Blob-Verarbeitung
- URL Cleanup nach Download

## Browser Compatibility

### Required Features
- ES6 Modules Support
- Canvas 2D Context
- MediaRecorder API
- CSS Grid/Flexbox
- Async/Await

### Tested Browsers
- Chrome 90+ (vollständige Unterstützung)
- Firefox 88+ (WebM only für Recording)
- Safari 14+ (eingeschränkte MediaRecorder Unterstützung)

## Development Notes

### Code Style
- ES6+ Syntax durchgehend verwendet
- Async/Await für alle asynchronen Operationen
- Modulare Struktur mit klaren Responsibilities
- Umfassende Kommentierung in Deutsch und Englisch

### Future Improvements
- TypeScript Migration für bessere Type Safety
- Service Worker für Offline-Unterstützung
- WebAssembly für Performance-kritische Berechnungen
- Progressive Web App Features
