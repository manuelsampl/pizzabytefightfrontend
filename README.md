# 🍕 Pizza Byte Fight - Frontend

<div align="center">
  <img src="./Logo_pizzabytefight.png" alt="Pizza Byte Fight Logo" width="150" height="150">
</div>

Ein episches Battle Royale Spiel, bei dem deine Instagram Follower als Avatare um die letzte Pizza kämpfen! Entwickelt für [@pizzabytefight](https://www.instagram.com/pizzabytefight/) von der [CLIQUE](https://clique.wien).

![Pizza Royale Gameplay](https://img.shields.io/badge/Game-Pizza%20Battle%20Royale-orange?style=for-the-badge&logo=games)
![Instagram Format](https://img.shields.io/badge/Format-Instagram%20Reel-purple?style=for-the-badge&logo=instagram)
![Open Source](https://img.shields.io/badge/Open%20Source-MIT-green?style=for-the-badge&logo=opensource)

## 🎮 Was ist Pizza Byte Fight?

Pizza Byte Fight ist ein automatisiertes Battle Royale Spiel im Instagram Reel Format (1080x1920px). Deine Instagram Follower werden als Avatare importiert und kämpfen in einem 20-Sekunden-Kampf um die letzte Pizza. Das Spiel wird automatisch als MP4-Video aufgenommen - perfekt für deine Instagram Story!

### ✨ Features

- 🎯 **Instagram Integration**: Importiere deine Follower als Spieler-Avatare
- 🎬 **Automatische Aufnahme**: Canvas-Recording in HD-Qualität (20fps, JPEG 95%)
- 📱 **Instagram Reel Format**: 1080x1920px - perfekt für Stories und Reels
- ⚡ **Endgame Mechanics**: Spezielle Bonuses und verlangsamte Bewegung bei ≤50 Spielern
- 📊 **Statistik-Tracking**: Vollständige Datenbank mit Pizza-Statistiken
- 🎨 **Responsive Design**: Funktioniert auf Desktop und Mobile
- 🔧 **Admin Panel**: Datenbankmanagement und Spielstatistiken

## 🚀 Quick Start

### Voraussetzungen

- Node.js (v16 oder höher)
- Ein moderner Browser (Chrome, Firefox, Safari)
- **Backend-Server** (siehe Backend API Dokumentation unten)

### Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd cart-battle/frontend
   ```

2. **Development Server starten**
   ```bash
   python3 -m http.server 8080
   # Oder mit Node.js:
   npx serve -p 8080
   ```

3. **Backend konfigurieren und starten**
   - Das Backend ist **nicht open source** und muss separat bereitgestellt werden
   - Siehe Backend API Dokumentation für erforderliche Endpoints

4. **Öffne das Spiel**
   ```
   http://localhost:8080
   ```

## 🔌 Backend API Dokumentation

Das Frontend benötigt ein Backend mit folgenden API-Endpoints:

### 🎮 Game Management

#### `POST /api/matches`
Erstellt ein neues Match.
```javascript
// Request: (Empty body)
// Response:
{
  "id": "match_id",
  "seed": 12345,
  "startedAt": "2024-01-01T10:00:00Z"
}
```

#### `POST /api/game-sessions`
Speichert Spiel-Session-Daten.
```javascript
// Request:
{
  "duration": 25,
  "winnerId": "imported_username",
  "winnerUsername": "Display Name",
  "winningReason": "Pizza eaten up",
  "totalPlayers": 32,
  "survivedPlayers": 8,
  "playerStats": [
    {
      "igUserId": "imported_username",
      "username": "Display Name",
      "pizzasEaten": 15.5,
      "survived": true,
      "finalRank": 1
    }
  ]
}

// Response:
{
  "success": true,
  "gameSessionId": "session_id"
}
```

### 👥 User Import Management

#### `POST /api/import/instagram-followers`
Importiert Follower aus Instagram HTML.
```javascript
// Request:
{
  "html": "<div>...Instagram HTML...</div>"
}

// Response:
{
  "parsed": 25,
  "saved": 23,
  "skipped": 2
}
```

#### `GET /api/import/followers`
Lädt alle importierten Follower.
```javascript
// Response:
[
  {
    "username": "follower1",
    "displayName": "Follower Name",
    "avatarUrl": "https://..."
  }
]
```

#### `DELETE /api/import/followers`
Löscht alle importierten Follower.
```javascript
// Response:
{
  "message": "All followers deleted"
}
```

### 📊 Admin & Statistics

#### `GET /api/admin/stats`
Lädt Statistiken für Admin Panel.
```javascript
// Response:
{
  "userCount": 150,
  "matchCount": 12,
  "gameSessionCount": 8,
  "totalPizzasEaten": 245.7,
  "recentSessions": [
    {
      "winnerUsername": "Winner Name",
      "winningReason": "Pizza eaten up",
      "totalPlayers": 32,
      "survivedPlayers": 8,
      "durationSec": 25
    }
  ]
}
```

#### `DELETE /api/admin/reset-database`
Setzt die Datenbank zurück.
```javascript
// Response:
{
  "message": "Database reset completed"
}
```

### 🖼️ Image Proxy

#### `GET /api/image-proxy?url=<image_url>`
Proxy für Bilder (CORS-Umgehung).
```javascript
// Query Parameter:
// url: The image URL to proxy

// Response: Binary image data
```

### 🎯 Roster Management

#### `GET /api/roster`
Lädt Spieler-Roster für das Spiel.
```javascript
// Response:
{
  "participants": [
    {
      "id": "imported_username",
      "name": "Display Name",
      "avatarUrl": "https://...",
      "type": "FOLLOWER"
    }
  ]
}
```

## 🎯 Spielablauf

### 1. Follower Import
- Besuche `http://localhost:8080/import.html`
- Folge den Anweisungen zum Instagram Follower Import
- Oder nutze die Demo-Daten für sofortiges Spielen

### 2. Spiel starten
- Klicke "Pizza Battle starten"
- Wähle Recording-Option:
  - **🎮 Record Game Video**: Zeichnet das Spiel als MP4 auf
  - **⏭️ Skip Recording**: Spielt ohne Aufnahme

### 3. Battle Royale Action
- Bis zu 32 Follower kämpfen automatisch
- Pizza wird kontinuierlich "aufgegessen"
- Spieler eliminieren sich gegenseitig
- **Endgame** bei ≤50 Spielern: Langsamere Bewegung, Bonus-Punkte

### 4. Ergebnis
- Gewinner wird angezeigt
- Optional: Spieldaten in Datenbank speichern
- Video-Download für deine Story

## 🛠 Technische Details

### Architektur
```
frontend/
├── index.html          # Hauptmenü
├── game.html          # Spielfenster (optional)
├── import.html        # Follower Import
├── css/
│   └── main.css       # Styling
└── js/
    ├── app.js         # Haupt-App
    ├── game.js        # Spiel-Engine
    ├── menu.js        # Menü-Logik
    ├── canvas-recorder.js  # Video-Aufnahme
    ├── recording-setup.js  # Recording Setup
    └── recorder.js    # Fallback Recorder
```

### Recording System
- **Canvas Recording**: Hochwertiges Recording direkt vom Canvas
- **20fps, JPEG 95%**: Optimiert für Instagram-Qualität
- **MP4 Export**: Automatischer Download nach Spielende
- **Preview**: Sofortige Videovorschau im Browser

### Game Engine
- **60fps Gameplay**: Flüssige Animationen
- **Collision Detection**: Präzise Physik für Avatare und Pizza
- **Dynamic Scaling**: Performance-Optimierungen je nach Spieleranzahl
- **Real-time Ranking**: Live-Updates während des Spiels

## 🎨 Anpassungen

### Avatar-Styling
```javascript
// In game.js - Avatar-Eigenschaften anpassen
const AVATAR_SIZE = 45;  // Größe der Avatare
const AVA_R = AVATAR_SIZE / 2;
```

### Spiel-Parameter
```javascript
// Spieldauer und -mechaniken
const MAX_SPEED = 18;              // Bewegungsgeschwindigkeit
const WINNER_DISPLAY_TIME = 3000;  // Gewinner-Anzeige (ms)
const EAT_RADIUS = 400;           // Pizza-Größe
```

### Recording-Qualität
```javascript
// In canvas-recorder.js
const RECORDING_CONFIG = {
    fps: 20,           // Frames pro Sekunde
    quality: 0.95,     // JPEG-Qualität (0-1)
    format: 'video/mp4' // Video-Format
};
```

## 📊 Admin Panel

Öffne das Admin Panel über den "🔐 Admin" Button:

- **Statistiken**: Anzahl User, Spiele, gegessene Pizzas
- **Recent Games**: Letzte Spielergebnisse
- **Database Reset**: Alle Daten löschen (Vorsicht!)

## 🔗 Links

- **Instagram**: [@pizzabytefight](https://www.instagram.com/pizzabytefight/)
- **Entwicklung**: [CLIQUE Wien](https://clique.wien)
- **Backend**: Nicht open source - siehe API Dokumentation oben

## 🤝 Beitragen

Wir freuen uns über Contributions von der Community! 

### Mögliche Verbesserungen
- 🎨 Neue Avatar-Designs und Animationen
- 🎵 Sound-Effekte und Musik
- 🌟 Spezielle Power-Ups und Boosts
- 📱 Mobile UI-Optimierungen
- 🎮 Neue Spielmodi und Varianten
- 🏆 Erweiterte Statistiken und Rankings
- 🎬 Verbesserte Recording-Features

### Wie beitragen?
1. **Fork** das Repository
2. **Erstelle** einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. **Committe** deine Änderungen (`git commit -m 'Add amazing feature'`)
4. **Push** zum Branch (`git push origin feature/amazing-feature`)
5. **Öffne** eine Pull Request

### Development Guidelines
- Verwende moderne ES6+ JavaScript Features
- Kommentiere komplexe Logik ausführlich
- Teste deine Änderungen in verschiedenen Browsern
- Halte den Code lesbar und wartbar

## 📝 Lizenz

Dieses Projekt ist unter der MIT Lizenz veröffentlicht - siehe [LICENSE](LICENSE) für Details.

---

## 🍕 Fun Facts

- **Pizza-Physik**: Realistische Kollisionserkennung zwischen Avataren und Pizza
- **Endgame-Mechanik**: Inspiriert von modernen Battle Royale Spielen
- **Instagram-Optimiert**: Perfekte 9:16 Ratio für maximale Story-Performance
- **Open Source**: Komplett transparent und erweiterbar

**Viel Spaß beim Spielen und Entwickeln! 🎮✨**

---

*Erstellt mit ❤️ von [CLIQUE Wien](https://clique.wien) für [@pizzabytefight](https://www.instagram.com/pizzabytefight/)*
