import React, { useState, useEffect } from "react";

export default function DownloadPortalSimple() {
  const [activePart, setActivePart] = useState("ACQ");
  const [env, setEnv] = useState("SIT");
  const [server, setServer] = useState("");
  const [path, setPath] = useState("");
  const [port, setPort] = useState("");
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

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

  function computePortForEnv(envVal) {
    return envVal === "UAT" ? "7111" : "7001";
  }

  async function checkPath(overridePath) {
    const p = overridePath ?? path;
    if (!server) return alert("Please select a server");
    if (!p) return alert("Please enter a path");
    setLoading(true);
    setEntries([]);
    setSelected(new Set());

    try {
      const portToUse = computePortForEnv(env);
      setPort(portToUse);
      const url = `http://${server}:${portToUse}/api/list`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: p }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response from server");
      const normalized = data.map((e) => ({
        name: e.name ?? e.fileName ?? "",
        fullPath: e.fullPath ?? e.path ?? e.name ?? "",
        type: e.type ?? (e.isDir ? "dir" : "file") ?? "file",
        size: e.size ?? null,
        mtime: parseMtime(e),
        raw: e,
      }));
      setEntries(normalized);
      setBreadcrumbs(p.split("/").filter(Boolean));
    } catch (err) {
      console.error("checkPath error:", err);
      alert("Failed to fetch listing: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function parseMtime(e) {
    const possible = [e.mtime, e.modified, e.mtimeMs, e.mtimeMs || e.mtimeEpoch, e.raw?.mtime, e.raw?.modified];
    for (const v of possible) {
      if (!v && v !== 0) continue;
      if (typeof v === "number") return v;
      const n = Date.parse(v);
      if (!isNaN(n)) return n;
    }
    return null;
  }

  function toggleSelect(fullPath) {
    const s = new Set(selected);
    if (s.has(fullPath)) s.delete(fullPath);
    else s.add(fullPath);
    setSelected(s);
  }

  function handleClickEntry(e) {
    toggleSelect(e.fullPath);
  }

  async function handleDoubleClickEntry(e) {
    if (e.type === "dir") {
      setPath(e.fullPath);
      await checkPath(e.fullPath);
    } else {
      await downloadSingle(e.fullPath, e.name);
    }
  }

  async function handleDownload() {
    if (!server) return alert("Please select a server");
    const sel = Array.from(selected);
    const payload = { path, selected: sel };

    try {
      const portToUse = computePortForEnv(env);
      setPort(portToUse);
      const url = `http://${server}:${portToUse}/api/download`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "download";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) filename = match[1];
      } else {
        filename = sel.length === 1 ? sel[0].split("/").pop() : "download.zip";
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
      setBreadcrumbs([]);
    } catch (err) {
      console.error("download error:", err);
      alert("Download failed: " + (err.message || err));
    }
  }

  async function downloadSingle(fullPath, name) {
    if (!server) return alert("Please select a server");
    const payload = { path, selected: [fullPath] };
    try {
      const portToUse = computePortForEnv(env);
      setPort(portToUse);
      const url = `http://${server}:${portToUse}/api/download`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = name;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) filename = match[1];
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("downloadSingle error:", err);
      alert("Download failed: " + (err.message || err));
    }
  }

  function handleGoBack() {
    if (!path) return;
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return;
    parts.pop();
    const newPath = "/" + parts.join("/");
    setPath(newPath);
    checkPath(newPath);
  }

  function handleBreadcrumbClick(idx) {
    const newPath = "/" + breadcrumbs.slice(0, idx + 1).join("/");
    setPath(newPath);
    checkPath(newPath);
  }

  const filteredAndSortedEntries = entries
    .filter((e) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return e.name.toLowerCase().includes(s) || e.fullPath.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      if (a.mtime && b.mtime) return sortNewestFirst ? b.mtime - a.mtime : a.mtime - b.mtime;
      return 0;
    });

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
    width: "80%",
    maxWidth: "95vw",
    minHeight: "710px",
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

  const inputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", flex: 1 };
  const selectStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#0f0f0f", color: "#fff", width: 400 };
  const smallBtn = { padding: "10px 14px", borderRadius: 8, cursor: "pointer", border: "none", background: "#333", color: "#fff" };
  const rightPanel = { width: 640, display: "flex", flexDirection: "column", gap: 12 };
  const listingWrapper = { background: "#0f0f0f", borderRadius: 10, padding: 10, height: 420, overflow: "auto", border: "1px solid #222", whiteSpace: "nowrap" };
  const entryBaseStyle = { display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, cursor: "pointer", marginBottom: 6, minWidth: "100%" };

  return (
    <div style={container}>
      <div style={card}>
        <div style={headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#ff5a5a" }}>Download Files</div>
            <div style={{ color: "#aaa" }}>Batch Selected - {activePart}</div>
          </div>
          <div style={switcher}>
            <button className="no-reset" style={partButton(activePart === "ACQ")} onClick={() => setActivePart("ACQ")}>ACQ</button>
            <button style={partButton(activePart === "ISS")} onClick={() => setActivePart("ISS")}>ISS</button>
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
              <div style={{ marginTop: 6 }}>
                <select value={server} onChange={(e) => setServer(e.target.value)} style={selectStyle}>
                  <option value="">-- select server --</option>
                  {(servers[env][activePart] || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: "#ccc", fontSize: 13 }}>File path</label>
              <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                <input placeholder="/path/to/folder" value={path} onChange={(e) => setPath(e.target.value)} style={inputStyle} />
                <button style={smallBtn} onClick={() => checkPath()} disabled={loading}>{loading ? "Checking..." : "Check"}</button>
              </div>
            </div>
          </div>

          <div style={rightPanel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ color: "#ddd", fontWeight: 600 }}>Contents</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input placeholder="Search files/folders..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, width: 220 }} />
                <button style={{ ...smallBtn, minWidth: 36 }} title="Toggle sort by time" onClick={() => setSortNewestFirst((v) => !v)}>
                  {sortNewestFirst ? "Newest" : "Oldest"}
                </button>
              </div>
            </div>

            {breadcrumbs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ccc", fontSize: 13 }}>
                <button style={{ ...smallBtn, background: "#222" }} onClick={handleGoBack}>⬅ Back</button>
                {breadcrumbs.map((b, i) => (
                  <span key={i} style={{ cursor: "pointer" }} onClick={() => handleBreadcrumbClick(i)}>
                    {i > 0 && <span style={{ color: "#555" }}> / </span>}
                    {b}
                  </span>
                ))}
              </div>
            )}

            <div style={listingWrapper}>
              {filteredAndSortedEntries.length === 0 ? (
                <div style={{ color: "#777", padding: 12 }}>No entries yet. Click Check to list files.</div>
              ) : (
                filteredAndSortedEntries.map((e) => {
                  const isSelected = selected.has(e.fullPath);
                  const icon = e.type === "dir" ? "📁" : e.name.endsWith(".zip") ? "🗜️" : "📄";
                  return (
                    <div key={e.fullPath} onClick={() => handleClickEntry(e)} onDoubleClick={() => handleDoubleClickEntry(e)} style={{
                      ...entryBaseStyle,
                      background: isSelected ? "#1b1b1b" : "transparent",
                      border: isSelected ? "1px solid #333" : "1px solid transparent",
                    }}>
                      <div style={{ width: 24 }}>{icon}</div>
                      <div style={{ color: e.type === "dir" ? "#ff7b7b" : "#fff", fontWeight: 500, minWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.name}
                      </div>
                      <div style={{ marginRight: "auto", color: "#999", fontSize: 12 }}>{e.size ? formatSize(e.size) : ""}</div>
                      <div style={{ color: "#777", fontSize: 12, marginLeft: 12, minWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.mtime ? new Date(e.mtime).toLocaleString() : ""}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...smallBtn, flex: 1, background: "#444" }} onClick={() => setSelected(new Set())}>Clear Selection</button>
              <button style={{ ...smallBtn, flex: 1, background: selected.size ? "linear-gradient(90deg,#b30000,#ff3b3b)" : "#666" }} onClick={handleDownload} disabled={entries.length === 0}>
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
