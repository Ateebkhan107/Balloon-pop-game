# POP RUSH - Shared Firebase Family Leaderboard Setup Guide

This guide walks you step-by-step through setting up **Firebase Anonymous Authentication** and **Firebase Realtime Database** for POP RUSH's shared Family Leaderboard.

---

## 🌟 Overview & Architecture

POP RUSH uses a lightweight, serverless Firebase architecture tailored for low latency and family play:

- **Authentication**: Firebase Anonymous Authentication automatically creates a persistent unique player ID (`UID`) on the player's first visit. No email, password, or third-party sign-in is required.
- **Database**: Firebase Realtime Database stores user profiles under `/users/$uid` and per-mode records under `/leaderboards/time_attack/$uid` and `/leaderboards/endless/$uid`.
- **Race Condition Prevention**: Client score updates use atomic `runTransaction` calls to ensure that personal records are only updated when the player beats their existing high score.
- **Security Rules**: Enforced at the database server level to restrict writes strictly to the authenticated player's own UID, validate types, enforce allowed ranges, and prevent lower scores from ever overwriting a personal best.
- **Indexed Queries**: The database maintains a server-side index on `score` (`.indexOn: ["score"]`) and queries only the top records using `limitToLast(50)`.
- **Offline / Disconnected Resilience**: If Firebase credentials are missing or the player is offline, the game continues to run without interruption, saving personal bests locally and displaying friendly offline indicators.

---

## 📋 Step-by-Step Firebase Console Setup

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (for example, `pop-rush-family-arcade`).
4. (Optional) Google Analytics can be enabled or disabled according to your preference.
5. Click **Create project** and wait for provisioning to complete.

---

### Step 2: Enable Anonymous Authentication
1. In the left navigation menu, go to **Build** > **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, scroll down to the **Anonymous** provider.
4. Click on **Anonymous**, toggle the switch to **Enable**, and click **Save**.

---

### Step 3: Create the Realtime Database
1. In the left navigation menu, go to **Build** > **Realtime Database**.
2. Click **Create Database**.
3. Select your preferred database location (choose the region closest to you and your family, e.g., `United States (us-central1)` or `Belgium (europe-west1)`).
4. When prompted for Security Rules, select **Start in locked mode** (we will apply our production rules in the next step).
5. Click **Enable**.
6. Copy your **Database URL** from the top of the dashboard. It will look like:
   ```text
   https://pop-rush-family-arcade-default-rtdb.firebaseio.com
   ```
   *(Or with a regional prefix like `https://pop-rush-family-arcade-default-rtdb.europe-west1.firebasedatabase.app`)*.

---

### Step 4: Apply Secure Realtime Database Rules
1. In your Realtime Database dashboard, click the **Rules** tab at the top.
2. Replace all existing text in the rules editor with the contents of [`database.rules.json`](database.rules.json):

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['nickname']) && newData.child('nickname').isString() && newData.child('nickname').val().length >= 2 && newData.child('nickname').val().length <= 20"
      }
    },
    "leaderboards": {
      "time_attack": {
        ".indexOn": ["score"],
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['uid', 'nickname', 'score', 'updatedAt']) && newData.child('uid').val() === $uid && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 1000000 && newData.child('nickname').isString() && newData.child('nickname').val().length >= 2 && newData.child('nickname').val().length <= 20 && newData.child('updatedAt').isNumber() && (!data.exists() || newData.child('score').val() >= data.child('score').val())"
        }
      },
      "endless": {
        ".indexOn": ["score"],
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['uid', 'nickname', 'score', 'updatedAt']) && newData.child('uid').val() === $uid && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 1000000 && newData.child('nickname').isString() && newData.child('nickname').val().length >= 2 && newData.child('nickname').val().length <= 20 && newData.child('updatedAt').isNumber() && (!newData.hasChild('survivalTime') || (newData.child('survivalTime').isNumber() && newData.child('survivalTime').val() >= 0)) && (!data.exists() || newData.child('score').val() >= data.child('score').val())"
        }
      },
      "$other": {
        ".read": false,
        ".write": false
      }
    }
  }
}
```

3. Click **Publish**.

> [!IMPORTANT]
> These rules enforce:
> - **UID-isolation**: Players can read shared leaderboard scores but can ONLY write to their own `$uid` path.
> - **Tamper-resistant high scores**: Writes are rejected if the submitted score is lower than the player's existing score in the database (`newData.score >= data.score`).
> - **Anti-abuse range checks**: Scores must be non-negative numbers `<= 1,000,000`.
> - **Schema validation**: Required fields (`uid`, `nickname`, `score`, `updatedAt`) are enforced.
> - **Indexed lookups**: `.indexOn: ["score"]` ensures scalable queries without downloading the whole tree.

---

### Step 5: Register Your Web App to Get Web Credentials
1. Click the **Project settings** gear icon ⚙️ in the upper left navigation pane.
2. In the **General** tab, scroll down to the **Your apps** card.
3. Click the Web icon (`</>`) to add a web application.
4. Enter an App nickname (e.g. `POP RUSH Web`).
5. (Leave "Firebase Hosting" unchecked for now, as you can deploy later).
6. Click **Register app**.
7. Firebase will display your `firebaseConfig` object. It looks similar to:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB3AbC123ExampleKey...",
  authDomain: "pop-rush-family-arcade.firebaseapp.com",
  databaseURL: "https://pop-rush-family-arcade-default-rtdb.firebaseio.com",
  projectId: "pop-rush-family-arcade",
  storageBucket: "pop-rush-family-arcade.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

---

### Step 6: Create Your `.env` File
1. In the root directory of your POP RUSH game repository, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in your editor and paste the values from your Firebase web app configuration:

```env
VITE_FIREBASE_API_KEY=AIzaSyB3AbC123ExampleKey...
VITE_FIREBASE_AUTH_DOMAIN=pop-rush-family-arcade.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://pop-rush-family-arcade-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=pop-rush-family-arcade
VITE_FIREBASE_STORAGE_BUCKET=pop-rush-family-arcade.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

