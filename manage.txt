import { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ServerManager() {
  const [servers, setServers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [newServer, setNewServer] = useState({ ip: "", username: "", port: "22", tag: "" });
  const [editServer, setEditServer] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [role, setRole] = useState("admin"); // change to "user" to test restrictions
  const [showModal, setShowModal] = useState(false);

  const pageSize = 5;

  const loadServers = async () => {
    try {
      const res = await axios.get("/api/servers");
      setServers(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("Failed to load servers.");
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/servers", newServer);
      toast.success("Server added!");
      setNewServer({ ip: "", username: "", port: "22", tag: "" });
      loadServers();
      setShowModal(false);
    } catch (err) {
      toast.error("Failed to add server: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this server?")) return;
    try {
      await axios.delete(`/api/servers/${id}`);
      toast.success("Deleted successfully");
      loadServers();
    } catch {
      toast.error("Failed to delete server");
    }
  };

  const handleEditSave = async () => {
    try {
      await axios.put(`/api/servers/${editServer.id}`, editServer);
      toast.success("Server updated!");
      setEditServer(null);
      loadServers();
    } catch {
      toast.error("Failed to update server");
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    if (!value) setFiltered(servers);
    else {
      setFiltered(
        servers.filter(
          (s) =>
            s.ip.toLowerCase().includes(value.toLowerCase()) ||
            s.username.toLowerCase().includes(value.toLowerCase()) ||
            (s.tag && s.tag.toLowerCase().includes(value.toLowerCase()))
        )
      );
    }
  };

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚙️ Server Manager</h2>

      {/* Top Bar */}
      <div style={styles.topBar}>
        <input
          type="text"
          placeholder="🔍 Search servers..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          ➕ Add Server
        </button>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th>IP</th>
              <th>Username</th>
              <th>Port</th>
              <th>Tag</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((s) => (
              <tr key={s.id} style={styles.tableRow}>
                <td>{s.ip}</td>
                <td>{s.username}</td>
                <td>{s.port}</td>
                <td>{s.tag || "-"}</td>
                <td>
                  <button style={styles.editBtn} onClick={() => setEditServer(s)}>
                    ✏️
                  </button>
                  <button style={styles.delBtn} onClick={() => handleDelete(s.id)}>
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{
              ...styles.pageBtn,
              background: currentPage === i + 1 ? "#d63031" : "#111",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Add Server Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: "#fff" }}>Add New Server</h3>
            <form onSubmit={handleAdd} style={styles.form}>
              <input
                type="text"
                placeholder="IP Address"
                value={newServer.ip}
                onChange={(e) => setNewServer({ ...newServer, ip: e.target.value })}
                required
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Username"
                value={newServer.username}
                onChange={(e) => setNewServer({ ...newServer, username: e.target.value })}
                required
                style={styles.input}
              />
              <input
                type="number"
                placeholder="Port"
                value={newServer.port}
                onChange={(e) => setNewServer({ ...newServer, port: e.target.value })}
                style={styles.input}
              />
              {role === "admin" && (
                <select
                  style={styles.input}
                  value={newServer.tag}
                  onChange={(e) => setNewServer({ ...newServer, tag: e.target.value })}
                >
                  <option value="">Select Tag</option>
                  <option value="SIT">SIT</option>
                  <option value="UAT5">UAT5</option>
                  <option value="UAT3">UAT3</option>
                  <option value="UAT1">UAT1</option>
                </select>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="submit" style={styles.modalBtnAdd}>
                  Add
                </button>
                <button onClick={() => setShowModal(false)} style={styles.modalBtnCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editServer && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: "#fff" }}>Edit Server</h3>
            <input
              type="text"
              value={editServer.ip}
              onChange={(e) => setEditServer({ ...editServer, ip: e.target.value })}
              style={styles.input}
            />
            <input
              type="text"
              value={editServer.username}
              onChange={(e) => setEditServer({ ...editServer, username: e.target.value })}
              style={styles.input}
            />
            <input
              type="number"
              value={editServer.port}
              onChange={(e) => setEditServer({ ...editServer, port: e.target.value })}
              style={styles.input}
            />
            {role === "admin" && (
              <select
                style={styles.input}
                value={editServer.tag}
                onChange={(e) => setEditServer({ ...editServer, tag: e.target.value })}
              >
                <option value="">Select Tag</option>
                <option value="SIT">SIT</option>
                <option value="UAT5">UAT5</option>
                <option value="UAT3">UAT3</option>
                <option value="UAT1">UAT1</option>
              </select>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleEditSave} style={styles.modalBtnAdd}>
                Save
              </button>
              <button onClick={() => setEditServer(null)} style={styles.modalBtnCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}

const styles = {
  container: {
    background: "#0d0d0d",
    minHeight: "100vh",
    color: "#fff",
    padding: "30px",
    fontFamily: "Segoe UI, sans-serif",
  },
  title: {
    fontSize: "26px",
    color: "#ff4d4d",
    textAlign: "center",
    marginBottom: "20px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  searchInput: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#1a1a1a",
    color: "#fff",
    width: "60%",
  },
  addButton: {
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    cursor: "pointer",
  },
  tableWrapper: {
    maxHeight: "400px",
    overflowY: "auto",
    border: "1px solid #333",
    borderRadius: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "#1a1a1a",
    color: "#ff4d4d",
  },
  tableRow: {
    textAlign: "center",
    borderBottom: "1px solid #333",
  },
  editBtn: {
    background: "#3498db",
    border: "none",
    color: "#fff",
    marginRight: "5px",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  delBtn: {
    background: "#e74c3c",
    border: "none",
    color: "#fff",
    borderRadius: "4px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  pagination: {
    marginTop: "10px",
    textAlign: "center",
  },
  pageBtn: {
    margin: "2px",
    padding: "5px 10px",
    borderRadius: "5px",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "20px",
    width: "300px",
  },
  input: {
    background: "#111",
    color: "#fff",
    border: "1px solid #333",
    padding: "8px",
    borderRadius: "6px",
    marginBottom: "10px",
    width: "100%",
  },
  modalBtnAdd: {
    background: "#27ae60",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  modalBtnCancel: {
    background: "#c0392b",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
