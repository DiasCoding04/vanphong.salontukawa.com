import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useData } from "./hooks/useData";
import { api } from "./api/client";
import { DashboardPage } from "./pages/DashboardPage";
import { StaffPage } from "./pages/StaffPage";
import { PersonalInfoPage } from "./pages/PersonalInfoPage";
import { AttendancePage } from "./pages/AttendancePage";
import { KpiResultsPage } from "./pages/KpiResultsPage";
import { SalaryPage } from "./pages/SalaryPage";
const tabs = [
  { key: "dashboard", label: "Tổng quan", icon: "📊" },
  { key: "branches", label: "Quản lý chi nhánh", icon: "🏢" },
  { key: "staff", label: "Nhân sự", icon: "👥" },
  { key: "personal-info", label: "Thông tin cá nhân", icon: "👤" },
  { key: "attendance", label: "Chấm công", icon: "📅" },
  { key: "kpi", label: "Kết quả KPI", icon: "📈" },
  { key: "salary", label: "Lương tháng", icon: "💰" }
];
const sidebarTabs = tabs.filter((tab) => tab.key !== "personal-info");
const staffTopTabs = tabs.filter((tab) => tab.key === "staff" || tab.key === "personal-info");

const kpiTopTabs = [
  { key: "week", label: "KPI tuần" },
  { key: "month", label: "KPI tháng" },
  { key: "manager", label: "KPI quản lí" },
  { key: "config", label: "Cài đặt KPI" }
];

