/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api/client";
import { vietnamTodayIsoDate } from "../utils/vietnamTime";

function cloneMain(cfg) {
  return JSON.parse(JSON.stringify(cfg.main));
}

function cloneAssistant(cfg) {
  return JSON.parse(JSON.stringify(cfg.assistant));
}

export function KpiConfigPage({ data, selectedBranchId }) {
  const [cfg, setCfg] = useState(null);

  const [mainStaffId, setMainStaffId] = useState("");
  const [mainStart, setMainStart] = useState("");
  const [mainEnd, setMainEnd] = useState("");
  const [mainForm, setMainForm] = useState(null);

  const [assistStaffId, setAssistStaffId] = useState("");
  const [assistStart, setAssistStart] = useState("");
  const [assistEnd, setAssistEnd] = useState("");
  const [assistForm, setAssistForm] = useState(null);

  const mainStaffList = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter((s) => Number(s.branchId) === bid && s.status === "working" && s.type === "main")
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId]);

  const assistStaffList = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter((s) => Number(s.branchId) === bid && s.status === "working" && s.type === "assistant")
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId]);

  useEffect(() => {
    api.getKpiConfig().then(setCfg);
  }, []);

  useEffect(() => {
    setMainStaffId("");
    setAssistStaffId("");
  }, [selectedBranchId]);

  useEffect(() => {
    if (!cfg || !selectedBranchId) {
      setMainForm(null);
      setMainStart("");
      setMainEnd("");
      return;
    }
    if (!mainStaffId) {
      setMainForm(cloneMain(cfg));
      setMainStart(vietnamTodayIsoDate());
      setMainEnd("");
      return;
    }
    let cancelled = false;
    setMainForm(null);
    setMainStart("");
    setMainEnd("");
    api.getStaffKpiSetting(mainStaffId).then((setting) => {
      if (cancelled) return;
      setMainStart(setting?.startDate || vietnamTodayIsoDate());
      setMainEnd(setting?.endDate || "");
      setMainForm(setting?.config || cloneMain(cfg));
    });
    return () => {
      cancelled = true;
    };
  }, [mainStaffId, cfg, selectedBranchId]);

  useEffect(() => {
    if (!cfg || !selectedBranchId) {
      setAssistForm(null);
      setAssistStart("");
      setAssistEnd("");
      return;
    }
    if (!assistStaffId) {
      setAssistForm(cloneAssistant(cfg));
      setAssistStart(vietnamTodayIsoDate());
      setAssistEnd("");
      return;
    }
    let cancelled = false;
    setAssistForm(null);
    setAssistStart("");
    setAssistEnd("");
    api.getStaffKpiSetting(assistStaffId).then((setting) => {
      if (cancelled) return;
      setAssistStart(setting?.startDate || vietnamTodayIsoDate());
      setAssistEnd(setting?.endDate || "");
      setAssistForm(setting?.config || cloneAssistant(cfg));
    });
    return () => {
      cancelled = true;
    };
  }, [assistStaffId, cfg, selectedBranchId]);

  const updateMainForm = useCallback((key, value) => {
    setMainForm((prev) => (prev ? { ...prev, [key]: value === null ? null : Number(value) } : prev));
  }, []);

  const updateAssistForm = useCallback((key, value) => {
    setAssistForm((prev) => (prev ? { ...prev, [key]: value === null ? null : Number(value) } : prev));
  }, []);

  async function handleSaveMainStaff() {
    if (!mainStaffId || !mainForm || !mainStart) return;
    await api.saveStaffKpiSetting({
      staffId: Number(mainStaffId),
      startDate: mainStart,
      endDate: mainEnd || null,
      config: mainForm
    });
    alert("Đã lưu KPI cho thợ chính đã chọn.");
  }

  async function handleSaveAssistStaff() {
    if (!assistStaffId || !assistForm || !assistStart) return;
    await api.saveStaffKpiSetting({
      staffId: Number(assistStaffId),
      startDate: assistStart,
      endDate: assistEnd || null,
      config: assistForm
    });
    alert("Đã lưu KPI cho thợ phụ đã chọn.");
  }

  const canSaveMain = Boolean(selectedBranchId && mainStaffId && mainForm && mainStart);
  const canSaveAssist = Boolean(selectedBranchId && assistStaffId && assistForm && assistStart);

  return (
    <div className="kpi-config-two-cols">
      <div className="card kpi-config-staff-card">
        <div className="page-header" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>KPI thợ chính</h3>
        </div>
        {!selectedBranchId && <p className="muted">Chọn chi nhánh.</p>}
        {selectedBranchId && !cfg && <p className="muted">Đang tải…</p>}
        {selectedBranchId && cfg && (
          <>
            <div className="row" style={{ marginBottom: 12, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <label className="muted">Chọn nhân viên</label>
              <select
                value={mainStaffId}
                onChange={(e) => setMainStaffId(e.target.value)}
                className="kpi-config-staff-select"
              >
                <option value="">— Chọn nhân viên —</option>
                {mainStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {mainStaffList.length === 0 && (
              <p className="muted">Không có thợ chính đang làm ở chi nhánh này.</p>
            )}
            {mainForm && (
              <>
                <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <label className="muted">Ngày bắt đầu</label>
                  <input type="date" value={mainStart} onChange={(e) => setMainStart(e.target.value)} />
                  <label className="muted">Ngày kết thúc (tuỳ chọn)</label>
                  <input type="date" value={mainEnd} onChange={(e) => setMainEnd(e.target.value)} />
                </div>
                <div className="kpi-config-table-wrap">
                  <table className="data-table kpi-config-matrix">
                    <thead>
                      <tr>
                        <th>Chỉ tiêu</th>
                        <th>KPI tuần</th>
                        <th>KPI tháng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Lịch đặt hóa chất</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={mainForm.weeklyBookings !== null && mainForm.weeklyBookings !== undefined}
                              onChange={(e) => updateMainForm("weeklyBookings", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {mainForm.weeklyBookings !== null && mainForm.weeklyBookings !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={mainForm.weeklyBookings}
                                onChange={(e) => updateMainForm("weeklyBookings", e.target.value)}
                              />
                            )}
                            {(mainForm.weeklyBookings === null || mainForm.weeklyBookings === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                        <td className="muted kpi-config-na">—</td>
                      </tr>
                      <tr>
                        <td>Check-in (%)</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={mainForm.weeklyCheckinRate !== null && mainForm.weeklyCheckinRate !== undefined}
                              onChange={(e) => updateMainForm("weeklyCheckinRate", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {mainForm.weeklyCheckinRate !== null && mainForm.weeklyCheckinRate !== undefined && (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="kpi-config-input"
                                value={mainForm.weeklyCheckinRate}
                                onChange={(e) => updateMainForm("weeklyCheckinRate", e.target.value)}
                              />
                            )}
                            {(mainForm.weeklyCheckinRate === null || mainForm.weeklyCheckinRate === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                        <td className="muted kpi-config-na">—</td>
                      </tr>
                      <tr>
                        <td>Doanh thu tháng (đồng)</td>
                        <td className="muted kpi-config-na">—</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={mainForm.monthlyRevenue !== null && mainForm.monthlyRevenue !== undefined}
                              onChange={(e) => updateMainForm("monthlyRevenue", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {mainForm.monthlyRevenue !== null && mainForm.monthlyRevenue !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={mainForm.monthlyRevenue}
                                onChange={(e) => updateMainForm("monthlyRevenue", e.target.value)}
                              />
                            )}
                            {(mainForm.monthlyRevenue === null || mainForm.monthlyRevenue === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Sản phẩm (tháng)</td>
                        <td className="muted kpi-config-na">—</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={mainForm.monthlyProducts !== null && mainForm.monthlyProducts !== undefined}
                              onChange={(e) => updateMainForm("monthlyProducts", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {mainForm.monthlyProducts !== null && mainForm.monthlyProducts !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={mainForm.monthlyProducts}
                                onChange={(e) => updateMainForm("monthlyProducts", e.target.value)}
                              />
                            )}
                            {(mainForm.monthlyProducts === null || mainForm.monthlyProducts === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="primary"
                  style={{ marginTop: 12 }}
                  disabled={!canSaveMain}
                  onClick={handleSaveMainStaff}
                >
                  Lưu KPI cho nhân viên đã chọn
                </button>
              </>
            )}
            {selectedBranchId && cfg && !mainForm && mainStaffId && (
              <p className="muted">Đang tải KPI nhân viên…</p>
            )}
          </>
        )}
      </div>

      <div className="card kpi-config-staff-card">
        <div className="page-header" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>KPI thợ phụ</h3>
        </div>
        {!selectedBranchId && <p className="muted">Chọn chi nhánh.</p>}
        {selectedBranchId && !cfg && <p className="muted">Đang tải…</p>}
        {selectedBranchId && cfg && (
          <>
            <div className="row" style={{ marginBottom: 12, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <label className="muted">Chọn nhân viên</label>
              <select
                value={assistStaffId}
                onChange={(e) => setAssistStaffId(e.target.value)}
                className="kpi-config-staff-select"
              >
                <option value="">— Chọn nhân viên —</option>
                {assistStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {assistStaffList.length === 0 && (
              <p className="muted">Không có thợ phụ đang làm ở chi nhánh này.</p>
            )}
            {assistForm && (
              <>
                <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <label className="muted">Ngày bắt đầu</label>
                  <input type="date" value={assistStart} onChange={(e) => setAssistStart(e.target.value)} />
                  <label className="muted">Ngày kết thúc (tuỳ chọn)</label>
                  <input type="date" value={assistEnd} onChange={(e) => setAssistEnd(e.target.value)} />
                </div>
                <div className="kpi-config-table-wrap">
                  <table className="data-table kpi-config-matrix">
                    <thead>
                      <tr>
                        <th>Chỉ tiêu</th>
                        <th>KPI tuần</th>
                        <th>KPI tháng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Lịch đặt hóa chất</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={assistForm.weeklyBookings !== null && assistForm.weeklyBookings !== undefined}
                              onChange={(e) => updateAssistForm("weeklyBookings", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {assistForm.weeklyBookings !== null && assistForm.weeklyBookings !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={assistForm.weeklyBookings}
                                onChange={(e) => updateAssistForm("weeklyBookings", e.target.value)}
                              />
                            )}
                            {(assistForm.weeklyBookings === null || assistForm.weeklyBookings === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                        <td className="muted kpi-config-na">—</td>
                      </tr>
                      <tr>
                        <td>Check-in (%)</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={assistForm.weeklyCheckinRate !== null && assistForm.weeklyCheckinRate !== undefined}
                              onChange={(e) => updateAssistForm("weeklyCheckinRate", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {assistForm.weeklyCheckinRate !== null && assistForm.weeklyCheckinRate !== undefined && (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className="kpi-config-input"
                                value={assistForm.weeklyCheckinRate}
                                onChange={(e) => updateAssistForm("weeklyCheckinRate", e.target.value)}
                              />
                            )}
                            {(assistForm.weeklyCheckinRate === null || assistForm.weeklyCheckinRate === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                        <td className="muted kpi-config-na">—</td>
                      </tr>
                      <tr>
                        <td>Lịch đặt gội</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={assistForm.weeklyWash !== null && assistForm.weeklyWash !== undefined}
                              onChange={(e) => updateAssistForm("weeklyWash", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {assistForm.weeklyWash !== null && assistForm.weeklyWash !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={assistForm.weeklyWash}
                                onChange={(e) => updateAssistForm("weeklyWash", e.target.value)}
                              />
                            )}
                            {(assistForm.weeklyWash === null || assistForm.weeklyWash === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                        <td className="muted kpi-config-na">—</td>
                      </tr>
                      <tr>
                        <td>Doanh thu tháng (đồng)</td>
                        <td className="muted kpi-config-na">—</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={assistForm.monthlyRevenue !== null && assistForm.monthlyRevenue !== undefined}
                              onChange={(e) => updateAssistForm("monthlyRevenue", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {assistForm.monthlyRevenue !== null && assistForm.monthlyRevenue !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={assistForm.monthlyRevenue}
                                onChange={(e) => updateAssistForm("monthlyRevenue", e.target.value)}
                              />
                            )}
                            {(assistForm.monthlyRevenue === null || assistForm.monthlyRevenue === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Sản phẩm (tháng)</td>
                        <td className="muted kpi-config-na">—</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="checkbox"
                              checked={assistForm.monthlyProducts !== null && assistForm.monthlyProducts !== undefined}
                              onChange={(e) => updateAssistForm("monthlyProducts", e.target.checked ? 0 : null)}
                              title="Chạy chỉ tiêu này"
                            />
                            {assistForm.monthlyProducts !== null && assistForm.monthlyProducts !== undefined && (
                              <input
                                type="number"
                                min={0}
                                className="kpi-config-input"
                                value={assistForm.monthlyProducts}
                                onChange={(e) => updateAssistForm("monthlyProducts", e.target.value)}
                              />
                            )}
                            {(assistForm.monthlyProducts === null || assistForm.monthlyProducts === undefined) && <span className="muted">Chưa chạy</span>}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="primary"
                  style={{ marginTop: 12 }}
                  disabled={!canSaveAssist}
                  onClick={handleSaveAssistStaff}
                >
                  Lưu KPI cho nhân viên đã chọn
                </button>
              </>
            )}
            {selectedBranchId && cfg && !assistForm && assistStaffId && (
              <p className="muted">Đang tải KPI nhân viên…</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
