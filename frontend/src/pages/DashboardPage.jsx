export function DashboardPage({ data }) {
  const activeStaff = data.staff.filter((s) => s.status === "active").length;
  const mainStaff = data.staff.filter((s) => s.type === "main").length;
  const assistantStaff = data.staff.filter((s) => s.type === "assistant").length;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Chi nhánh</div><div className="stat-value">{data.branches.length}</div></div>
        <div className="stat-card"><div className="stat-title">Nhân sự hoạt động</div><div className="stat-value">{activeStaff}</div></div>
        <div className="stat-card"><div className="stat-title">Thợ chính</div><div className="stat-value">{mainStaff}</div></div>
        <div className="stat-card"><div className="stat-title">Thợ phụ</div><div className="stat-value">{assistantStaff}</div></div>
      </div>
      <div className="card">
        <div className="page-header">
          <h3>Tổng quan hệ thống</h3>
          <span className="muted">{data.loading ? "Đang tải..." : "Đã đồng bộ dữ liệu"}</span>
        </div>
        <p className="muted">{data.error || "Dữ liệu KPI và lương được tính trực tiếp từ backend để đảm bảo nhất quán."}</p>
      </div>
    </>
  );
}
