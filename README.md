# SignBridge — Point. Understand. Act.

An AI accessibility tool that helps people understand real-world signs, notices, warnings, menus, forms, and public instructions.

---

## 1. SignBridge Overview
**SignBridge** is a mobile-first, multimodal web application built to bridge the gap between physical signage and everyday human comprehension. Real-world signs—traffic warnings, transit regulations, hospital quiet zones, safety hazards, and university circulars—are often written in unfamiliar languages, filled with bureaucratic jargon, or easy to misinterpret. 

SignBridge doesn't just read or translate words. It acts as an empathetic accessibility co-pilot: it reads the sign, explains what it means in plain everyday speech, classifies its urgency level, provides safe next actions tailored specifically to the user's role (Driver, Student, Traveler, Tourist, Patient/Visitor), and reads the results aloud via Speech Synthesis.

---

## 2. Problem
Millions of people face accessibility barriers every day when navigating unfamiliar environments:
- **Language Barriers**: Tourists and travelers encounter critical notices and transit announcements written exclusively in local languages or scripts.
- **Complex & Bureaucratic Terminology**: Legal statutes, municipal bylaws, and penalty warnings use complex vocabulary that is difficult to parse on the spot.
- **Cognitive Overload & Ambiguity**: In high-stress or fast-paced situations (such as busy train platforms, emergency rooms, or congested intersections), people struggle to determine whether a sign is merely informative or poses an immediate financial penalty or physical safety risk.
- **Lack of Actionable Guidance**: Standard translation tools merely output word-for-word text without clarifying what a person should actually *do* next.

---

## 3. Solution
SignBridge introduces the **“Point. Understand. Act.”** workflow:
1. **Point**: Capture a sign using your phone's camera, upload a photo, or choose a sample sign preset.
2. **Understand**: Personalize the explanation into your preferred language (**Hinglish**, **Hindi**, or **English**) and select your active role (**Student**, **Traveler**, **Driver**, **Tourist**, or **Patient / Visitor**).
3. **Act**: Receive a clear, structured dashboard answering five vital questions:
   - *What the sign says* (visible text transcribed accurately)
   - *What it means in simple language* (plain-speech breakdown)
   - *How urgent it is* (color-coded: Low, Medium, High, Critical)
   - *What you should do next* (prominent, context-aware next action)
   - *Why the instruction matters* (consequences and rationale)
   - *Safety warnings* (highlighted only when genuine physical risks exist)

Users can also tap **“Listen to explanation”** to hear the translation and recommended action spoken aloud.

---

## 4. Key Features
- **Multimodal Visual Intelligence**: Powered directly by Gemini 3 series (`gemini-3.8-flash`) with structured JSON schema outputs.
- **Dual Input Modes (Scan Image & Paste Text)**:
  - *Scan Image*: Phone camera capture, drag-and-drop file upload, and sample sign presets with strict client and server MIME type/size validation.
  - *Paste Text*: Dedicated text mode with character count (up to 5,000 characters), 8-character minimum threshold, sample notice presets, and an optional question field (*"What do you want help with?"*).
- **Language Localization**:
  - **Hinglish**: Natural, conversational Roman Hindi mixed with English for broad everyday accessibility.
  - **Hindi (हिंदी)**: Fluent Devanagari script for native Hindi readers.
  - **English**: Plain, clear, jargon-free English.
- **Context-Aware Recommendations**: Tailors actions for:
  - *Drivers*: Parking spots, tow-away risks, speed regulations, traffic fines.
  - *Travelers*: Platform safety, ticket gates, baggage rules, boarding steps.
  - *Students*: Examination rules, mobile phone policies, silence zones, deadlines.
  - *Tourists*: Photography allowances, entry fees, cultural etiquette, opening hours.
  - *Patients & Visitors*: Hospital visiting hours, quiet zones, sanitization and mask protocols.
- **Color-Coded Urgency Matrix**:
  - **Green (Low)**: Information only.
  - **Yellow/Amber (Medium)**: Important instruction.
  - **Orange (High)**: Restriction, warning, possible penalty, fine, or deadline.
  - **Red (Critical)**: Immediate physical danger or emergency.
