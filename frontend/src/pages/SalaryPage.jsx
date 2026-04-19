/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney } from "../utils/format";

export function SalaryPage({ selectedBranchId }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [commission, setCommission] = useState(0);
  const [isApplyingHold, setIsApplyingHold] = useState(false);
  const [penaltyHistory, setPenaltyHistory] = useState(null);

  const load = useCallback(async () => {
    setRows(await api.getSalaryReport(month, selectedBranchId));
  }, [month, selectedBranchId]);

  async function openPenaltyHistory(r) {
    try {
      const list = await api.getSalaryAdjustments({ month, staffId: r.id, type: "penalty" });
      setPenaltyHistory({ name: r.name, staffId: r.id, rows: list });
    } catch (e) {
      alert(e.message || "Không tải được lịch sử phạt");
    }
  }

  useEffect(() => {
    setPenaltyHistory(null);
    load();
  }, [month, selectedBranchId, load]);

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.total, 0), [rows]);

  const mainStaffRows = useMemo(() => rows.filter(r => r.type === "main"), [rows]);
  const assistantStaffRows = useMemo(() => rows.filter(r => r.type === "assistant"), [rows]);

  function renderTable(title, staffList) {
    if (staffList.length === 0) return null;
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h3>
        <div className="table-responsive">
          <table>
            <thead><tr><th>{"Nh\u00e2n vi\u00ean"}</th><th>{"Ng\u00e0y c\u00f4ng"}</th><th>{"L\u01b0\u01a1ng c\u1ee9ng"}</th><th>Hoa hồng / Commission</th><th>{"Th\u01b0\u1edfng KPI"}</th><th>{"Ph\u1ea1t KPI"}</th><th>{"Ph\u1ea1t PS"}</th><th>{"Tr\u1eeb giam l\u01b0\u01a1ng (15%)"}</th><th>{"Giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i"}</th><th>{"T\u1ed5ng"}</th><th></th></tr></thead>
            <tbody>
              {staffList.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.workDays}</td>
                  <td>{fmtMoney(r.base)}</td>
                  <td>{fmtMoney(r.commission)}</td>
                  <td>{fmtMoney(r.kpiBonus)}</td>
                  <td>{r.failPenalty > 0 ? `-${fmtMoney(r.failPenalty)}` : "-"}</td>
                  <td>
                    {r.penalties > 0 ? (
                      <button type="button" className="salary-penalty-link" onClick={() => openPenaltyHistory(r)}>
                        {`-${fmtMoney(r.penalties)}`}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{r.holdDeduction > 0 ? `-${fmtMoney(r.holdDeduction)}` : "-"}</td>
                  <td>{r.holdRemainingAfter > 0 ? fmtMoney(r.holdRemainingAfter) : "\u0110\u00e3 giam \u0111\u1ee7"}</td>
                  <td>{fmtMoney(r.total)}</td>
                  <td><button className="primary" onClick={() => { setSelected(r); setCommission(r.commission); }}>{"Nh\u1eadp"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row">
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
      </div>
      
      {rows.length === 0 ? (
        <div className="card">
          <p className="muted">Không có dữ liệu nhân viên cho tháng này.</p>
        </div>
      ) : (
        <>
          {renderTable("Thợ chính", mainStaffRows)}
          {renderTable("Thợ phụ", assistantStaffRows)}
        </>
      )}

      {penaltyHistory && (
        <div className="penalty-history-overlay" role="dialog" aria-modal="true" aria-label="L\u1ecbch s\u1eed ph\u1ea1t">
          <button type="button" className="penalty-history-backdrop" aria-label="\u0110\u00f3ng" onClick={() => setPenaltyHistory(null)} />
          <div className="penalty-history-panel card">
            <div className="page-header" style={{ marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>
                {"Ph\u1ea1t ph\u00e1t sinh — "}
                {penaltyHistory.name}
                {" · "}
                {month}
              </h4>
              <button type="button" className="secondary" onClick={() => setPenaltyHistory(null)}>
                {"\u0110\u00f3ng"}
              </button>
            </div>
            {penaltyHistory.rows.length === 0 ? (
              <p className="muted">Không có dòng phạt.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{"L\u00fd do / ghi ch\u00fa"}</th>
                    <th>{"S\u1ed1 ti\u1ec1n"}</th>
                  </tr>
                </thead>
                <tbody>
                  {penaltyHistory.rows.map((p) => (
                    <tr key={p.id}>
                      <td>{p.note || "—"}</td>
                      <td>{fmtMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {selected && (
        <div className="attendance-modal" role="dialog" aria-modal="true" aria-label="Nhập Hoa hồng / Commission">
          <button type="button" className="attendance-modal-backdrop" aria-label="Đóng" onClick={() => setSelected(null)} />
          <div className="attendance-modal-panel" style={{ maxWidth: 400 }}>
            <button type="button" className="attendance-modal-close" onClick={() => setSelected(null)} aria-label="X">×</button>
            <h3 className="attendance-modal-title">{"Nh\u1eadp Hoa h\u1ed3ng / Commission — "}{selected.name}</h3>
            <p className="muted attendance-modal-sub">{"Tháng: "}{month}</p>

            <div className="attendance-modal-section">
              <div className="form-grid">
                <label className="field">
                  <span className="muted">Số tiền (VND)</span>
                  <input type="number" min={0} value={commission} onChange={(e) => setCommission(Number(e.target.value))} placeholder="0" />
                </label>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="primary" onClick={async () => { await api.saveSalaryBonusSet({ staffId: selected.id, month, commission, booking8: 0, kpibonus: selected.kpiBonus || 0 }); setSelected(null); await load(); }}>
                  {"L\u01b0u s\u1ed1 li\u1ec7u"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
