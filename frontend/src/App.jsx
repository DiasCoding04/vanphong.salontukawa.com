import { useMemo, useState } from "react";
import { useData } from "./hooks/useData";
import { api } from "./api/client";
import { DashboardPage } from "./pages/DashboardPage";
import { StaffPage } from "./pages/StaffPage";
import { PersonalInfoPage } from "./pages/PersonalInfoPage";
import { AttendancePage } from "./pages/AttendancePage";
import { KpiPage } from "./pages/KpiPage";
import { SalaryPage } from "./pages/SalaryPage";
import { KpiConfigPage } from "./pages/KpiConfigPage";

const tabs = [
  { key: "dashboard", label: "Tổng quan" },
  { key: "branches", label: "Lọc chi nhánh" },
  { key: "staff", label: "Nhân sự" },
  { key: "personal-info", label: "Thông tin cá nhân" },
  { key: "attendance", label: "Chấm công" },
  { key: "kpi", label: "KPI tháng" },
  { key: "salary", label: "Lương tháng" },
  { key: "kpi-config", label: "Cài đặt KPI" }
];
const sidebarTabs = tabs.filter((tab) => tab.key !== "personal-info");
const staffTopTabs = tabs.filter((tab) => tab.key === "staff" || tab.key === "personal-info");

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [newBranchName, setNewBranchName] = useState("");
  const data = useData();

  const body = useMemo(() => {
    if (!selectedBranchId && activeTab !== "branches" && activeTab !== "dashboard") {
      return (
        <div className="card">
          <h3>Vui lòng chọn chi nhánh</h3>
          <p className="muted">Hãy chọn 1 chi nhánh ở cột bên trái trước khi thao tác.</p>
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
    if (activeTab === "kpi") return <KpiPage data={data} selectedBranchId={selectedBranchId} />;
    if (activeTab === "salary") return <SalaryPage data={data} selectedBranchId={selectedBranchId} />;
    if (activeTab === "kpi-config") return <KpiConfigPage data={data} selectedBranchId={selectedBranchId} />;
    return <DashboardPage data={data} />;
  }, [activeTab, data, selectedBranchId]);

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
              {tab.label}
            </button>
          ))}
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
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
          ) : (
            <h2>{tabs.find((x) => x.key === activeTab)?.label}</h2>
          )}
          <span className="muted">Node.js + SQLite · Giờ VN (Asia/Ho_Chi_Minh)</span>
        </header>
        <section className="content">{body}</section>
      </main>
    </div>
  );
}

export default App;