- **Voice Readout (SpeechSynthesis)**: Text-to-speech audio reader with voice adaptation for Hindi and English.
- **One-Click Sample Signs & Text Notices**: Built-in high-contrast sign presets and realistic text notice templates for instant evaluation.
- **Secure Server-Side Architecture**: Zero exposure of API keys to the browser; strict MIME type, file size, and character limit validation.

---

## 5. Gemini API Integration
Gemini processes either an uploaded sign image, user-provided notice text, or both. It identifies the visible/typed instruction, translates it, classifies urgency, answers user questions directly, and returns structured JSON for the SignBridge result cards.

### Multimodal Pipeline
The application uses the modern `@google/genai` TypeScript SDK:
- **Model**: `gemini-3.8-flash`
- **Output Format**: Structured JSON schema (`responseMimeType: "application/json"`, configured with strict `responseSchema`).
- **Telemetry**: Configured with the standard `aistudio-build` telemetry header.
- **Dual Input Resolution**: When both an image and user text are provided, Gemini prioritizes the user-provided text to clarify ambiguous visual details while inspecting the image. When an optional question is asked, it addresses it within the action and explanation.
- **Safety & Confidence Scoring**: If an image or notice is unclear, Gemini is instructed to report unclear text and return a confidence score below 45. If there is no genuine safety risk, the safety note defaults to `"No special safety warning."`.

---

## 6. Architecture
SignBridge follows a modular full-stack architecture running an integrated Node.js Express server with Vite:

```
├── server.ts                  # Express backend proxy with Gemini API calls & Vite middleware
├── src/
│   ├── main.tsx               # React application entry point
│   ├── App.tsx                # Main view controller & orchestrator
│   ├── types.ts               # TypeScript interfaces & domain types
│   ├── index.css              # Tailwind CSS styling
│   ├── components/
│   │   ├── Header.tsx         # Branded header with logo & accessibility badge
│   │   ├── InputModeToggle.tsx # Accessible segmented toggle (Scan image / Paste text)
│   │   ├── ImageCapture.tsx   # File upload, phone camera trigger & sample sign picker
│   │   ├── TextInput.tsx      # Textarea notice input, char counter & question field
│   │   ├── SettingsSelector.tsx # Language & user context selectors
│   │   └── ResultDashboard.tsx # Results view with urgency badge, 6 ordered cards & TTS
│   └── data/
│       └── sampleSigns.ts     # Realistic preset sign canvas vectors for rapid testing
├── package.json               # Scripts, full-stack dependencies & devDependencies
├── metadata.json              # App capabilities and camera frame permissions
└── README.md                  # Project documentation
```

---

## 7. Local Development / Setup

### Prerequisites
- Node.js (v20+ recommended)
- npm or yarn

### Installation
1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`.

---

## 8. Environment Variables
SignBridge requires the following environment variables:

| Variable | Description | Location |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-side Gemini API key used by the `@google/genai` SDK | Server runtime (`.env` or AI Studio Secrets) |
| `APP_URL` | Service URL for routing and self-referential links | Platform-injected |

> **Note**: Never prefix `GEMINI_API_KEY` with `VITE_` or reference it in browser code.

---

## 9. Privacy and Security
- **No Permanent Storage**: SignBridge analyzes images in-memory for the current session only. Images are never written to a permanent database or persisted on server disk.
- **Server-Side API Key Isolation**: All communication with the Gemini API is handled securely on the server (`server.ts`). The API key is never bundled or sent to the client.
- **Input Validation**: Uploaded images are strictly validated on both client and server:
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
  - Maximum payload size: 10 MB
- **Safe Guidance**: SignBridge explicitly avoids making definitive legal, medical, or emergency claims.

---

## 10. Deployment
SignBridge is configured for seamless deployment on containerized environments (such as Google Cloud Run or Docker):

1. **Build Step**:
   ```bash
   npm run build
   ```
   This compiles the Vite frontend into `dist/` and bundles the Express server into `dist/server.cjs` via `esbuild`.

2. **Production Run**:
   ```bash
   npm start
   ```
   Runs `node dist/server.cjs`, serving the optimized single-page frontend on port `3000`.

---

## 11. Team Members Placeholders
- **Lead Accessibility & Product Architect**: [Team Member 1]
- **AI & Full-Stack Systems Engineer**: [Team Member 2]
- **UX & Visual Interaction Designer**: [Team Member 3]
- **Community & Multilingual Research Lead**: [Team Member 4]
