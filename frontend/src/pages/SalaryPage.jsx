import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney } from "../utils/format";

export function SalaryPage({ selectedBranchId }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [commission, setCommission] = useState(0);
  const [booking8, setBooking8] = useState(0);
  const [kpiBonus, setKpiBonus] = useState(0);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyNote, setPenaltyNote] = useState("");
  const [isApplyingHold, setIsApplyingHold] = useState(false);

  async function load() {
    setRows(await api.getSalaryReport(month, selectedBranchId));
  }

  useEffect(() => {
    load();
  }, [month, selectedBranchId]);

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.total, 0), [rows]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button
          className="secondary"
          disabled={isApplyingHold}
          onClick={async () => {
            setIsApplyingHold(true);
            try {
              await api.applyMonthlyHoldDeductions({ month, branchId: selectedBranchId });
              await load();
            } finally {
              setIsApplyingHold(false);
            }
          }}
        >
          {isApplyingHold ? "\u0110ang ch\u1ed1t..." : "Ch\u1ed1t tr\u1eeb giam l\u01b0\u01a1ng th\u00e1ng"}
        </button>
        <strong>{"T\u1ed5ng qu\u1ef9 l\u01b0\u01a1ng: "}{fmtMoney(total)}</strong>
      </div>
      <table>
        <thead><tr><th>{"Nh\u00e2n vi\u00ean"}</th><th>{"Ng\u00e0y c\u00f4ng"}</th><th>{"L\u01b0\u01a1ng c\u1ee9ng"}</th><th>Commission</th><th>8% KDL</th><th>{"Th\u01b0\u1edfng KPI"}</th><th>{"Ph\u1ea1t KPI"}</th><th>{"Ph\u1ea1t PS"}</th><th>{"Tr\u1eeb giam l\u01b0\u01a1ng (15%)"}</th><th>{"Giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i"}</th><th>{"T\u1ed5ng"}</th><th></th></tr></thead>
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
              <td>{r.holdDeduction > 0 ? `-${fmtMoney(r.holdDeduction)}` : "-"}</td>
              <td>{r.holdRemainingAfter > 0 ? fmtMoney(r.holdRemainingAfter) : "\u0110\u00e3 giam \u0111\u1ee7"}</td>
              <td>{fmtMoney(r.total)}</td>
              <td><button className="primary" onClick={() => { setSelected(r); setCommission(r.commission); setBooking8(r.booking8); setKpiBonus(r.kpiBonus); }}>{"Nh\u1eadp"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>{"Nh\u1eadp th\u01b0\u1edfng/ph\u1ea1t - "}{selected.name}</h4>
          <div className="row">
            <input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} placeholder="Commission" />
            <input type="number" value={booking8} onChange={(e) => setBooking8(Number(e.target.value))} placeholder="8% KDL" />
            <input type="number" value={kpiBonus} onChange={(e) => setKpiBonus(Number(e.target.value))} placeholder={"Th\u01b0\u1edfng KPI"} />
            <button className="primary" onClick={async () => { await api.saveSalaryBonusSet({ staffId: selected.id, month, commission, booking8, kpibonus: kpiBonus }); await load(); }}>
              {"L\u01b0u th\u01b0\u1edfng"}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(Number(e.target.value))} placeholder={"Ti\u1ec1n ph\u1ea1t ph\u00e1t sinh"} />
            <input value={penaltyNote} onChange={(e) => setPenaltyNote(e.target.value)} placeholder={"Ghi ch\u00fa l\u00fd do ph\u1ea1t"} />
            <button className="primary" onClick={async () => { await api.addSalaryAdjustment({ staffId: selected.id, month, type: "penalty", amount: penaltyAmount, note: penaltyNote }); setPenaltyAmount(0); setPenaltyNote(""); await load(); }}>
              {"Th\u00eam ph\u1ea1t"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
