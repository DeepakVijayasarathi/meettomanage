// Preload for the site window. `window.desktop` only exists inside the desktop app, so the website
// can show desktop-only screens by checking for it.
const { contextBridge, ipcRenderer } = require("electron");

const info = ipcRenderer.sendSync("app:info");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  // Read-only demo against a client's API (see demo-guard.cjs). The screens use this to hide anything that writes.
  demo: info.demo === true,
  apiHost: info.apiHost,
  ai: {
    status: () => ipcRenderer.invoke("ai:status"),
    ask: (payload) => ipcRenderer.send("ai:ask", payload),
    stop: () => ipcRenderer.send("ai:stop"),
    // Hands the site's own signed-in token to the app so the AI can use live data without a second login.
    setLiveToken: (token, user) => ipcRenderer.invoke("api:set-token", { token, user }),
    onEvent: (cb) => {
      const handler = (_e, data) => cb(data);
      ipcRenderer.on("ai:event", handler);
      return () => ipcRenderer.removeListener("ai:event", handler);
    },
  },
  claude: {
    status: () => ipcRenderer.invoke("claude:status"),
    login: () => ipcRenderer.invoke("claude:login"),
    logout: () => ipcRenderer.invoke("claude:logout"),
    usage: () => ipcRenderer.invoke("claude:usage"),
    clearUsage: () => ipcRenderer.invoke("claude:clear-usage"),
  },
});
