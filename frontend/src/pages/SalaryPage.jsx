import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney } from "../utils/format";

export function SalaryPage({ data }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [commission, setCommission] = useState(0);
  const [booking8, setBooking8] = useState(0);
  const [kpiBonus, setKpiBonus] = useState(0);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyNote, setPenaltyNote] = useState("");

  async function load() {
    setRows(await api.getSalaryReport(month));
  }

  useEffect(() => {
    load();
  }, [month]);

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.total, 0), [rows]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <strong>Tổng quỹ lương: {fmtMoney(total)}</strong>
      </div>
      <table>
        <thead><tr><th>Nhân viên</th><th>Ngày công</th><th>Lương cứng</th><th>Commission</th><th>8% KDL</th><th>Thưởng KPI</th><th>Phạt KPI</th><th>Phạt PS</th><th>Tổng</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.workDays}</td>
              <td>{fmtMoney(r.base)}</td>
              <td>{fmtMoney(r.commission)}</td>
              <td>{fmtMoney(r.booking8)}</td>
              <td>{fmtMoney(r.kpiBonus)}</td>
              <td>{r.failPenalty > 0 ? `-${fmtMoney(r.failPenalty)}` : "-"}</td>
              <td>{r.penalties > 0 ? `-${fmtMoney(r.penalties)}` : "-"}</td>
              <td>{fmtMoney(r.total)}</td>
              <td><button className="primary" onClick={() => { setSelected(r); setCommission(r.commission); setBooking8(r.booking8); setKpiBonus(r.kpiBonus); }}>Nhập</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>Nhập thưởng/phạt - {selected.name}</h4>
          <div className="row">
            <input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} placeholder="Commission" />
            <input type="number" value={booking8} onChange={(e) => setBooking8(Number(e.target.value))} placeholder="8% KDL" />
            <input type="number" value={kpiBonus} onChange={(e) => setKpiBonus(Number(e.target.value))} placeholder="Thưởng KPI" />
            <button
              className="primary"
              onClick={async () => {
                await api.saveSalaryBonusSet({ staffId: selected.id, month, commission, booking8, kpibonus: kpiBonus });
                await load();
              }}
            >
              Lưu thưởng
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(Number(e.target.value))} placeholder="Tiền phạt phát sinh" />
            <input value={penaltyNote} onChange={(e) => setPenaltyNote(e.target.value)} placeholder="Ghi chú lý do phạt" />
            <button
              className="primary"
              onClick={async () => {
                await api.addSalaryAdjustment({ staffId: selected.id, month, type: "penalty", amount: penaltyAmount, note: penaltyNote });
                setPenaltyAmount(0);
                setPenaltyNote("");
                await load();
              }}
            >
              Thêm phạt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
