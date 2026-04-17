import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney } from "../utils/format";

export function KpiPage({ data, selectedBranchId }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.getKpiReport(month, selectedBranchId).then(setRows);
  }, [month, selectedBranchId]);

  const summary = useMemo(() => {
    const pass = rows.filter((x) => x.allPass).length;
    return { pass, fail: rows.length - pass };
  }, [rows]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <strong>{"\u0110\u1ea1t KPI: "}{summary.pass} / {rows.length}</strong>
      </div>
      <table>
        <thead><tr><th>{"Nh\u00e2n vi\u00ean"}</th><th>{"Lo\u1ea1i"}</th><th>Bookings</th><th>Check-in %</th><th>{"G\u1ed9i"}</th><th>{"Doanh thu"}</th><th>{"K\u1ebft qu\u1ea3"}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td><span className={`badge ${r.type === "main" ? "badge-blue" : "badge-yellow"}`}>{r.type === "main" ? "Th\u1ee3 ch\u00ednh" : "Th\u1ee3 ph\u1ee5"}</span></td>
              <td>{r.totalBookings}</td>
              <td>{r.checkinRate}%</td>
              <td>{r.type === "assistant" ? r.totalWash : "-"}</td>
              <td>{r.type === "assistant" ? fmtMoney(r.totalRevenue) : "-"}</td>
              <td><span className={`badge ${r.allPass ? "badge-green" : "badge-red"}`}>{r.allPass ? "\u0110\u1ea1t" : "Kh\u00f4ng \u0111\u1ea1t"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
