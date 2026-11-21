# Meet to Manage Desktop: install guide

The desktop app is the Meet to Manage website in its own window, plus **Mito**, an AI assistant that can read your academy's live data and create quizzes, class plans, charts and tables.

## What you need

| Requirement | Details |
|---|---|
| Computer | Windows 10 or 11, 64-bit |
| Internet | Needed for the academy data and for Mito |
| Meet to Manage login | Your usual email / mobile and PIN (admin portal for Mito) |
| Claude account | A Claude **Pro or Max** plan, used to power Mito |
| Claude Code | Installed and signed in (Step 2 below) |

Without Claude Code the site still works. Only the AI Workspace is unavailable.

## Step 1: Install the app

You received two files. Use **one** of them.

**Option A: Installer (recommended for a normal PC)**
1. Double-click `MeetToManage-Setup-0.1.0.exe`.
2. If Windows shows "Windows protected your PC", click **More info**, then **Run anyway**. This appears because the app isn't code-signed.
3. Choose an install folder (or keep the default) and click **Install**.
4. Open **Meet to Manage** from the Start menu.

**Option B: Portable (no install, e.g. a USB drive or a locked-down PC)**
1. Copy `MeetToManage-Portable-0.1.0.exe` anywhere, such as the Desktop.
2. Double-click it. The same "Windows protected your PC" notice may appear. Use **More info**, then **Run anyway**.

## Step 2: Install and sign in to Claude Code (for Mito)

1. Open **PowerShell** and run the installer from the official Claude Code page: <https://docs.claude.com/en/docs/claude-code/overview>
   (Alternatively, if you have Node.js: `npm install -g @anthropic-ai/claude-code`.)
2. Close and reopen the Meet to Manage app so it can find Claude.
3. In the app, open **App → Claude Account & Usage** (or press `Ctrl+Shift+U`).
4. Click **Log in with Claude**, finish the sign-in in your browser, then return to the app. The screen should show **Logged in** with your email and plan.

The app looks for `claude` on your PATH, and also in the copy bundled with the Claude Code VS Code extension. To point it somewhere else, set the environment variable `CLAUDE_PATH` to the full path of `claude.exe`.

## Step 3: Sign in and open Mito

1. The app opens on the Meet to Manage login page. Sign in as usual. You stay signed in on this computer.
2. In the admin portal, open **AI Workspace** under **Desktop app** in the sidebar, or press `Ctrl+Shift+W`.
3. Ask a question, or click **Quiz**, **Class plan**, **Chart** or **Table**.

### Settings (gear / "Settings" in the Mito rail)
- **Model:** Default, Balanced (Sonnet), Most capable (Opus), Fastest (Haiku).
- **Create quizzes & assignments:** lets Mito save quiz questions and create assignments when you ask. It cannot edit or delete anything.
- **Change live data:** lets Mito create, update and delete real records. It turns itself off every time you reopen the workspace. Leave it off unless you need it.
- **Edit project files:** only useful for developers working on the source code.

### Other handy places
- **Settings → Appearance** (admin Settings page): choose the sidebar style (Classic, Floating, Brand, Slate). Saved on this computer only.
- **Claude Account & Usage:** see who is logged in, plan limits and the tokens and estimated cost used by Mito on this computer.
- Quiz cards have a **Save to bank** button to push the questions into your live quiz-question bank.

## Privacy: please read

- When Mito answers from live academy data, **that data is sent to Claude** (Anthropic) to write the answer. This can include student and parent details. Only use it for data you are allowed to share, and ask for only what you need.
- Your Meet to Manage sign-in is handed to Mito only while the AI Workspace is open and is never shown in the chat.
- Conversations and settings are stored on this computer only.

## Updating

Install the newer `Setup` file over the old one, or replace the portable file. Your saved login, chats and settings stay on the computer.

## Uninstalling

- **Installer version:** Windows **Settings → Apps → Installed apps → Meet to Manage → Uninstall**.
- **Portable version:** delete the `.exe` file.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Windows protected your PC" | Click **More info → Run anyway**. The app isn't code-signed. |
| AI Workspace says **Claude CLI not found** | Install Claude Code (Step 2), then restart the app. Or set `CLAUDE_PATH`. |
| AI Workspace says **You're not logged in to Claude** | Open **Claude Account & Usage** and click **Log in with Claude**. |
| Mito replies with an error or stops | Check your Claude plan's limits on the Claude Account screen. Try the **Fastest** model, or wait for the limit to reset. |
| "Can't reach the server" | Check your internet connection. If it persists, open the site in a normal browser to confirm the service is up. |
| Mito can't read live data | Sign out and back in to Meet to Manage, then reopen the AI Workspace. |
| White window, or the page doesn't load | Close the app fully (check the system tray / Task Manager) and reopen it. The app uses local port `47831`. If another program holds that port the app picks a different one, and you may need to sign in again. |
| AI Workspace isn't in the sidebar | It only appears in the **admin** portal, and only in the desktop app, not in a browser. |

## For developers: build the exe yourself

```bash
# 1. Build the website (project root)
npm install
npm run build        # or: npx vite build

# 2. Package the desktop app
cd desktop
npm install
node mcp/generate-endpoints.cjs   # refresh the live-data tool list after API changes
npm run dist                      # writes desktop/release/*.exe
```

Run without packaging: `npm start` (uses the built site) or `npm run dev` (uses the dev server on port 5173).
