import { useState, useEffect } from "react";
import "./App.css";

// Auto-detect backend port or deployment hostname
const DEFAULT_API_URL = 
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000/bfhl"
    : "https://bajaj-bfhl-0764.onrender.com/bfhl";

const PRESETS = {
  simple: {
    name: "🌳 Simple Tree",
    value: "A->B, A->C, B->D"
  },
  disjoint: {
    name: "🔗 Disjoint",
    value: "A->B, B->C, X->Y, Y->Z"
  },
  cycle: {
    name: "🔄 Cycle",
    value: "A->B, B->C, C->A"
  },
  diamond: {
    name: "💎 Diamond",
    value: "A->B, A->C, B->D, C->D"
  },
  invalid: {
    name: "⚠️ Mixed/Invalid",
    value: "A->B, X->Y, invalid_format, Z->Z"
  }
};

// Interactive Node Component
function TreeNode({ node, childrenObj, isRoot = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const childKeys = Object.keys(childrenObj || {});
  const hasChildren = childKeys.length > 0;

  return (
    <div className="tree-node-wrapper">
      <div 
        className={`tree-node-item ${isRoot ? "is-root" : ""}`}
        onClick={() => hasChildren && setCollapsed(!collapsed)}
        title={hasChildren ? (collapsed ? "Click to expand" : "Click to collapse") : ""}
      >
        <span className="tree-node-icon">
          {hasChildren ? (collapsed ? "▶" : "▼") : "•"}
        </span>
        <span>{node}</span>
      </div>
      {hasChildren && !collapsed && (
        <div className="tree-node-children">
          {childKeys.map((childKey) => (
            <TreeNode 
              key={childKey} 
              node={childKey} 
              childrenObj={childrenObj[childKey]} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tree view renderer
function TreeComponent({ hierarchy }) {
  const { root, tree, depth, has_cycle } = hierarchy;

  if (has_cycle) {
    return (
      <div className="tree-component">
        <div className="tree-component-header">
          <span className="tree-root-label">Root candidate: {root}</span>
          <span className="tree-badge cycle">Cycle Detected</span>
        </div>
        <div style={{ color: "#ef4444", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <span>⚠️</span>
          <span>A loop or feedback path was found, preventing hierarchical layout.</span>
        </div>
      </div>
    );
  }

  // tree contains the nested structure. It has a single root node key.
  const rootChildren = tree[root] || {};

  return (
    <div className="tree-component">
      <div className="tree-component-header">
        <span className="tree-root-label">Root Node: {root}</span>
        <div className="tree-info">
          <span>Depth: <strong>{depth}</strong></span>
          <span className="tree-badge tree">Tree</span>
        </div>
      </div>
      <div style={{ paddingLeft: 8 }}>
        <TreeNode node={root} childrenObj={rootChildren} isRoot={true} />
      </div>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("A->B, A->C, B->D");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("visualizer");
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [configOpen, setConfigOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy JSON");
  const [validEdgeCount, setValidEdgeCount] = useState(0);

  // Parse input in real-time to show helper count
  useEffect(() => {
    let parsedCount = 0;
    try {
      const parsed = JSON.parse(input.trim());
      if (parsed.data && Array.isArray(parsed.data)) {
        parsedCount = parsed.data.filter(s => typeof s === "string" && s.includes("->")).length;
      } else if (Array.isArray(parsed)) {
        parsedCount = parsed.filter(s => typeof s === "string" && s.includes("->")).length;
      }
    } catch {
      // Plain text comma separated
      const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
      parsedCount = parts.filter(s => s.includes("->")).length;
    }
    setValidEdgeCount(parsedCount);
  }, [input]);

  async function handleSubmit() {
    setError("");
    setResult(null);
    setLoading(true);

    let edges = [];

    try {
      const parsed = JSON.parse(input.trim());
      if (parsed.data && Array.isArray(parsed.data)) {
        edges = parsed.data;
      } else if (Array.isArray(parsed)) {
        edges = parsed;
      } else {
        throw new Error("JSON structure must be an array or contain a 'data' array field.");
      }
    } catch {
      // Plain text parsing
      edges = input.split(",").map((s) => s.trim()).filter(Boolean);
    }

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: edges }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status code ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      // Auto switch tabs
      if (data.hierarchies && data.hierarchies.length > 0) {
        setActiveTab("visualizer");
      } else {
        setActiveTab("metadata");
      }
    } catch (e) {
      setError(`❌ API request failed. ${e.message}. Check if server is running at endpoint.`);
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopyStatus("Copied! ✓");
    setTimeout(() => setCopyStatus("Copy JSON"), 2000);
  };

  return (
    <div className="app-container">
      {/* Top Header & Dev Badges */}
      <header className="app-header">
        <div className="logo-section">
          <h1>
            <span className="logo-icon">🌲</span>
            <span>BFHL Tree Explorer</span>
          </h1>
        </div>
        
        <div className="dev-badges">
          <div className="badge">
            <span className="badge-label">User ID:</span>
            <span>Harshraj_18062005</span>
          </div>
          <div className="badge">
            <span className="badge-label">Roll No:</span>
            <span>2310990764</span>
          </div>
          <div className="badge">
            <span className="badge-label">Colg Email:</span>
            <span>harsh0764.be23@chitkara.edu.in</span>
          </div>
        </div>
      </header>

      {/* Grid Layout */}
      <main className="dashboard-grid">
        {/* Left Control Card */}
        <section className="glass-card">
          <div className="card-title">
            <span>✍️</span>
            <span>Input Edges & Presets</span>
          </div>

          {/* Presets Panel */}
          <div className="preset-section">
            <span className="preset-title">Presets & Examples</span>
            <div className="preset-grid">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className="preset-btn"
                  onClick={() => setInput(preset.value)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Input field */}
          <div className="input-section">
            <div className="input-label-row">
              <label className="input-label">Node List (Edges)</label>
              <span className="parse-count">
                {validEdgeCount} {validEdgeCount === 1 ? "edge" : "edges"} detected
              </span>
            </div>
            <textarea
              className="text-area"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. A->B, A->C, B->D"
              rows={5}
            />
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Tip: Separate edges with commas or enter as a JSON array e.g. <code>["A-&gt;B", "A-&gt;C"]</code>.
            </p>
          </div>

          {/* Submit button */}
          <button 
            className="submit-btn" 
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Analyze Structures</span>
              </>
            )}
          </button>

          {/* Error display */}
          {error && (
            <div className="error-banner">
              <span className="error-icon">❌</span>
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}
        </section>

        {/* Right Output Card */}
        <section className="glass-card" style={{ gap: 20 }}>
          <div className="card-title">
            <span>📊</span>
            <span>Analysis Results</span>
          </div>

          {!result ? (
            <div className="empty-state">
              <span className="empty-icon">🌲</span>
              <h3>No Structures Loaded</h3>
              <p>
                Enter relationship edges on the left panel and click <strong>Analyze Structures</strong> to generate graphs, detect cycles, and trace hierarchies.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="summary-grid">
                <div className="summary-card">
                  <span className="summary-label">Total Trees</span>
                  <span className="summary-val highlight">
                    {result.summary?.total_trees ?? 0}
                  </span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Cycles Found</span>
                  <span className="summary-val" style={{ color: (result.summary?.total_cycles ?? 0) > 0 ? "var(--color-danger)" : "var(--text-primary)" }}>
                    {result.summary?.total_cycles ?? 0}
                  </span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Largest Tree Root</span>
                  <span className="summary-val" style={{ fontSize: 18, color: "var(--color-success)" }}>
                    {result.summary?.largest_tree_root || "None"}
                  </span>
                </div>
              </div>

              {/* Tabs navigation */}
              <div className="tabs-header">
                <button 
                  className={`tab-btn ${activeTab === "visualizer" ? "active" : ""}`}
                  onClick={() => setActiveTab("visualizer")}
                >
                  Visualizer ({result.hierarchies?.length ?? 0})
                </button>
                <button 
                  className={`tab-btn ${activeTab === "metadata" ? "active" : ""}`}
                  onClick={() => setActiveTab("metadata")}
                >
                  Metadata & Filter
                </button>
                <button 
                  className={`tab-btn ${activeTab === "json" ? "active" : ""}`}
                  onClick={() => setActiveTab("json")}
                >
                  Raw Response
                </button>
              </div>

              {/* Tab Contents */}
              <div className="tab-content">
                {activeTab === "visualizer" && (
                  <div className="tree-container">
                    {result.hierarchies && result.hierarchies.length > 0 ? (
                      result.hierarchies.map((h, idx) => (
                        <TreeComponent key={idx} hierarchy={h} />
                      ))
                    ) : (
                      <div className="empty-state" style={{ padding: 40 }}>
                        <span style={{ fontSize: 32 }}>💨</span>
                        <p>No valid hierarchies or structures were identified in the inputs.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "metadata" && (
                  <div className="metadata-container">
                    {/* Invalid Entries */}
                    <div className="meta-group">
                      <span className="meta-group-title">
                        <span>❌</span>
                        <span>Invalid Entries Rejected ({result.invalid_entries?.length ?? 0})</span>
                      </span>
                      {result.invalid_entries && result.invalid_entries.length > 0 ? (
                        <div className="meta-list">
                          {result.invalid_entries.map((item, idx) => (
                            <span key={idx} className="meta-tag invalid">{item}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="meta-empty">No invalid entries. All inputs followed correct formatting.</span>
                      )}
                    </div>

                    {/* Duplicate Edges */}
                    <div className="meta-group" style={{ marginTop: 10 }}>
                      <span className="meta-group-title">
                        <span>⚠️</span>
                        <span>Duplicate Edges Discarded ({result.duplicate_edges?.length ?? 0})</span>
                      </span>
                      {result.duplicate_edges && result.duplicate_edges.length > 0 ? (
                        <div className="meta-list">
                          {result.duplicate_edges.map((item, idx) => (
                            <span key={idx} className="meta-tag duplicate">{item}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="meta-empty">No duplicate edges detected.</span>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "json" && (
                  <div className="json-viewer-container">
                    <div className="json-header">
                      <div className="json-status">
                        <span className="status-dot"></span>
                        <span>Status: 200 OK</span>
                      </div>
                      <button className="copy-btn" onClick={copyToClipboard}>
                        <span>📋</span>
                        <span>{copyStatus}</span>
                      </button>
                    </div>
                    <pre className="pre-json">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}