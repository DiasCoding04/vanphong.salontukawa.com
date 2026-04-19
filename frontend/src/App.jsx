import { useEffect, useMemo, useState } from "react";
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
  { key: "branches", label: "Lọc chi nhánh", icon: "🏢" },
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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [kpiSubTab, setKpiSubTab] = useState("month");
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const data = useData();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const body = useMemo(() => {
    if (!selectedBranchId && activeTab !== "branches" && activeTab !== "dashboard") {
      return (
        <div className="card">
          <h3>Vui lòng chọn chi nhánh</h3>
        </div>
      );
    }
    if (activeTab === "branches") {
      return (
        <div className="card">
          <div className="page-header">
            <h3>Lọc chi nhánh</h3>
            {selectedBranchId && (
              <span className="muted">
                Đang chọn: {data.branches.find((b) => b.id === selectedBranchId)?.name}
              </span>
            )}
          </div>
          <div className="row">
            <input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="Tên chi nhánh mới"
            />
            <button className="primary" onClick={handleCreateBranch}>Thêm</button>
          </div>
          <div className="branch-list" style={{ marginTop: 16 }}>
            {data.branches.map((branch) => (
              <div key={branch.id} className={selectedBranchId === branch.id ? "branch-item active" : "branch-item"}>
                <button className="branch-select" onClick={() => setSelectedBranchId(branch.id)}>
                  {branch.name}
                </button>
                <button className="branch-delete" onClick={() => handleDeleteBranch(branch.id)}>Xóa</button>
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
    if (activeTab === "salary") return <SalaryPage data={data} selectedBranchId={selectedBranchId} />;
    return <DashboardPage data={data} />;
  }, [activeTab, data, selectedBranchId, kpiSubTab]);

  async function handleCreateBranch() {
    const name = newBranchName.trim();
    if (!name) return;
    await api.createBranch({ name });
    setNewBranchName("");
    await data.reload();
  }

  async function handleDeleteBranch(id) {
    if (!confirm("Xóa chi nhánh này?")) return;
    try {
      await api.deleteBranch(id);
      if (selectedBranchId === id) setSelectedBranchId(null);
      await data.reload();
    } catch (error) {
      alert("Không thể xóa chi nhánh có nhân viên.");
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
            <button className="theme-toggle" onClick={toggleTheme} title="Chuyển chế độ sáng/tối">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </header>
        <section className="content">{body}</section>
      </main>
    </div>
  );
}

export default App;
