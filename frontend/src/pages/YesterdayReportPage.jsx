import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { addIsoDays, vietnamTodayIsoDate } from "../utils/vietnamTime";

function isEmployedOnDate(staff, isoDate) {
  if (staff.startDate && staff.startDate > isoDate) return false;
  if (staff.endDate && staff.endDate < isoDate) return false;
  return true;
}

function rowStateFromApi(item) {
  const r = item.report;
  return {
    staffId: item.staffId,
    name: item.name,
    type: item.type,
    workStatus: r?.workStatus ?? "reported",
    workPenalty: r?.workPenalty != null && r.workPenalty !== "" ? String(r.workPenalty) : "",
    videoStatus: r?.videoStatus ?? "posted",
    videoPenalty: r?.videoPenalty != null && r.videoPenalty !== "" ? String(r.videoPenalty) : ""
  };
}

/**
 * Báo cáo công việc / video theo ngày — dùng trong tab Chấm công (embedded).
 */
export function YesterdayReportPanel({ data, selectedBranchId, reportDate, onReportDateChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (selectedBranchId == null || selectedBranchId === "") {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const list = await api.getDailyReports(reportDate, selectedBranchId);
      setRows(list.map(rowStateFromApi));
    } catch (e) {
      alert(e.message || "Không tải được báo cáo");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [reportDate, selectedBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateRow(staffId, patch) {
    setRows((prev) => prev.map((r) => (r.staffId === staffId ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      await api.saveDailyReports({
        reportDate,
        branchId: selectedBranchId,
        items: rows.map((r) => ({
          staffId: r.staffId,
          workStatus: r.workStatus,
          workPenalty: r.workStatus === "not_reported" ? r.workPenalty : "",
          videoStatus: r.videoStatus,
          videoPenalty: r.videoStatus === "not_posted" ? r.videoPenalty : ""
        }))
      });
      await load();
    } catch (e) {
      alert(e.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  const staffForDate = data.staff.filter(
    (s) =>
      s.status === "working" &&
      Number(s.branchId) === Number(selectedBranchId) &&
      isEmployedOnDate(s, reportDate)
  );

  return (
    <div className="card">
      <div className="page-header" style={{ marginTop: 0, marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{"B\u00e1o c\u00e1o h\u00f4m qua"}</h3>
        <span className="muted small">
          {
            "C\u00f4ng vi\u1ec7c: \u0111\u00e3 / kh\u00f4ng b\u00e1o c\u00e1o. Video: \u0111\u00e3 \u0111\u0103ng / kh\u00f4ng \u0111\u0103ng. Ph\u1ea1t (t\u00f9y ch\u1ecdn) v\u00e0o ph\u1ea1t ph\u00e1t sinh th\u00e1ng t\u01b0\u01a1ng \u1ee9ng."
          }
        </span>
      </div>
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {"Ng\u00e0y b\u00e1o c\u00e1o"}
          <input type="date" value={reportDate} onChange={(e) => onReportDateChange(e.target.value)} />
        </label>
        <button type="button" className="secondary" onClick={() => onReportDateChange(addIsoDays(vietnamTodayIsoDate(), -1))}>
          {"H\u00f4m qua"}
        </button>
        <button type="button" className="secondary" onClick={load} disabled={loading}>
          {loading ? "\u0110ang t\u1ea3i..." : "L\u00e0m m\u1edbi"}
        </button>
        <button type="button" className="primary" onClick={handleSave} disabled={saving || loading || rows.length === 0}>
          {saving ? "\u0110ang l\u01b0u..." : "L\u01b0u"}
        </button>
      </div>
      {staffForDate.length === 0 ? (
        <p className="muted">Không có nhân viên làm việc trong ngày đã chọn (hoặc chưa chọn chi nhánh).</p>
      ) : (
        <div className="table-scroll">
          <table className="yesterday-report-table">
            <thead>
              <tr>
                <th>{"Nh\u00e2n vi\u00ean"}</th>
                <th>{"B\u00e1o c\u00e1o c\u00f4ng vi\u1ec7c"}</th>
                <th>{"Ph\u1ea1t CV (VND)"}</th>
                <th>{"B\u00e1o c\u00e1o video"}</th>
                <th>{"Ph\u1ea1t video (VND)"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.staffId}>
                  <td>{r.name}</td>
                  <td>
                    <select
                      className="yesterday-report-select"
                      value={r.workStatus}
                      onChange={(e) =>
                        updateRow(r.staffId, {
                          workStatus: e.target.value,
                          workPenalty: e.target.value === "not_reported" ? r.workPenalty : ""
                        })
                      }
                    >
                      <option value="reported">{"\u0110\u00e3 b\u00e1o c\u00e1o"}</option>
                      <option value="not_reported">{"Kh\u00f4ng b\u00e1o c\u00e1o"}</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="yesterday-report-penalty"
                      placeholder={"Không phạt"}
                      disabled={r.workStatus !== "not_reported"}
                      value={r.workStatus === "not_reported" ? r.workPenalty : ""}
                      onChange={(e) => updateRow(r.staffId, { workPenalty: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="yesterday-report-select"
                      value={r.videoStatus}
                      onChange={(e) =>
                        updateRow(r.staffId, {
                          videoStatus: e.target.value,
                          videoPenalty: e.target.value === "not_posted" ? r.videoPenalty : ""
                        })
                      }
                    >
                      <option value="posted">{"\u0110\u00e3 \u0111\u0103ng"}</option>
                      <option value="not_posted">{"Kh\u00f4ng \u0111\u0103ng"}</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="yesterday-report-penalty"
                      placeholder={"Không phạt"}
                      disabled={r.videoStatus !== "not_posted"}
                      value={r.videoStatus === "not_posted" ? r.videoPenalty : ""}
                      onChange={(e) => updateRow(r.staffId, { videoPenalty: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
