import { useMemo, useState } from "react";
import { useData } from "./hooks/useData";
import { DashboardPage } from "./pages/DashboardPage";
import { StaffPage } from "./pages/StaffPage";
import { AttendancePage } from "./pages/AttendancePage";
import { KpiPage } from "./pages/KpiPage";
import { SalaryPage } from "./pages/SalaryPage";
import { KpiConfigPage } from "./pages/KpiConfigPage";

const tabs = [
  { key: "dashboard", label: "Tổng quan" },
  { key: "staff", label: "Nhân sự" },
  { key: "attendance", label: "Chấm công" },
  { key: "kpi", label: "KPI tháng" },
  { key: "salary", label: "Lương tháng" },
  { key: "kpi-config", label: "Cài đặt KPI" }
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const data = useData();

  const body = useMemo(() => {
    if (activeTab === "staff") return <StaffPage data={data} />;
    if (activeTab === "attendance") return <AttendancePage data={data} />;
    if (activeTab === "kpi") return <KpiPage data={data} />;
    if (activeTab === "salary") return <SalaryPage data={data} />;
    if (activeTab === "kpi-config") return <KpiConfigPage />;
    return <DashboardPage data={data} />;
  }, [activeTab, data]);

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Salon KPI</h1>
        <p className="sidebar-sub">Hệ thống KPI và lương</p>
        <div className="menu">
          {tabs.map((tab) => (
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
          <h2>{tabs.find((x) => x.key === activeTab)?.label}</h2>
          <span className="muted">Node.js + SQLite</span>
        </header>
        <section className="content">{body}</section>
      </main>
    </div>
  );
}

export default App;
