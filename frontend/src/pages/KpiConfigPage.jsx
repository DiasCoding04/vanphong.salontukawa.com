import { useEffect, useState } from "react";
import { api } from "../api/client";

export function KpiConfigPage() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    api.getKpiConfig().then(setCfg);
  }, []);

  function set(path, value) {
    const keys = path.split(".");
    const cloned = JSON.parse(JSON.stringify(cfg));
    let cursor = cloned;
    for (let i = 0; i < keys.length - 1; i += 1) cursor = cursor[keys[i]];
    cursor[keys[keys.length - 1]] = Number(value);
    setCfg(cloned);
  }

  if (!cfg) return <div className="card">Đang tải KPI config...</div>;

  return (
    <div className="card">
      <div className="page-header"><h3>Cài đặt KPI</h3></div>
      <div className="row">
        <label className="muted">Lịch đặt tháng thợ chính</label>
        <input type="number" value={cfg.main.monthlyBookings} onChange={(e) => set("main.monthlyBookings", e.target.value)} />
        <label className="muted">Check-in tháng thợ chính (%)</label>
        <input type="number" value={cfg.main.monthlyCheckinRate} onChange={(e) => set("main.monthlyCheckinRate", e.target.value)} />
        <label className="muted">KPI gội tuần thợ phụ</label>
        <input type="number" value={cfg.assistant.weeklyWash} onChange={(e) => set("assistant.weeklyWash", e.target.value)} />
        <label className="muted">Doanh thu tháng thợ phụ</label>
        <input type="number" value={cfg.assistant.monthlyRevenue} onChange={(e) => set("assistant.monthlyRevenue", e.target.value)} />
        <label className="muted">Phạt không đạt KPI</label>
        <input type="number" value={cfg.penalties.failKpiPenalty} onChange={(e) => set("penalties.failKpiPenalty", e.target.value)} />
        <button className="primary" onClick={() => api.saveKpiConfig(cfg)}>Lưu cấu hình</button>
      </div>
    </div>
  );
}
