import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney } from "../utils/format";

export function KpiPage({ data }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    api.getKpiReport(month).then((allRows) => {
      setRows(branchId ? allRows.filter((x) => x.branch_id === Number(branchId)) : allRows);
    });
  }, [month, branchId]);

  const summary = useMemo(() => {
    const pass = rows.filter((x) => x.allPass).length;
    return { pass, fail: rows.length - pass };
  }, [rows]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">Tất cả chi nhánh</option>
          {data.branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <strong>Đạt KPI: {summary.pass} / {rows.length}</strong>
      </div>
      <table>
        <thead><tr><th>Nhân viên</th><th>Loại</th><th>Bookings</th><th>Check-in %</th><th>Gội</th><th>Doanh thu</th><th>Kết quả</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td><span className={`badge ${r.type === "main" ? "badge-blue" : "badge-yellow"}`}>{r.type === "main" ? "Thợ chính" : "Thợ phụ"}</span></td>
              <td>{r.totalBookings}</td>
              <td>{r.checkinRate}%</td>
              <td>{r.type === "assistant" ? r.totalWash : "-"}</td>
              <td>{r.type === "assistant" ? fmtMoney(r.totalRevenue) : "-"}</td>
              <td><span className={`badge ${r.allPass ? "badge-green" : "badge-red"}`}>{r.allPass ? "Đạt" : "Không đạt"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
