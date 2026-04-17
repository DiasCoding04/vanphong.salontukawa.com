export function DashboardPage({ data }) {
  const activeStaff = data.staff.filter((s) => s.status === "active").length;
  const mainStaff = data.staff.filter((s) => s.type === "main").length;
  const assistantStaff = data.staff.filter((s) => s.type === "assistant").length;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">{"Chi nh\u00e1nh"}</div><div className="stat-value">{data.branches.length}</div></div>
        <div className="stat-card"><div className="stat-title">{"Nh\u00e2n s\u1ef1 ho\u1ea1t \u0111\u1ed9ng"}</div><div className="stat-value">{activeStaff}</div></div>
        <div className="stat-card"><div className="stat-title">{"Th\u1ee3 ch\u00ednh"}</div><div className="stat-value">{mainStaff}</div></div>
        <div className="stat-card"><div className="stat-title">{"Th\u1ee3 ph\u1ee5"}</div><div className="stat-value">{assistantStaff}</div></div>
      </div>
      <div className="card">
        <div className="page-header">
          <h3>{"T\u1ed5ng quan h\u1ec7 th\u1ed1ng"}</h3>
          <span className="muted">{data.loading ? "\u0110ang t\u1ea3i..." : "\u0110\u00e3 \u0111\u1ed3ng b\u1ed9 d\u1eef li\u1ec7u"}</span>
        </div>
        <p className="muted">{data.error || "D\u1eef li\u1ec7u KPI v\u00e0 l\u01b0\u01a1ng \u0111\u01b0\u1ee3c t\u00ednh tr\u1ef1c ti\u1ebfp t\u1eeb backend \u0111\u1ec3 \u0111\u1ea3m b\u1ea3o nh\u1ea5t qu\u00e1n."}</p>
      </div>
    </>
  );
}
