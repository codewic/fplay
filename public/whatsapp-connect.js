// WhatsApp connect page logic (separate file to comply with CSP)
(() => {
  const $ = (id) => document.getElementById(id);
  const baseUrlInput = $("baseUrl");
  const tokenInput = $("token");
  const nameInput = $("name");
  const startBtn = $("startBtn");
  const statusEl = $("status");
  const liveStatusEl = $("liveStatus");
  const qrImg = $("qrImg");

  baseUrlInput.value =
    localStorage.getItem("apiBaseUrl") || `${location.protocol}//${location.host}`;
  tokenInput.value = localStorage.getItem("jwtToken") || "";

  let socket = null;
  let currentSessionId = null;

  function setStatus(text) {
    statusEl.textContent = text;
  }
  function setLive(text) {
    liveStatusEl.textContent = text;
  }
  function showQR(dataUrl) {
    if (!dataUrl) return;
    qrImg.src = dataUrl;
    qrImg.classList.remove("hidden");
  }

  async function startSession() {
    const baseUrl = baseUrlInput.value.trim().replace(/\/$/, "");
    const token = tokenInput.value.trim();
    const name = nameInput.value.trim();
    if (!baseUrl || !token) {
      alert("Please provide API base URL and token");
      return;
    }

    localStorage.setItem("apiBaseUrl", baseUrl);
    localStorage.setItem("jwtToken", token);

    setStatus("Starting session...");
    try {
      const res = await fetch(`${baseUrl}/api/v1/sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(name ? { name } : {}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to start session");
      const { sessionId, qrCode } = json.data;
      currentSessionId = sessionId;
      setStatus(`Session created: ${sessionId}`);
      if (qrCode) showQR(qrCode);
      connectSocket(baseUrl, token, sessionId);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message || err}`);
    }
  }

  function connectSocket(baseUrl, token, sessionId) {
    setLive("Connecting to socket...");
    if (socket) try { socket.disconnect(); } catch {}
    // If baseUrl matches current origin, we can omit it. We keep it to support remote API.
    socket = io(baseUrl, { transports: ["websocket"], auth: { token } });

    socket.on("connect", () => {
      setLive("Socket connected");
      socket.emit("join-session", sessionId);
    });

    socket.on("connect_error", (err) => {
      setLive(`Socket error: ${err.message}`);
    });

    socket.on("qr-code", (payload) => {
      if (!payload || payload.sessionId !== sessionId) return;
      showQR(payload.qrCode);
      setLive("QR updated");
    });

    // Optional: if backend emits status updates
    socket.on("session-status", (payload) => {
      if (!payload || payload.sessionId !== sessionId) return;
      setLive(`Status: ${payload.status}`);
    });
  }

  startBtn.addEventListener("click", startSession);
})();


