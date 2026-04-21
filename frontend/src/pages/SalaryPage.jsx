/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney } from "../utils/format";

export function SalaryPage({ selectedBranchId }) {
  const [tab, setTab] = useState("calculate");
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [commission, setCommission] = useState(0);
  const [isApplyingHold, setIsApplyingHold] = useState(false);
  const [penaltyHistory, setPenaltyHistory] = useState(null);
  const [reportStaffId, setReportStaffId] = useState("");

  const load = useCallback(async () => {
    const salaryRows = await api.getSalaryReport(month, selectedBranchId);
    setRows(salaryRows);
    if (salaryRows.length > 0 && !reportStaffId) {
      setReportStaffId(salaryRows[0].id);
    }
  }, [month, selectedBranchId, reportStaffId]);

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

  function renderVerticalReport() {
    const r = rows.find(item => Number(item.id) === Number(reportStaffId));
    if (!r) return <p className="muted">Vui lòng chọn nhân viên.</p>;

    return (
      <div className="salary-report-vertical-wrap" style={{ maxWidth: 500, margin: "0 auto" }}>
        <div className="card salary-report-vertical-card" style={{ padding: "30px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 25 }}>
            <h2 style={{ margin: "0 0 5px" }}>BÁO CÁO LƯƠNG</h2>
            <p className="muted" style={{ fontSize: 16 }}>Tháng {month} — {r.name}</p>
          </div>

          <div className="salary-vertical-list">
            <div className="salary-vertical-item">
              <span className="label">Họ và tên:</span>
              <span className="value"><strong>{r.name}</strong></span>
            </div>
            <div className="salary-vertical-item">
              <span className="label">Ngày công:</span>
              <span className="value">{r.workDays} ngày</span>
            </div>
            <div className="salary-vertical-divider"></div>
            
            <div className="salary-vertical-item">
              <span className="label">Lương cứng:</span>
              <span className="value">{fmtMoney(r.base)}</span>
            </div>
            <div className="salary-vertical-item">
              <span className="label">Hoa hồng / Commission:</span>
              <span className="value">{fmtMoney(r.commission)}</span>
            </div>
            <div className="salary-vertical-item">
              <span className="label">Thưởng KPI:</span>
              <span className="value">{fmtMoney(r.kpiBonus)}</span>
            </div>
            
            <div className="salary-vertical-item penalty">
              <span className="label">Phạt KPI:</span>
              <span className="value">{r.failPenalty > 0 ? `-${fmtMoney(r.failPenalty)}` : "-"}</span>
            </div>
            <div className="salary-vertical-item penalty">
              <span className="label">Phạt phát sinh:</span>
              <span className="value">{r.penalties > 0 ? `-${fmtMoney(r.penalties)}` : "-"}</span>
            </div>
            <div className="salary-vertical-item penalty">
              <span className="label">Trừ giam lương (15%):</span>
              <span className="value">{r.holdDeduction > 0 ? `-${fmtMoney(r.holdDeduction)}` : "-"}</span>
            </div>

            <div className="salary-vertical-divider"></div>
            <div className="salary-vertical-item total">
              <span className="label">TỔNG LƯƠNG THỰC NHẬN:</span>
              <span className="value"><strong>{fmtMoney(r.total)}</strong></span>
            </div>
            
            <div style={{ marginTop: 15, fontSize: 13 }} className="muted">
              <p style={{ margin: "5px 0" }}>* Giam lương còn lại: {r.holdRemainingAfter > 0 ? fmtMoney(r.holdRemainingAfter) : "Đã giam đủ"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card attendance-tabs-card" style={{ marginBottom: 16 }}>
        <div className="attendance-page-tabs">
          <button
            type="button"
            className={tab === "calculate" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setTab("calculate")}
          >
            Tính lương
          </button>
          <button
            type="button"
            className={tab === "report" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setTab("report")}
          >
            Chụp báo cáo lương
          </button>
        </div>
      </div>

      {tab === "calculate" ? (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="row">
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <button className="secondary" onClick={() => load()}>🔄 Làm mới</button>
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
                {isApplyingHold ? "Đang chốt..." : "Chốt trừ giam lương tháng"}
              </button>
              <strong>{"Tổng quỹ lương: "}{fmtMoney(total)}</strong>
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
        </>
      ) : (
        <div className="salary-report-tab-content">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="row" style={{ alignItems: "center", gap: 15 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="muted" style={{ marginRight: 8 }}>Tháng:</label>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="muted" style={{ marginRight: 8 }}>Chọn nhân viên:</label>
                <select value={reportStaffId} onChange={(e) => setReportStaffId(e.target.value)}>
                  {rows.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.type === 'main' ? 'Thợ chính' : 'Thợ phụ'})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {renderVerticalReport()}
        </div>
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
