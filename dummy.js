import React, { useState } from "react";

export default function DownloadPortalSimple() {
  const [activePart, setActivePart] = useState("ACQ");
  const [env, setEnv] = useState("SIT");
  const [server, setServer] = useState("");
  const [path, setPath] = useState("");
  const [port, setPort] = useState("");
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);


  const servers = {
    SIT: {
      ACQ: ["server1.example.com", "server2.example.com"],
      ISS: ["server3.example.com"],
    },
    UAT: {
      ACQ: ["uat1.example.com"],
      ISS: ["uat2.example.com"],
    },
  };

  async function safeFetch(url, options = {}, retries = 1) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 800));
        return safeFetch(url, options, retries - 1);
      }
      throw err;
    }
  }

  async function checkPath() {
    if (!server) return alert("Please select a server");
    if (!path) return alert("Please enter a path");
    setLoading(true);
    setEntries([]);
    setSelected(new Set());
    try {
      if (env === "UAT") {
        setPort("7111");
      } 
      else {
        setPort("7001");
      }
      const url = `http://${server}:${port}/api/list`;
      const res = await safeFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response from server");
      setEntries(data);
    } catch (err) {
      console.error("checkPath error:", err);
      alert("Failed to fetch listing: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!server) return alert("Please select a server");
    const sel = Array.from(selected);
    const payload = { path, selected: sel };

    try {
      if (env === "UAT") {
        setPort("7111");
      } 
      else {
        setPort("7001");
      }
      const url = `http://${server}:${port}/api/download`;
      const res = await safeFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const blob = await res.blob();

      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "download";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          try {
            filename = decodeURIComponent(match[1]);
          } catch {
            filename = match[1];
          }
        }
      } else {
        const ct = (res.headers.get("Content-Type") || "").toLowerCase();
        if (ct.includes("zip")) filename = "download.zip";
        else if (ct.startsWith("text/")) filename = "download.txt";
        else filename = "download";
      }

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      setPath("");
      setEntries([]);
      setSelected(new Set());
    } catch (err) {
      console.error("download error:", err);
      alert("Download failed: " + err.message);
    }
  }

  function toggleSelect(fullPath) {
    const s = new Set(selected);
    if (s.has(fullPath)) s.delete(fullPath);
    else s.add(fullPath);
    setSelected(s);
  }

  const container = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0d0d0d",
    color: "#fff",
    padding: 20,
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const card = {
    width: "880px",
    maxWidth: "95vw",
    minHeight: "640px",
    background: "#181818",
    borderRadius: 14,
    padding: 28,
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  const headerRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const switcher = {
    display: "flex",
    gap: 8,
    alignItems: "center",
  };

  const partButton = (active) => ({
    padding: "8px 18px",
    borderRadius: 8,
    cursor: "pointer",
    border: "none",
    background: active ? "linear-gradient(90deg,#b30000,#ff3b3b)" : "transparent",
    color: active ? "#fff" : "#ddd",
    fontWeight: 600,
  });

  const formRow = { display: "flex", gap: 12, alignItems: "center" };

  const inputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", flex: 1 };
  const selectStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", width: 400 };
  const smallBtn = { padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: "none", background: "#333", color: "#fff" };

  return (
    <div style={container}>
      <div style={card}>
        <div style={headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#ff5a5a" }}>Download Files</div>
            <div style={{ color: "#aaa" }}>Batch Selected - {activePart}</div>
          </div>

          <div style={switcher}>
            <button
              className="no-reset" 
              style={partButton(activePart === "ACQ")}
              onClick={() => setActivePart("ACQ")}
            >
              ACQ
            </button>
            <button style={partButton(activePart === "ISS")} onClick={() => setActivePart("ISS")}>
              ISS
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ color: "#ccc", fontSize: 13 }}>Environment</label>
              <div style={{ marginTop: 6 }}>
                <select value={env} onChange={(e) => setEnv(e.target.value)} style={selectStyle}>
                  <option value="SIT">SIT</option>
                  <option value="UAT">UAT</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: "#ccc", fontSize: 13 }}>Server</label>
              <div style={{ marginTop: 6}}>
                <select value={server} onChange={(e) => setServer(e.target.value)} style={selectStyle}>
                  <option value="">-- select server --</option>
                  {(servers[env][activePart] || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: "#ccc", fontSize: 13 }}>File path</label>
              <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                <input
                  placeholder="/path/to/folder"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  style={inputStyle}
                />
                <button style={smallBtn} onClick={checkPath} disabled={loading}>
                  {loading ? "Checking..." : "Check"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: "#ddd", fontWeight: 600 }}>Contents</div>

            <div style={{ background: "#0f0f0f", borderRadius: 10, padding: 10, flex: 1, minHeight: 320, overflowY: "auto", border: "1px solid #222" }}>
              {entries.length === 0 ? (
                <div style={{ color: "#777", padding: 12 }}>No entries yet. Click Check to list files.</div>
              ) : (
                entries.map((e) => (
                  <div
                    key={e.fullPath}
                    onClick={() => toggleSelect(e.fullPath)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px",
                      borderRadius: 8,
                      background: selected.has(e.fullPath) ? "#1b1b1b" : "transparent",
                      cursor: "pointer",
                      marginBottom: 6,
                    }}
                  >
                    <input type="checkbox" checked={selected.has(e.fullPath)} readOnly />
                    <div style={{ color: e.type === "dir" ? "#ff7b7b" : "#fff", fontWeight: 500 }}>{e.name}</div>
                    <div style={{ marginLeft: "auto", color: "#999", fontSize: 12 }}>{e.size ? formatSize(e.size) : ""}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{ ...smallBtn, flex: 1, background: "#444" }}
                onClick={() => {
                  setSelected(new Set());
                }}
              >
                Clear Selection
              </button>

              <button
                style={{ ...smallBtn, flex: 1, background: selected.size ? "linear-gradient(90deg,#b30000,#ff3b3b)" : "#666" }}
                onClick={handleDownload}
                disabled={entries.length === 0}
              >
                {selected.size ? "Download Selected" : "Download All"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  let b = bytes;
  do {
    b /= 1024;
    i++;
  } while (b >= 1024 && i < units.length - 1);
  return `${b.toFixed(1)} ${units[i]}`;
}
