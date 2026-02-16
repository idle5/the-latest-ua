# Ukraine: The Latest - Unofficial Enhanced Player 🇺🇦

A modern, accessible, and privacy-focused web player for the Ukrainian AI-translated edition of The Telegraph's "Ukraine: The Latest."

**[🔗 Live Demo Link](https://idle5.github.io/the-latest-ua/)**

## 🎯 Project Purpose
While official versions exist on Spotify and Apple Podcasts, they often require accounts, apps, or specific devices. This project serves as an **"Unlocked Open Web"** alternative:
- **No Login Required:** Instant access for anyone, anywhere.
- **No App Download:** Works purely in the browser on any device (Desktop, Android, iOS).
- **Enhanced Discovery:** Unlike standard players, this version includes **Topic Filtering** and **Search** to help researchers and listeners find specific updates (e.g., "F-16", "NATO", "Kherson") instantly.

## ✨ Key Features
- **🔍 Smart Search & Topics:** Instantly filter episodes by keyword or topic (e.g., "Frontline Updates", "Geopolitics")—a feature missing from many standard RSS players.
- **⚡ Real-time RSS:** Automatically fetches the latest episodes from the Acast feed.
- **💎 Premium UI:** A "Glassmorphism" design inspired by modern iOS/macOS aesthetics, featuring dynamic animations and a responsive grid layout.
- **🎧 Pro Audio Controls:**
  - Precision playback speeds (0.5x to 2x).
  - "Cinema Mode" Hero Player.
  - Keyboard shortcuts for power users.
- **🌍 Privacy First:** No tracking, no cookies, no accounts.

## 🛠️ Technical Stack
- **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+).
- **Data Handling:** Client-side XML/RSS Parsing.
- **Search Engine:** Custom client-side indexing of episode metadata.
- **Hosting:** GitHub Pages.

## 🧠 Technical Challenges & Solutions
- **The "Signed URL" Problem:** To avoid expiring links found in web scrapers, I identified the permanent Acast RSS source ID to ensure the player never breaks.
- **CORS & Feed Parsing:** Implemented an XML-to-JSON logic to handle cross-origin requests and allow for deep metadata extraction (like episode-specific cover art).
- **Client-Side Translation:** Solved the challenge of translating dynamic data without a backend by implementing a secure client-side fetch to a translation endpoint.

## ⚖️ Disclaimer
This is an unofficial fan project and is not affiliated with or endorsed by The Telegraph. All audio content and branding are copyright © The Telegraph. This project is built for educational and portfolio purposes to demonstrate frontend development and API integration skills.