> [!NOTE]
> `.env` is listed in `.gitignore` and must **never** be committed to version control.
> Firebase web credentials identify your client app to Firebase services. Authorization and access control are strictly governed by the Realtime Database Security Rules you published in Step 4.

---

## 🔒 Security & Anti-Abuse Documentation

### Safeguards Implemented
1. **Authenticated Writes Only**: Unauthenticated requests cannot read or write to user or leaderboard records.
2. **Path-Restricted Permissions**: `auth.uid === $uid` ensures Alice cannot modify Bob's score, profile, or rank.
3. **Monotonic Score Progression**:
   - Client: Uses Firebase atomic transactions (`runTransaction`), checking `score > currentBest`.
   - Server Security Rules: `(!data.exists() || newData.child('score').val() >= data.child('score').val())` enforces that any write trying to downgrade a score is rejected by the server.
4. **Sanity Caps & Types**: Scores are constrained to non-negative numbers below `1,000,000` (far exceeding realistic high combos in Time Attack/Endless Rush while capping artificial inflation).
5. **Round Completion Enforcement**: Scores are submitted strictly when the game ends naturally (timer reaches zero in Time Attack, or all lives are lost in Endless Rush). Unfinished, paused, or aborted rounds are never submitted.
6. **Nickname Sanitization**: HTML tags and script delimiters are stripped on client input, and nicknames are constrained to 2–15 characters in UI (2–20 in database rules).

### Inherent Limitations of Client-Side Web Games
Because Phaser runs in the user's browser, client memory and network payloads can technically be manipulated by an advanced user using browser DevTools or custom scripts. 

To achieve 100% cheat-proof competitive leaderboards, a game requires a server-authoritative simulation (e.g. streaming player tap coordinates and timestamps to a Cloud Function / game server that verifies every balloon spawn and pop tick). For a family and casual arcade setting, the implemented rules, rate limits, schema validations, and monotonic transaction guards provide strong defense against accidental corruption, stale scores, and unauthorized player overwrites.

---

## 🧪 Multi-Browser Family Verification Checklist

To verify the setup with your family:

1. **Launch the game**:
   ```bash
   npm run dev
   ```
2. **First Browser (Player 1)**:
   - Open `http://localhost:3000` in Google Chrome.
   - On first visit, a prompt will ask for a nickname (e.g., `Mom`).
   - Play a round of **Time Attack** and score e.g. `45,000`.
   - Open **🏆 FAMILY LEADERBOARD** from the menu or game over screen: `Mom` appears as Rank `#1` with a gold crown `👑 #1`.
3. **Second Browser / Device (Player 2)**:
   - Open `http://localhost:3000` in Safari, Firefox, or on a mobile phone on the same local network.
   - Enter a different nickname (e.g., `Dad`).
   - Open the **🏆 FAMILY LEADERBOARD**: `Mom` is visible at `#1` with `45,000`.
   - Play a round of **Time Attack** and score e.g. `60,000`.
   - Reopen the leaderboard: `Dad` now takes `#1` with `👑 #1` (`60,000`), and `Mom` automatically becomes `🥈 #2` (`45,000`).
4. **Independent Mode Rankings**:
   - In either browser, switch the tab to **❤️ ENDLESS RUSH**: verify that Endless Rush has its own independent rankings and personal records without affecting Time Attack scores.
5. **Lower Score Protection**:
   - Play another round as `Dad` and score lower (e.g. `10,000`).
   - Open the leaderboard: `Dad`'s best remains `60,000`!
