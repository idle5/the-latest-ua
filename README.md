# Ukraine: The Latest - Unofficial Ukrainian Player 🇺🇦

A modern, dedicated web player for the Ukrainian AI-translated edition of The Telegraph's award-winning podcast, "Ukraine: The Latest."

**[🔗 Live Demo Link](https://your-username.github.io/your-repo-name/)**

## 🎯 Project Purpose
The Telegraph provides vital daily reporting on the war in Ukraine. While they offer a Ukrainian version of their podcast, it is tucked away inside their main English-language articles. This project creates a minimalist, dedicated space for Ukrainian speakers and researchers to access the audio feed directly, with a focus on speed, accessibility, and ease of use.

## ✨ Key Features
- **Real-time RSS Integration:** Automatically fetches the latest episodes directly from the Acast RSS feed.
- **Dynamic Translation:** Uses a client-side Google Translate integration to provide Ukrainian titles for the latest episodes on the fly.
- **Custom Audio Engine:** A bespoke JavaScript audio interface featuring:
  - Standard playback speeds (1x, 1.25x, 1.5x, 2x).
  - Custom seek and volume controls.
  - Mobile-responsive "Cinema" layout.
- **Episode Library:** A scrollable history of all past episodes that can be swapped into the main player.
- **Weekly Newsletter Integration:** A dedicated sidebar for translated insights from the Telegraph's editorial team.

## 🛠️ Technical Stack
- **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+).
- **Data Handling:** XML/RSS Parsing via `DOMParser`.
- **APIs:** Google Translate API (Public Endpoint).
- **Hosting:** GitHub Pages.

## 🧠 Technical Challenges & Solutions
- **The "Signed URL" Problem:** To avoid expiring links found in web scrapers, I identified the permanent Acast RSS source ID to ensure the player never breaks.
- **CORS & Feed Parsing:** Implemented an XML-to-JSON logic to handle cross-origin requests and allow for deep metadata extraction (like episode-specific cover art).
- **Client-Side Translation:** Solved the challenge of translating dynamic data without a backend by implementing a secure client-side fetch to a translation endpoint.

## ⚖️ Disclaimer
This is an unofficial fan project and is not affiliated with or endorsed by The Telegraph. All audio content and branding are copyright © The Telegraph. This project is built for educational and portfolio purposes to demonstrate frontend development and API integration skills.