function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("activeTab") || "dashboard");
  const [kpiSubTab, setKpiSubTab] = useState(() => localStorage.getItem("kpiSubTab") || "month");
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem("selectedBranchId");
    return saved ? Number(saved) : null;
  });
  const [newBranchName, setNewBranchName] = useState("");
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editBranchName, setEditBranchName] = useState("");
  const branchPickerRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const data = useData();

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("kpiSubTab", kpiSubTab);
  }, [kpiSubTab]);

  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem("selectedBranchId", selectedBranchId);
    } else {
      localStorage.removeItem("selectedBranchId");
    }
  }, [selectedBranchId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useLayoutEffect(() => {
    if (data.loading) return;
    if (data.branches.length === 0) {
      if (selectedBranchId != null) setSelectedBranchId(null);
      return;
    }
    const valid = selectedBranchId != null && data.branches.some((b) => b.id === selectedBranchId);
    if (!valid) setSelectedBranchId(data.branches[0].id);
  }, [data.loading, data.branches, selectedBranchId]);

  useEffect(() => {
    if (!branchPickerOpen) return;
    const onDown = (e) => {
      if (branchPickerRef.current && !branchPickerRef.current.contains(e.target)) {
        setBranchPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [branchPickerOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const renderBody = () => {
    if (!data.loading && !data.error && data.branches.length === 0 && activeTab !== "branches") {
      return (
        <div className="card">
          <h3>Chưa có chi nhánh</h3>
          <p className="muted">Vào mục Quản lý chi nhánh để thêm chi nhánh đầu tiên.</p>
        </div>
      );
    }
    if (activeTab === "branches") {
      return (
        <div className="card">
          <div className="page-header">
            <h3>Quản lý chi nhánh</h3>
            <span className="muted">Thêm, sửa tên hoặc xóa chi nhánh. Lọc dữ liệu theo chi nhánh dùng nút ở góc trên bên phải.</span>
          </div>
          <div className="row">
            <input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Tên chi nhánh mới"
            />
            <button type="button" className="primary" onClick={handleCreateBranch}>Thêm</button>
          </div>
          <div className="branch-list" style={{ marginTop: 16 }}>
            {data.branches.map((branch) => (
              <div key={branch.id} className="branch-item branch-item-manage">
                {editingBranchId === branch.id ? (
                  <>
                    <input
                      className="branch-edit-input"
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      aria-label="Tên chi nhánh"
                    />
                    <button
                      type="button"
                      className="primary"
                      onClick={() => handleSaveBranchName(branch.id)}
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setEditingBranchId(null);
                        setEditBranchName("");
                      }}
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <span className="branch-item-name">{branch.name}</span>
                    <button
                      type="button"
                      className="secondary branch-edit-btn"
                      onClick={() => {
                        setEditingBranchId(branch.id);
                        setEditBranchName(branch.name);
                      }}
                      title="Sửa tên"
                    >
                      Sửa
                    </button>
                    <button type="button" className="branch-delete" onClick={() => handleDeleteBranch(branch.id)} title="Xóa">🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (activeTab === "staff") return <StaffPage data={data} selectedBranchId={selectedBranchId} />;
    if (activeTab === "personal-info") return <PersonalInfoPage data={data} selectedBranchId={selectedBranchId} />;
    if (activeTab === "attendance") return <AttendancePage data={data} selectedBranchId={selectedBranchId} />;
    if (activeTab === "kpi") return (
      <KpiResultsPage data={data} selectedBranchId={selectedBranchId} subTab={kpiSubTab} />
    );
    if (activeTab === "salary") return <SalaryPage selectedBranchId={selectedBranchId} />;
    return <DashboardPage data={data} selectedBranchId={selectedBranchId} />;
  };

  async function handleCreateBranch() {
    const name = newBranchName.trim();
    if (!name) return;
    await api.createBranch({ name });
    setNewBranchName("");
    await data.reload();
  }

  async function handleSaveBranchName(branchId) {
    const name = editBranchName.trim();
    if (!name) return;
    try {
      await api.updateBranch(branchId, { name });
      setEditingBranchId(null);
      setEditBranchName("");
      await data.reload();
    } catch (e) {
      alert(e.message || "Không lưu được tên chi nhánh.");
    }
  }

  async function handleDeleteBranch(id) {
    if (!confirm("Xóa chi nhánh này?")) return;
    try {
      await api.deleteBranch(id);
      if (selectedBranchId === id) setSelectedBranchId(null);
      await data.reload();
    } catch (e) {
      if (e.canForce) {
        if (confirm(e.message)) {
          try {
            await api.deleteBranch(id, true);
            if (selectedBranchId === id) setSelectedBranchId(null);
            await data.reload();
          } catch (err) {
            alert(err.message || "Không thể xóa sạch dữ liệu.");
          }
        }
      } else {
        alert(e.message || "Lỗi khi xóa chi nhánh.");
      }
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Tú Ka Wa Office</h1>
        <p className="sidebar-sub">Hệ thống KPI và lương</p>
        <div className="menu">
          {sidebarTabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "menu-item active" : "menu-item"}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="menu-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {activeTab === "staff" || activeTab === "personal-info" ? (
              <div className="top-tabs">
                {staffTopTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={activeTab === tab.key ? "top-tab active" : "top-tab"}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : activeTab === "kpi" ? (
              <div className="top-tabs">
                {kpiTopTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={kpiSubTab === tab.key ? "top-tab active" : "top-tab"}
                    onClick={() => setKpiSubTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : (
              <h2>{tabs.find((x) => x.key === activeTab)?.label}</h2>
            )}
          </div>
          <div className="topbar-right">
            <div className="topbar-developer-credit">
              <span className="topbar-developer-line">Developer: Nguyen Viet Son</span>
              <span className="topbar-developer-line">Contact: 0978478240</span>
            </div>
            <div className="branch-picker-wrap" ref={branchPickerRef}>
              <button
                type="button"
                className="branch-picker-trigger"
                onClick={() => setBranchPickerOpen((o) => !o)}
                title="Chọn chi nhánh làm việc"
                disabled={data.loading || !!data.error}
              >
                <span className="branch-picker-label">
                  {data.branches.length === 0
                    ? "Chưa có chi nhánh"
                    : selectedBranchId
                      ? data.branches.find((b) => b.id === selectedBranchId)?.name ?? "Chi nhánh"
                      : "Chọn chi nhánh"}
                </span>
                <span className="branch-picker-caret" aria-hidden>▾</span>
              </button>
              {branchPickerOpen && !data.loading && !data.error && (
                <div className="branch-picker-dropdown" role="listbox">
                  {data.branches.length === 0 ? (
                    <div className="branch-picker-empty muted">Chưa có chi nhánh — vào Quản lý chi nhánh để thêm.</div>
                  ) : (
                    data.branches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        role="option"
                        className={`branch-picker-option${selectedBranchId === b.id ? " active" : ""}`}
                        onClick={() => {
                          setSelectedBranchId(b.id);
                          setBranchPickerOpen(false);
                        }}
                      >
                        {b.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button type="button" className="theme-toggle" onClick={toggleTheme} title="Chuyển chế độ sáng/tối">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </header>
        <section className="content">
          {data.loading ? <p className="muted">Đang tải...</p> : data.error ? <p className="error-text">Lỗi tải dữ liệu: {data.error}</p> : renderBody()}
        </section>
      </main>
    </div>
  );
}

export default App;
