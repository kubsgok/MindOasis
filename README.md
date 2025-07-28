# MindOasis

A cross‑platform mobile app built with **Expo Router** and backed by a Python/FastAPI + Airtable backend. MindOasis helps users journal, track medications, manage events, and connect with peers through a “JumBuddy” feature.

---

## 🚀 Features

* **Authentication**
  Sign up & log in; secure session stored via AsyncStorage.
* **Dashboard**
  Calendar view of upcoming events, custom event cards.
* **Journaling**
  • Daily prompts
  • Free‑write editor
  • Calendar‑based history of past entries
* **Medications**
  • OCR‑powered med info extraction (upload prescription images)
  • Manually add/edit medications
* **JumBuddy (Friends)**
  • Browse & connect with peers
  • Placeholder avatars via DiceBear API
* **Profile**
  • Customize avatar (eyes, hair, colors)
  • View & edit personal details
* **Backend OCR & AI**
  • Python/FastAPI service using Tesseract & LangChain for med‑info parsing
* **Airtable Integration**
  • All data stored in Airtable tables (Users, JournalEntries, Medications, Prompts)

---

## 🛠 Tech Stack

* **Frontend:**
  • React Native, Expo Router
  • Tailwind (via nativewind) for styling
  • React Navigation (Tabs)
* **Backend:**
  • FastAPI (Python)
  • pytesseract & Pillow for OCR
  • LangChain + OpenAI for structured text parsing
* **Data Storage:**
  • Airtable (via axios in `airtable.js`)
* **Utilities:**
  • AsyncStorage (local)
  • Expo asset pipeline (images & fonts)

---

## 📁 Project Structure

```
MindOasis-main/
├─ app/                 # Expo Router pages (tabs)
│  └─ (tabs)/
│     ├─ _layout.tsx    # Tab navigator
│     ├─ dashboard.tsx
│     ├─ home.tsx
│     ├─ journaling.tsx
│     └─ medications.tsx
├─ backend/
│  └─ app.py            # FastAPI OCR & AI service
├─ components/          # Shared UI components
├─ assets/              # Images & fonts
├─ hooks/               # Custom React hooks
├─ constants/           # Color & theme constants
├─ airtable.js          # Airtable service module
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## ⚡ Getting Started

### Prerequisites

* **Node.js** ≥16
* **Yarn** or npm
* **Expo CLI** (`npm install -g expo-cli`)
* **Python 3.8+** (for backend)
* **Tesseract OCR** installed on your system
* **Airtable API key** & **Base IDs** in `airtable.js`
* **OpenAI API key** & **TESSERACT\_PATH** in `backend/.env`

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd MindOasis-main

# Frontend deps
npm install  
# or
yarn
```

### 2. Configure Environment

* **Airtable**: edit `airtable.js` with your `BASE_ID`, `USER_TABLE_ID` and `API_TOKEN`.
* **Backend**: create `backend/.env`:

  ```
  OPENAI_API_KEY=sk-...
  TESSERACT_PATH=/usr/bin/tesseract   # or wherever tesseract is installed
  ```

### 3. Run Backend

```bash
cd backend
pip install fastapi uvicorn python-dotenv pillow pytesseract langchain-openai
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 4. Run Mobile App

In the project root:

```bash
expo start
```

* Scan the QR code with Expo Go (iOS/Android) or run simulators.

---

## 📦 Airtable Schema

**Users** | **JournalEntries** | **Prompts** | **Medications**
Link records between tables, store fields like `Content`, `Date`, `Mood`, `MedicationInfo`, etc.

*(Refer to the “Airtable breakdown” section in docs or your project wiki.)*

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m "feat: ..."`)
4. Push (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## 📄 License

MIT © Your Name / Organization
