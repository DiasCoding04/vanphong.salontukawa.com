import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { addIsoDays, vietnamTodayIsoDate } from "../utils/vietnamTime";
import { formatCheckinRatePct, formatViDateShort, fmtMoney } from "../utils/format";
import { YesterdayReportPanel } from "./YesterdayReportPage";

function formatVnd(n) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("vi-VN")} đ`;
}

function formatAttendanceStatus(row) {
  if (!row) return <span className="badge">Chưa chấm</span>;
  if (row.present !== 1) return <span className="badge badge-red">Vắng</span>;
  if (row.late_minutes != null && row.late_minutes !== "")
    return <span className="badge badge-yellow">Đi muộn ({row.late_minutes} ph)</span>;
  return <span className="badge badge-green">Có mặt</span>;
}

/** absent | late | present — dùng cho tab Chấm công; lưu KPI chỉ gửi present/late (không gửi absent). */
function presenceFromRow(row) {
  if (!row || row.present !== 1) return "absent";
  if (row.late_minutes != null && row.late_minutes !== "") return "late";
  return "present";
}

function parseStoredBookings(jsonStr) {
  if (!jsonStr || jsonStr === "[]") return [];
  try {
    const p = JSON.parse(jsonStr);
    if (!Array.isArray(p)) return [];
    return p.map((b) => ({ revenue: Number(b.revenue) }));
  } catch {
    return [];
  }
}

/** Từ dòng attendance hiện có → payload chemicalBookings / washBookings cho API (giữ KPI khi chỉ sửa trạng thái). */
function chemicalWashPayloadFromRow(row, staffType) {
  const chem = parseStoredBookings(row?.chemical_bookings_json).map((b) => ({
    revenue: Math.round(Number(b.revenue))
  }));
  const washRaw =
    staffType === "assistant" || staffType === "main" ? parseStoredBookings(row?.wash_bookings_json) : [];
  const wash = washRaw.map((b) => ({ revenue: Math.round(Number(b.revenue)) }));
  return { chemicalBookings: chem, washBookings: wash };
}

/** Cùng logic khoảng làm việc với backend (ngày nằm trong [startDate, endDate]). */
function isEmployedOnDate(staff, isoDate) {
  if (staff.startDate && staff.startDate > isoDate) return false;
  if (staff.endDate && staff.endDate < isoDate) return false;
  return true;
}

function CrossBranchPanel({ 
  data, serviceBranchId, crossBookings, onRefresh,
  dateCross, setDateCross,
  monthCross, setMonthCross,
  crossViewType, setCrossViewType,
  chemicalMinVnd = 450000
}) {
  const [staffBranchId, setStaffBranchId] = useState("");
  const [crossModal, setCrossModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const staffOptions = useMemo(() => {
    if (!staffBranchId) return [];
    return data.staff
      .filter((s) => s.status === "working" && Number(s.branchId) === Number(staffBranchId))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, staffBranchId]);

  async function handleDelete(id) {
    if (!confirm("Xóa lịch này?")) return;
    try {
      await api.deleteCrossBranchBooking(id);
      onRefresh();
    } catch (e) {
      alert(e.message || "Lỗi");
    }
  }

  function openModal(staff) {
    setCrossModal({
      staffId: staff.id,
      staffName: staff.name,
      staffType: staff.type,
      chemicalLines: [],
      washLines: [],
      productLines: []
    });
  }

  function closeModal() {
    setCrossModal(null);
  }

  function openEditModal(b) {
    const sid = Number(b.staff_id ?? b.staffId);
    const svc = Number(b.service_branch_id ?? b.serviceBranchId ?? serviceBranchId);
    setEditBooking({
      id: b.id,
      serviceBranchId: Number.isFinite(svc) ? svc : Number(serviceBranchId),
      staffId: sid,
      date: b.date,
      type: b.type === "wash" || b.type === "chemical" || b.type === "product" ? b.type : "chemical",
      revenue: String(b.revenue ?? ""),
      note: b.note != null && b.note !== "" ? String(b.note) : "",
      staffName: b.staff_name ?? ""
    });
  }

  function closeEditModal() {
    setEditBooking(null);
  }

  async function handleSaveEdit() {
    if (!editBooking) return;
    const rev = Math.round(Number(String(editBooking.revenue).replace(/\s/g, "")));
    if (!Number.isFinite(rev) || rev <= 0) {
      alert("Doanh thu phải lớn hơn 0.");
      return;
    }
    if (editBooking.type === "chemical" && rev < chemicalMinVnd) {
      alert(`Hóa chất phải từ ${chemicalMinVnd.toLocaleString("vi-VN")} VND trở lên.`);
      return;
    }
    try {
      setEditLoading(true);
      await api.updateCrossBranchBooking(editBooking.id, {
        serviceBranchId: editBooking.serviceBranchId,
        staffId: editBooking.staffId,
        date: editBooking.date,
        type: editBooking.type,
        revenue: rev,
        note: editBooking.note.trim() || null
      });
      closeEditModal();
      onRefresh();
    } catch (e) {
      alert(e.message || "Lỗi khi lưu");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSaveModal() {
    if (!crossModal) return;

    const chemicalPayload = crossModal.chemicalLines.map(l => ({
      revenue: Math.round(Number(String(l.revenue).replace(/\s/g, ""))),
      note: l.note
    })).filter(l => l.revenue > 0);

    const washPayload = crossModal.washLines.map(l => ({
      revenue: Math.round(Number(String(l.revenue).replace(/\s/g, ""))),
      note: l.note
    })).filter(l => l.revenue > 0);

    const productPayload = crossModal.productLines.map(l => ({
      revenue: Math.round(Number(String(l.revenue).replace(/\s/g, ""))),
      note: l.note
    })).filter(l => l.revenue > 0);

    if (chemicalPayload.length === 0 && washPayload.length === 0 && productPayload.length === 0) {
      alert("Vui lòng thêm ít nhất 1 lịch có doanh thu.");
      return;
    }

    try {
      setLoading(true);
      await api.addCrossBranchBooking({
        serviceBranchId,
        staffId: crossModal.staffId,
        date: dateCross,
        chemicalBookings: chemicalPayload,
        washBookings: washPayload,
        productBookings: productPayload
      });
      closeModal();
      onRefresh();
    } catch (e) {
      alert(e.message || "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="page-header" style={{ marginTop: 0, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Thêm lịch hẹn chéo chi nhánh</h3>
        </div>
        <div className="row" style={{ marginBottom: 16, alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div className="field">
            <label className="muted">Chọn chi nhánh của thợ</label>
            <select value={staffBranchId} onChange={(e) => setStaffBranchId(e.target.value)}>
              <option value="">— Chọn chi nhánh —</option>
              {data.branches
                .filter((b) => Number(b.id) !== Number(serviceBranchId))
                .map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {staffBranchId && staffOptions.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Loại thợ</th>
                <th style={{ width: 140 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {staffOptions.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.type === 'main' ? 'Thợ chính' : 'Thợ phụ'}</td>
                  <td>
                    <button className="secondary" onClick={() => openModal(s)}>Thêm lịch chéo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {staffBranchId && staffOptions.length === 0 && (
          <p className="muted">Không có nhân viên nào.</p>
        )}
      </div>

      <div className="card">
        <div className="page-header" style={{ marginTop: 0, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Danh sách khách đặt lịch chéo</h3>
          <div className="row" style={{ gap: 10, margin: 0 }}>
            <select value={crossViewType} onChange={(e) => setCrossViewType(e.target.value)} style={{ padding: '6px 12px' }}>
              <option value="date">Theo ngày</option>
              <option value="month">Theo tháng</option>
            </select>
            {crossViewType === "date" ? (
              <input type="date" value={dateCross} onChange={(e) => setDateCross(e.target.value)} style={{ padding: '6px 12px' }} />
            ) : (
              <input type="month" value={monthCross} onChange={(e) => setMonthCross(e.target.value)} style={{ padding: '6px 12px' }} />
            )}
          </div>
        </div>

        {crossBookings.length === 0 ? (
          <p className="muted">Chưa có lịch đặt chéo nào.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thợ</th>
                <th>Chi nhánh thợ</th>
                <th>Loại lịch</th>
                <th>Doanh thu</th>
                <th style={{ width: 160 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {crossBookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.date}</td>
                  <td>{b.staff_name} <span className={`badge ${b.staff_type === "main" ? "badge-blue" : "badge-yellow"}`}>{b.staff_type === "main" ? "Chính" : "Phụ"}</span></td>
                  <td>{b.staff_branch_name}</td>
                  <td>{b.type === "chemical" ? "Hóa chất" : (b.type === "wash" ? "Gội" : "Sản phẩm")}</td>
                  <td>{b.revenue.toLocaleString("vi-VN")} đ</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <button type="button" className="icon-btn" title="Sửa" onClick={() => openEditModal(b)}>
                        ✏️
                      </button>
                      <button type="button" className="icon-btn danger" title="Xóa" onClick={() => handleDelete(b.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {crossModal && (
        <div className="attendance-modal" role="dialog" aria-modal="true">
          <button type="button" className="attendance-modal-backdrop" onClick={closeModal} />
          <div className="attendance-modal-panel" style={{ maxWidth: 800 }}>
            <button type="button" className="attendance-modal-close" onClick={closeModal}>×</button>
            <h3 className="attendance-modal-title">Thêm lịch chéo — {crossModal.staffName}</h3>
            <p className="muted attendance-modal-sub">Ngày: {formatViDateShort(dateCross)}</p>

            <div className="attendance-modal-bookings" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {/* Cột hóa chất */}
              <div className="attendance-modal-section">
                <div className="attendance-modal-section-head">
                  <h4>Lịch đặt hóa chất</h4>
                </div>
                <ul className="attendance-modal-lines">
                  {crossModal.chemicalLines.map((line, idx) => (
                    <li key={line.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span className="attendance-line-idx">{idx + 1}</span>
                      <input
                        type="number"
                        placeholder="Doanh thu (VND)"
                        value={line.revenue}
                        style={{ flex: 1, minWidth: 120 }}
                        onChange={(e) => setCrossModal({
                          ...crossModal,
                          chemicalLines: crossModal.chemicalLines.map(l => l.id === line.id ? { ...l, revenue: e.target.value } : l)
                        })}
                      />
                      <button className="icon-btn danger" title="Xóa" onClick={() => setCrossModal({
                        ...crossModal,
                        chemicalLines: crossModal.chemicalLines.filter(l => l.id !== line.id)
                      })}>🗑️</button>
                    </li>
                  ))}
                </ul>
                <button className="secondary" onClick={() => setCrossModal({
                  ...crossModal,
                  chemicalLines: [...crossModal.chemicalLines, { id: Date.now(), revenue: "", note: "" }]
                })}>+ Thêm lịch hóa chất</button>
              </div>

              {/* Cột gội */}
              <div className="attendance-modal-section">
                <div className="attendance-modal-section-head">
                  <h4>Lịch đặt gội</h4>
                </div>
                <ul className="attendance-modal-lines">
                  {crossModal.washLines.map((line, idx) => (
                    <li key={line.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span className="attendance-line-idx">{idx + 1}</span>
                      <input
                        type="number"
                        placeholder="Doanh thu (VND)"
                        value={line.revenue}
                        style={{ flex: 1, minWidth: 120 }}
                        onChange={(e) => setCrossModal({
                          ...crossModal,
                          washLines: crossModal.washLines.map(l => l.id === line.id ? { ...l, revenue: e.target.value } : l)
                        })}
                      />
                      <button className="icon-btn danger" title="Xóa" onClick={() => setCrossModal({
                        ...crossModal,
                        washLines: crossModal.washLines.filter(l => l.id !== line.id)
                      })}>🗑️</button>
                    </li>
                  ))}
                </ul>
                <button className="secondary" onClick={() => setCrossModal({
                  ...crossModal,
                  washLines: [...crossModal.washLines, { id: Date.now(), revenue: "", note: "" }]
                })}>+ Thêm lịch gội</button>
              </div>

              {/* Cột sản phẩm */}
               <div className="attendance-modal-section">
                 <div className="attendance-modal-section-head">
                   <h4>Sản phẩm</h4>
                 </div>
                 <ul className="attendance-modal-lines">
                   {crossModal.productLines.map((line, idx) => (
                     <li key={line.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                       <span className="attendance-line-idx">{idx + 1}</span>
                       <input
                         type="number"
                         placeholder="Doanh thu (VND)"
                         value={line.revenue}
                         style={{ flex: 1, minWidth: 120 }}
                         onChange={(e) => setCrossModal({
                           ...crossModal,
                           productLines: crossModal.productLines.map(l => l.id === line.id ? { ...l, revenue: e.target.value } : l)
                         })}
                       />
                       <button className="icon-btn danger" title="Xóa" onClick={() => setCrossModal({
                         ...crossModal,
                         productLines: crossModal.productLines.filter(l => l.id !== line.id)
                       })}>🗑️</button>
                     </li>
                   ))}
                 </ul>
                 <button className="secondary" onClick={() => setCrossModal({
                   ...crossModal,
                   productLines: [...crossModal.productLines, { id: Date.now(), revenue: "", note: "" }]
                 })}>+ Thêm sản phẩm</button>
               </div>
            </div>

            <div className="attendance-modal-actions" style={{ marginTop: 24 }}>
              <button className="secondary" onClick={closeModal}>Hủy</button>
              <button className="primary" onClick={handleSaveModal} disabled={loading}>{loading ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}

      {editBooking && (
        <div className="attendance-modal" role="dialog" aria-modal="true" aria-label="Sửa lịch chéo">
          <button type="button" className="attendance-modal-backdrop" onClick={closeEditModal} />
          <div className="attendance-modal-panel" style={{ maxWidth: 440 }}>
            <button type="button" className="attendance-modal-close" onClick={closeEditModal} aria-label="Đóng">
              ×
            </button>
            <h3 className="attendance-modal-title">Sửa lịch chéo</h3>
            <p className="muted attendance-modal-sub" style={{ marginBottom: 16 }}>
              {editBooking.staffName} · {formatViDateShort(editBooking.date)}
            </p>
            <div className="form-grid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="field">
                <span className="muted">Loại lịch</span>
                <select
                  value={editBooking.type}
                  onChange={(e) => setEditBooking((prev) => (prev ? { ...prev, type: e.target.value } : prev))}
                >
                  <option value="chemical">Hóa chất</option>
                  <option value="wash">Gội</option>
                  <option value="product">Sản phẩm</option>
                </select>
              </label>
              <label className="field">
                <span className="muted">Doanh thu (VND)</span>
                <input
                  type="number"
                  min={1}
                  value={editBooking.revenue}
                  onChange={(e) => setEditBooking((prev) => (prev ? { ...prev, revenue: e.target.value } : prev))}
                />
              </label>
              <label className="field">
                <span className="muted">Ghi chú</span>
                <input
                  type="text"
                  value={editBooking.note}
                  onChange={(e) => setEditBooking((prev) => (prev ? { ...prev, note: e.target.value } : prev))}
                />
              </label>
            </div>
            <div className="attendance-modal-actions" style={{ marginTop: 20 }}>
              <button type="button" className="secondary" onClick={closeEditModal}>
                Hủy
              </button>
              <button type="button" className="primary" onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AttendancePage({ data, selectedBranchId }) {
  const [tab, setTab] = useState("kpi");
  const [dateKpi, setDateKpi] = useState(() => addIsoDays(vietnamTodayIsoDate(), -1));
  const [dateStatus, setDateStatus] = useState(() => vietnamTodayIsoDate());
  const [dateCross, setDateCross] = useState(() => addIsoDays(vietnamTodayIsoDate(), -1));
  const [monthCross, setMonthCross] = useState(() => vietnamTodayIsoDate().slice(0, 7));
  const [crossViewType, setCrossViewType] = useState("date");
  const [reportDate, setReportDate] = useState(() => addIsoDays(vietnamTodayIsoDate(), -1));
  const [rowsKpi, setRowsKpi] = useState([]);
  const [rowsStatus, setRowsStatus] = useState([]);
  const [crossBookings, setCrossBookings] = useState([]);
  const [modal, setModal] = useState(null);
  const [kpiConfig, setKpiConfig] = useState(null);
  const [editingAdj, setEditingAdj] = useState(null);

  async function refreshPenaltyHistory() {
    if (!modal) return;
    try {
      const history = await api.getSalaryAdjustments({ 
        staffId: modal.staffId, 
        month: modal.date.slice(0, 7),
        type: 'penalty'
      });
      setModal(prev => ({ ...prev, penaltyHistory: history }));
    } catch (e) {
      console.error("Lỗi làm mới lịch sử phạt:", e);
    }
  }

  async function handleUpdateAdjustment() {
    if (!editingAdj) return;
    try {
      const updated = await api.updateSalaryAdjustment(editingAdj.id, {
        amount: Number(editingAdj.amount),
        note: editingAdj.note
      });
      
      // Đồng bộ với state modal nếu đang mở và là phạt đi muộn
      if (modal && updated.attendance_id && updated.note && updated.note.startsWith('Đi muộn')) {
        setModal(prev => ({
          ...prev,
          latePenalty: Number(updated.amount)
        }));
      }

      setEditingAdj(null);
      await refreshPenaltyHistory();
      await refresh();
    } catch (e) {
      alert(e.message || "Lỗi khi cập nhật");
    }
  }

  async function handleDeleteAdjustment(id) {
    if (!confirm("Bạn có chắc muốn xóa khoản phạt này?")) return;
    try {
      const oldAdj = modal?.penaltyHistory?.find(h => h.id === id);
      await api.deleteSalaryAdjustment(id);
      
      // Đồng bộ với state modal nếu là phạt đi muộn
      if (modal && oldAdj && oldAdj.attendance_id && oldAdj.note && oldAdj.note.startsWith('Đi muộn')) {
        setModal(prev => ({
          ...prev,
          latePenalty: 0
        }));
      }

      await refreshPenaltyHistory();
      await refresh();
    } catch (e) {
      alert(e.message || "Lỗi khi xóa");
    }
  }

  const chemicalMinVnd = kpiConfig?.chemicalMinVnd || 450000;
  const washDoubleCountFromVnd = kpiConfig?.washDoubleCountFromVnd || 350000;

  function washLineCountFromRevenue(revenue) {
    if (!Number.isFinite(revenue) || revenue <= 0) return 0;
    return revenue >= washDoubleCountFromVnd ? 2 : 1;
  }

  function totalWashBookingCount(lines) {
    return lines.reduce((sum, line) => {
      const n = Math.round(Number(String(line.revenue).replace(/\s/g, "")));
      return sum + washLineCountFromRevenue(n);
    }, 0);
  }

  const staffRowsKpi = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter(
        (s) =>
          s.status === "working" &&
          Number(s.branchId) === bid &&
          isEmployedOnDate(s, dateKpi)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId, dateKpi]);

  const staffRowsStatus = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter(
        (s) =>
          s.status === "working" &&
          Number(s.branchId) === bid &&
          isEmployedOnDate(s, dateStatus)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId, dateStatus]);

  const staffRowsMainKpi = useMemo(() => staffRowsKpi.filter((s) => s.type === "main"), [staffRowsKpi]);
  const staffRowsAssistantKpi = useMemo(() => staffRowsKpi.filter((s) => s.type === "assistant"), [staffRowsKpi]);
  const staffRowsMainStatus = useMemo(() => staffRowsStatus.filter((s) => s.type === "main"), [staffRowsStatus]);
  const staffRowsAssistantStatus = useMemo(() => staffRowsStatus.filter((s) => s.type === "assistant"), [staffRowsStatus]);

  const byStaffKpi = useMemo(() => {
    const map = new Map();
    for (const row of rowsKpi) map.set(row.staff_id, row);
    return map;
  }, [rowsKpi]);

  const byStaffStatus = useMemo(() => {
    const map = new Map();
    for (const row of rowsStatus) map.set(row.staff_id, row);
    return map;
  }, [rowsStatus]);

  const statusStats = useMemo(() => {
    const allStaff = [...staffRowsMainStatus, ...staffRowsAssistantStatus];
    let present = 0, late = 0, absent = 0, unassigned = 0;
    for (const s of allStaff) {
      const row = byStaffStatus.get(s.id);
      if (!row) unassigned++;
      else if (row.present !== 1) absent++;
      else if (row.late_minutes != null && row.late_minutes !== "") late++;
      else present++;
    }
    return { total: allStaff.length, present, late, absent, unassigned };
  }, [staffRowsMainStatus, staffRowsAssistantStatus, byStaffStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await api.getKpiConfig();
        if (!cancelled) setKpiConfig(cfg);
      } catch (err) {
        console.error("Failed to load KPI config", err);
      }

      if (!selectedBranchId) {
        setRowsKpi([]);
        setRowsStatus([]);
        setCrossBookings([]);
        return;
      }
      try {
        const [kpi, st, cb] = await Promise.all([
          api.getAttendanceByDate(dateKpi, selectedBranchId),
          api.getAttendanceByDate(dateStatus, selectedBranchId),
          api.getCrossBranchBookings({
            serviceBranchId: selectedBranchId,
            date: crossViewType === "date" ? dateCross : undefined,
            month: crossViewType === "month" ? monthCross : undefined
          })
        ]);
        if (!cancelled) {
          setRowsKpi(kpi);
          setRowsStatus(st);
          setCrossBookings(cb);
        }
      } catch {
        if (!cancelled) {
          setRowsKpi([]);
          setRowsStatus([]);
          setCrossBookings([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKpi, dateStatus, dateCross, monthCross, crossViewType, selectedBranchId]);

  async function refreshAttendanceOnly() {
    if (!selectedBranchId) return;
    try {
      const [kpi, st, cb] = await Promise.all([
        api.getAttendanceByDate(dateKpi, selectedBranchId),
        api.getAttendanceByDate(dateStatus, selectedBranchId),
        api.getCrossBranchBookings({
          serviceBranchId: selectedBranchId,
          date: crossViewType === "date" ? dateCross : undefined,
          month: crossViewType === "month" ? monthCross : undefined
        })
      ]);
      setRowsKpi(kpi);
      setRowsStatus(st);
      setCrossBookings(cb);
    } catch {
      /* lỗi mạng tạm — giữ số hiện tại */
    }
  }

  async function refresh() {
    await refreshAttendanceOnly();
    try {
      await data.reload(true);
    } catch {
      /* ignore */
    }
  }

  const refreshAttendanceOnlyRef = useRef(refreshAttendanceOnly);
  refreshAttendanceOnlyRef.current = refreshAttendanceOnly;

  /** Polling nhanh (không gọi reload toàn bộ nhân sự) để thấy thay đổi từ chi nhánh khác gần như tức thì. */
  useEffect(() => {
    if (!selectedBranchId) return;
    const sync = () => {
      if (document.visibilityState === "visible") refreshAttendanceOnlyRef.current();
    };
    document.addEventListener("visibilitychange", sync);
    const POLL_MS = 500;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshAttendanceOnlyRef.current();
    }, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      clearInterval(id);
    };
  }, [selectedBranchId]);

  function closeModal() {
    setModal(null);
  }

  async function openKpiModal(staff) {
    const row = byStaffKpi.get(staff.id);
    let nid = 1;
    const chemParsed = parseStoredBookings(row?.chemical_bookings_json);
    const chemicalLines =
      chemParsed.length > 0
        ? chemParsed.map((b) => ({
            id: nid++,
            revenue: Number.isFinite(b.revenue) ? String(b.revenue) : ""
          }))
        : row && row.bookings > 0
          ? Array.from({ length: row.bookings }, () => ({ id: nid++, revenue: "" }))
          : [];

    const washParsed = parseStoredBookings(row?.wash_bookings_json);
    const washLines =
      staff.type === "assistant"
        ? washParsed.length > 0
          ? washParsed.map((b) => ({
              id: nid++,
              revenue: Number.isFinite(b.revenue) ? String(b.revenue) : ""
            }))
          : row && row.wash > 0
            ? Array.from({ length: row.wash }, () => ({ id: nid++, revenue: "" }))
            : []
        : washParsed.length > 0
          ? washParsed.map((b) => ({
              id: nid++,
              revenue: Number.isFinite(b.revenue) ? String(b.revenue) : ""
            }))
          : [];

    // Lấy lịch sử phạt trong tháng của nhân sự này
    let history = [];
    try {
      history = await api.getSalaryAdjustments({ 
        staffId: staff.id, 
        month: dateKpi.slice(0, 7),
        type: 'penalty'
      });
    } catch (e) {
      console.error("Lỗi lấy lịch sử phạt:", e);
    }

    setModal({
      kind: "kpi",
      date: dateKpi,
      staffId: staff.id,
      staffName: staff.name,
      staffType: staff.type,
      totalClients: row ? row.total_clients : 0,
      checkins: row ? row.checkins : 0,
      products: row ? row.products : 0,
      chemicalLines,
      washLines,
      penaltyHistory: history
    });
  }

  async function openStatusModal(staff) {
    const row = byStaffStatus.get(staff.id);
    const presenceStatus =
      row && row.present !== 1
        ? "absent"
        : row && row.late_minutes != null && row.late_minutes !== ""
          ? "late"
          : "present";

    // Lấy lịch sử phạt trong tháng của nhân sự này
    let history = [];
    try {
      history = await api.getSalaryAdjustments({ 
        staffId: staff.id, 
        month: dateStatus.slice(0, 7),
        type: 'penalty'
      });
    } catch (e) {
      console.error("Lỗi lấy lịch sử phạt:", e);
    }

    setModal({
      kind: "status",
      date: dateStatus,
      staffId: staff.id,
      staffName: staff.name,
      staffType: staff.type,
      presenceStatus,
      lateMinutes: row?.late_minutes != null && row.late_minutes !== "" ? Number(row.late_minutes) : 0,
      latePenalty: row?.late_penalty != null && row.late_penalty !== "" ? Number(row.late_penalty) : 0,
      additionalPenalty: "",
      additionalPenaltyNote: "",
      penaltyHistory: history
    });
  }

  function sumLineRevenues(lines) {
    return lines.reduce((s, line) => {
      const n = Number(String(line.revenue).replace(/\s/g, ""));
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  async function saveKpiModal() {
    if (!modal || modal.kind !== "kpi") return;

    const row = byStaffKpi.get(modal.staffId);
    const presenceStatus = presenceFromRow(row) === "late" ? "late" : "present";

    const chemicalPayload = modal.chemicalLines.map((line) => ({
      revenue: Math.round(Number(String(line.revenue).replace(/\s/g, "")))
    }));

    for (const b of chemicalPayload) {
      if (!Number.isFinite(b.revenue) || b.revenue < chemicalMinVnd) {
        alert(
          `Mỗi lịch đặt hóa chất phải có doanh thu từ ${chemicalMinVnd.toLocaleString("vi-VN")} VND trở lên. Hãy xóa dòng trống hoặc điền đủ từng lịch.`
        );
        return;
      }
    }

    const washPayload =
      modal.staffType === "assistant" || modal.staffType === "main"
        ? modal.washLines.map((line) => ({
            revenue: Math.round(Number(String(line.revenue).replace(/\s/g, "")))
          }))
        : [];

    if (modal.staffType === "assistant" || modal.staffType === "main") {
      for (const b of washPayload) {
        if (!Number.isFinite(b.revenue) || b.revenue <= 0) {
          alert(
            "Mỗi lịch đặt gội phải có doanh thu lớn hơn 0 VND. Hãy xóa dòng trống hoặc điền đủ từng lịch."
          );
          return;
        }
      }
    }

    try {
      await api.saveAttendance({
        staffId: modal.staffId,
        date: modal.date,
        presenceStatus,
        lateMinutes:
          presenceStatus === "late" ? Number(row?.late_minutes ?? 0) : undefined,
        latePenalty:
          presenceStatus === "late" ? Number(row?.late_penalty ?? 0) : undefined,
        totalClients: modal.totalClients || 0,
        checkins: modal.checkins || 0,
        products: modal.products || 0,
        chemicalBookings: chemicalPayload,
        washBookings: washPayload
      });
      closeModal();
      await refresh();
    } catch (e) {
      alert(e.message || "Không lưu được");
    }
  }

  async function saveStatusModal() {
    if (!modal || modal.kind !== "status") return;

    if (modal.presenceStatus === "late") {
      if (!Number.isFinite(modal.lateMinutes) || modal.lateMinutes < 0) {
        alert("Nhập số phút đi muộn (≥ 0).");
        return;
      }
      if (!Number.isFinite(modal.latePenalty) || modal.latePenalty < 0) {
        alert("Nhập số tiền phạt đi muộn (≥ 0).");
        return;
      }
    }

    const hasAdditionalPenalty = Number(modal.additionalPenalty) > 0;
    if (hasAdditionalPenalty && !modal.additionalPenaltyNote?.trim()) {
      alert("Vui lòng nhập ghi chú cho khoản phạt phát sinh.");
      return;
    }

    const row = byStaffStatus.get(modal.staffId);
    const { chemicalBookings, washBookings } = chemicalWashPayloadFromRow(row, modal.staffType);

    try {
      const savedRow = await api.saveAttendance({
        staffId: modal.staffId,
        date: modal.date,
        presenceStatus: modal.presenceStatus,
        lateMinutes: modal.presenceStatus === "late" ? modal.lateMinutes : undefined,
        latePenalty: modal.presenceStatus === "late" ? modal.latePenalty : undefined,
        totalClients: row?.total_clients ?? 0,
        checkins: row?.checkins ?? 0,
        products: row?.products ?? 0,
        chemicalBookings,
        washBookings
      });

      if (hasAdditionalPenalty) {
        await api.addSalaryAdjustment({
          staffId: modal.staffId,
          month: modal.date.slice(0, 7),
          type: "penalty",
          amount: Number(modal.additionalPenalty),
          note: `${modal.additionalPenaltyNote.trim()} ${formatViDateShort(modal.date)}`,
          attendanceId: savedRow.id
        });
      }

      closeModal();
      await refresh();
    } catch (e) {
      alert(e.message || "Không lưu được");
    }
  }

  const modalBookingTotal =
    modal && modal.kind === "kpi"
      ? sumLineRevenues(modal.chemicalLines) + sumLineRevenues(modal.washLines)
      : 0;

  const kpiColCountMain = 8;
  const kpiColCountAssistant = 9;
  const statusColCount = 3;

  return (
    <>
      <div className="card attendance-tabs-card" style={{ marginBottom: 16 }}>
        <div className="attendance-page-tabs">
          <button
            type="button"
            className={tab === "kpi" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setTab("kpi")}
          >
            {"Ch\u1ea5m KPI"}
          </button>
          <button
            type="button"
            className={tab === "status" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setTab("status")}
          >
            {"Ch\u1ea5m c\u00f4ng"}
          </button>
          <button
            type="button"
            className={tab === "cross" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setTab("cross")}
          >
            Lịch đặt chéo
          </button>
          <button
            type="button"
            className={tab === "yesterday" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setTab("yesterday")}
          >
            {"B\u00e1o c\u00e1o h\u00f4m qua"}
          </button>
        </div>
        {tab === "kpi" ? (
          <div className="row" style={{ marginTop: 12, marginBottom: 0, flexWrap: "wrap", gap: 10 }}>
            <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {"Ng\u00e0y ch\u1ea5m KPI (th\u01b0\u1eddng l\u00e0 h\u00f4m qua)"}
              <input type="date" value={dateKpi} onChange={(e) => setDateKpi(e.target.value)} />
            </label>
            <button type="button" className="secondary" onClick={() => refresh()}>
              {"L\u00e0m m\u1edbi"}
            </button>
          </div>
        ) : tab === "status" ? (
          <div className="row" style={{ marginTop: 12, marginBottom: 0, flexWrap: "wrap", gap: 10 }}>
            <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {"Ng\u00e0y ch\u1ea5m tr\u1ea1ng th\u00e1i (h\u00f4m nay)"}
              <input type="date" value={dateStatus} onChange={(e) => setDateStatus(e.target.value)} />
            </label>
            <button type="button" className="secondary" onClick={() => setDateStatus(vietnamTodayIsoDate())}>
              {"H\u00f4m nay"}
            </button>
            <button type="button" className="secondary" onClick={() => refresh()}>
              {"L\u00e0m m\u1edbi"}
            </button>
          </div>
        ) : tab === "cross" ? (
          <div className="row" style={{ marginTop: 12, marginBottom: 0, flexWrap: "wrap", gap: 10 }}>
            <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Ngày làm (để thêm lịch)
              <input type="date" value={dateCross} onChange={(e) => setDateCross(e.target.value)} />
            </label>
            <button type="button" className="secondary" onClick={() => refresh()}>
              Làm mới
            </button>
          </div>
        ) : null}
      </div>

      {tab === "kpi" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="page-header" style={{ marginTop: 0, marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Thợ chính</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{"Nh\u00e2n vi\u00ean"}</th>
                  <th>{"S\u1ed1 kh\u00e1ch \u0111\u00e3 l\u00e0m"}</th>
                  <th>Check-in</th>
                  <th>{"% check-in"}</th>
                  <th>{"L\u1ecbch \u0111\u1eb7t h\u00f3a ch\u1ea5t"}</th>
                  <th>{"S\u1ed1 s\u1ea3n ph\u1ea9m b\u00e1n"}</th>
                  <th>{"Doanh thu"}</th>
                  <th>{"H\u00e0nh \u0111\u1ed9ng"}</th>
                </tr>
              </thead>
              <tbody>
                {staffRowsMainKpi.length === 0 ? (
                  <tr>
                    <td colSpan={kpiColCountMain} className="muted">
                      Không có thợ chính trong chi nhánh.
                    </td>
                  </tr>
                ) : (
                  staffRowsMainKpi.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{byStaffKpi.get(s.id)?.total_clients ?? "-"}</td>
                      <td>{byStaffKpi.get(s.id)?.checkins ?? "-"}</td>
                      <td>
                        {formatCheckinRatePct(byStaffKpi.get(s.id)?.total_clients, byStaffKpi.get(s.id)?.checkins)}
                      </td>
                      <td>{byStaffKpi.get(s.id)?.bookings ?? "-"}</td>
                      <td>{byStaffKpi.get(s.id)?.products ?? "-"}</td>
                      <td>
                        {byStaffKpi.get(s.id)?.revenue != null ? formatVnd(byStaffKpi.get(s.id).revenue) : "-"}
                      </td>
                      <td>
                        <button className="primary" type="button" onClick={() => openKpiModal(s)}>
                          {"Ch\u1ea5m KPI"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="page-header" style={{ marginTop: 0, marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Thợ phụ</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>{"Nh\u00e2n vi\u00ean"}</th>
                  <th>{"S\u1ed1 kh\u00e1ch \u0111\u00e3 l\u00e0m"}</th>
                  <th>Check-in</th>
                  <th>{"% check-in"}</th>
                  <th>{"L\u1ecbch \u0111\u1eb7t h\u00f3a ch\u1ea5t"}</th>
                  <th>{"L\u1ecbch \u0111\u1eb7t g\u1ed9i"}</th>
                  <th>{"S\u1ed1 s\u1ea3n ph\u1ea9m b\u00e1n"}</th>
                  <th>{"Doanh thu"}</th>
                  <th>{"H\u00e0nh \u0111\u1ed9ng"}</th>
                </tr>
              </thead>
              <tbody>
                {staffRowsAssistantKpi.length === 0 ? (
                  <tr>
                    <td colSpan={kpiColCountAssistant} className="muted">
                      Không có thợ phụ trong chi nhánh.
                    </td>
                  </tr>
                ) : (
                  staffRowsAssistantKpi.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{byStaffKpi.get(s.id)?.total_clients ?? "-"}</td>
                      <td>{byStaffKpi.get(s.id)?.checkins ?? "-"}</td>
                      <td>
                        {formatCheckinRatePct(byStaffKpi.get(s.id)?.total_clients, byStaffKpi.get(s.id)?.checkins)}
                      </td>
                      <td>{byStaffKpi.get(s.id)?.bookings ?? "-"}</td>
                      <td>{byStaffKpi.get(s.id)?.wash ?? "-"}</td>
                      <td>{byStaffKpi.get(s.id)?.products ?? "-"}</td>
                      <td>
                        {byStaffKpi.get(s.id)?.revenue != null ? formatVnd(byStaffKpi.get(s.id).revenue) : "-"}
                      </td>
                      <td>
                        <button className="primary" type="button" onClick={() => openKpiModal(s)}>
                          {"Ch\u1ea5m KPI"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "status" && (
        <div className="attendance-container">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>Chấm trạng thái ngày {formatViDateShort(dateStatus)}</h3>
              <input
                type="date"
                value={dateStatus}
                onChange={(e) => setDateStatus(e.target.value)}
              />
            </div>
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              <div className="stat-card" style={{ padding: "10px 15px" }}>
                <div className="stat-title" style={{ fontSize: 12 }}>Tổng nhân sự</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{statusStats.total}</div>
              </div>
              <div className="stat-card" style={{ padding: "10px 15px" }}>
                <div className="stat-title" style={{ fontSize: 12 }}>Có mặt</div>
                <div className="stat-value" style={{ fontSize: 18, color: "#34d399" }}>{statusStats.present}</div>
              </div>
              <div className="stat-card" style={{ padding: "10px 15px" }}>
                <div className="stat-title" style={{ fontSize: 12 }}>Đi muộn</div>
                <div className="stat-value" style={{ fontSize: 18, color: "#fbbf24" }}>{statusStats.late}</div>
              </div>
              <div className="stat-card" style={{ padding: "10px 15px" }}>
                <div className="stat-title" style={{ fontSize: 12 }}>Vắng</div>
                <div className="stat-value" style={{ fontSize: 18, color: "#f87171" }}>{statusStats.absent}</div>
              </div>
              <div className="stat-card" style={{ padding: "10px 15px" }}>
                <div className="stat-title" style={{ fontSize: 12 }}>Chưa chấm</div>
                <div className="stat-value" style={{ fontSize: 18, color: "var(--text-muted)" }}>{statusStats.unassigned}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 15 }}>Thợ chính</h4>
            <div className="table-scroll">
              <table className="attendance-status-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRowsMainStatus.length === 0 ? (
                    <tr>
                      <td colSpan={statusColCount} className="muted">
                        Không có thợ chính trong chi nhánh.
                      </td>
                    </tr>
                  ) : (
                    staffRowsMainStatus.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{formatAttendanceStatus(byStaffStatus.get(s.id))}</td>
                        <td>
                          <button className="primary" type="button" onClick={() => openStatusModal(s)}>
                            {"Ch\u1ea5m tr\u1ea1ng th\u00e1i"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 15 }}>Thợ phụ</h4>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRowsAssistantStatus.length === 0 ? (
                    <tr>
                      <td colSpan={statusColCount} className="muted">
                        Không có thợ phụ trong chi nhánh.
                      </td>
                    </tr>
                  ) : (
                    staffRowsAssistantStatus.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{formatAttendanceStatus(byStaffStatus.get(s.id))}</td>
                        <td>
                          <button className="primary" type="button" onClick={() => openStatusModal(s)}>
                            {"Ch\u1ea5m tr\u1ea1ng th\u00e1i"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "cross" && (
        <CrossBranchPanel
          data={data}
          serviceBranchId={selectedBranchId}
          dateCross={dateCross}
          setDateCross={setDateCross}
          monthCross={monthCross}
          setMonthCross={setMonthCross}
          crossViewType={crossViewType}
          setCrossViewType={setCrossViewType}
          crossBookings={crossBookings}
          onRefresh={refresh}
          chemicalMinVnd={chemicalMinVnd}
        />
      )}

      {tab === "yesterday" && (
        <YesterdayReportPanel
          data={data}
          selectedBranchId={selectedBranchId}
          reportDate={reportDate}
          onReportDateChange={setReportDate}
        />
      )}

      {modal && modal.kind === "kpi" && (
        <div className="attendance-modal" role="dialog" aria-modal="true" aria-label="Ch\u1ea5m KPI">
          <button
            type="button"
            className="attendance-modal-backdrop"
            aria-label="\u0110\u00f3ng"
            onClick={closeModal}
          />
          <div className="attendance-modal-panel">
            <button type="button" className="attendance-modal-close" onClick={closeModal} aria-label="X">
              ×
            </button>
            <h3 className="attendance-modal-title">
              {"Ch\u1ea5m KPI — "}
              {modal.staffName}
            </h3>
            <p className="muted attendance-modal-sub">
              {"Ng\u00e0y: "}
              {formatViDateShort(modal.date)}
              {" · "}
              {"T\u1ed5ng doanh thu: "}
              <strong>{formatVnd(modalBookingTotal)}</strong>
            </p>

            <div className="attendance-modal-row3">
              <div className="attendance-modal-field">
                <label>{"S\u1ed1 kh\u00e1ch \u0111\u00e3 l\u00e0m"}</label>
                <input
                  type="number"
                  min={0}
                  value={modal.totalClients}
                  onChange={(e) => setModal({ ...modal, totalClients: Number(e.target.value) })}
                />
              </div>
              <div className="attendance-modal-field">
                <label>Check-in</label>
                <input
                  type="number"
                  min={0}
                  value={modal.checkins}
                  onChange={(e) => setModal({ ...modal, checkins: Number(e.target.value) })}
                />
              </div>
              <div className="attendance-modal-field">
                <label>{"S\u1ed1 s\u1ea3n ph\u1ea9m b\u00e1n"}</label>
                <input
                  type="number"
                  min={0}
                  value={modal.products}
                  onChange={(e) => setModal({ ...modal, products: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="attendance-modal-bookings attendance-modal-bookings--split">
              <div className="attendance-modal-section">
                <div className="attendance-modal-section-head">
                  <h4>{"L\u1ecbch \u0111\u1eb7t h\u00f3a ch\u1ea5t"}</h4>
                  <span className="muted">
                    {"S\u1ed1 l\u1ecbch: "}
                    {modal.chemicalLines.length}
                  </span>
                </div>
                <ul className="attendance-modal-lines">
                  {modal.chemicalLines.map((line, idx) => (
                    <li key={line.id}>
                      <span className="attendance-line-idx">{idx + 1}</span>
                      <input
                        type="number"
                        min={chemicalMinVnd}
                        placeholder="Doanh thu lịch (VND)"
                        value={line.revenue}
                        onChange={(e) => {
                          const v = e.target.value;
                          setModal({
                            ...modal,
                            chemicalLines: modal.chemicalLines.map((l) =>
                              l.id === line.id ? { ...l, revenue: v } : l
                            )
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Xóa"
                        onClick={() =>
                          setModal({
                            ...modal,
                            chemicalLines: modal.chemicalLines.filter((l) => l.id !== line.id)
                          })
                        }
                      >
                        {"🗑️"}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setModal({
                      ...modal,
                      chemicalLines: [...modal.chemicalLines, { id: Date.now(), revenue: "" }]
                    })
                  }
                >
                  {"+ Th\u00eam l\u1ecbch h\u00f3a ch\u1ea5t"}
                </button>
              </div>

              <div className="attendance-modal-section">
                <div className="attendance-modal-section-head">
                  <h4>{"L\u1ecbch \u0111\u1eb7t g\u1ed9i"}</h4>
                  <span className="muted">
                    {"S\u1ed1 d\u00f2ng: "}
                    {modal.washLines.length}
                    {" · l\u1ecbch t\u00ednh: "}
                    {totalWashBookingCount(modal.washLines)}
                  </span>
                </div>
                <ul className="attendance-modal-lines">
                  {modal.washLines.map((line, idx) => (
                    <li key={line.id}>
                      <span className="attendance-line-idx">{idx + 1}</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="Doanh thu lịch (VND)"
                        value={line.revenue}
                        onChange={(e) => {
                          const v = e.target.value;
                          setModal({
                            ...modal,
                            washLines: modal.washLines.map((l) =>
                              l.id === line.id ? { ...l, revenue: v } : l
                            )
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Xóa"
                        onClick={() =>
                          setModal({
                            ...modal,
                            washLines: modal.washLines.filter((l) => l.id !== line.id)
                          })
                        }
                      >
                        {"🗑️"}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setModal({
                      ...modal,
                      washLines: [...modal.washLines, { id: Date.now(), revenue: "" }]
                    })
                  }
                >
                  {"+ Th\u00eam l\u1ecbch g\u1ed9i"}
                </button>
              </div>
            </div>

            <div className="attendance-modal-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 15, marginTop: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: "var(--text-active)" }}>
                  Lịch sử phạt của nhân sự
                </h4>
                <span className="muted" style={{ fontSize: 12 }}>Tháng {modal.date.slice(0, 7)}</span>
              </div>
              
              <div className="penalty-history-list" style={{ maxHeight: 200, overflowY: "auto" }}>
                {modal.penaltyHistory && modal.penaltyHistory.length > 0 ? (
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ textAlign: "left", padding: "8px 4px" }}>Ngày / Ghi chú</th>
                        <th style={{ textAlign: "right", padding: "8px 4px" }}>Số tiền</th>
                        <th style={{ textAlign: "right", padding: "8px 4px", width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {modal.penaltyHistory.map((h) => {
                        const currentDayRow = modal.kind === 'kpi' ? byStaffKpi.get(modal.staffId) : byStaffStatus.get(modal.staffId);
                        const isToday = h.attendance_id && currentDayRow?.id === h.attendance_id;
                        const isEditing = editingAdj?.id === h.id;

                        return (
                          <tr key={h.id} style={{ 
                            borderBottom: "1px dotted var(--border-color)",
                            background: isToday ? "rgba(248, 113, 113, 0.05)" : "transparent"
                          }}>
                            <td style={{ padding: "8px 4px" }}>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editingAdj.note} 
                                  onChange={e => setEditingAdj({...editingAdj, note: e.target.value})}
                                  style={{ width: '100%', fontSize: 12, padding: '2px 4px' }}
                                />
                              ) : (
                                <>
                                  {isToday && <span style={{ color: "#f87171", fontWeight: "bold", marginRight: 5 }}>[Ngày này]</span>}
                                  {h.note || "Phạt KPI/Đi muộn"}
                                </>
                              )}
                            </td>
                            <td style={{ textAlign: "right", color: "#f87171", padding: "8px 4px", fontWeight: isToday ? "bold" : "normal" }}>
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={editingAdj.amount} 
                                  onChange={e => setEditingAdj({...editingAdj, amount: e.target.value})}
                                  style={{ width: 80, fontSize: 12, padding: '2px 4px', textAlign: 'right' }}
                                />
                              ) : (
                                <>-{fmtMoney(h.amount)}đ</>
                              )}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 4px" }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                {isEditing ? (
                                  <>
                                    <button className="icon-btn" title="Lưu" onClick={handleUpdateAdjustment}>✅</button>
                                    <button className="icon-btn" title="Hủy" onClick={() => setEditingAdj(null)}>❌</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="icon-btn" title="Sửa" onClick={() => setEditingAdj({ id: h.id, amount: h.amount, note: h.note || "" })}>✏️</button>
                                    <button className="icon-btn danger" title="Xóa" onClick={() => handleDeleteAdjustment(h.id)}>🗑️</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>Chưa có lịch sử phạt trong tháng này.</p>
                )}
              </div>
              
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Tổng phạt trong tháng:</span>
                <span style={{ fontSize: 13, color: "#f87171", fontWeight: "bold" }}>
                  -{fmtMoney(modal.penaltyHistory?.reduce((s, h) => s + h.amount, 0) || 0)}đ
                </span>
              </div>
            </div>

            <div className="attendance-modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                {"H\u1ee7y"}
              </button>
              <button type="button" className="primary" onClick={saveKpiModal}>
                {"L\u01b0u"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal.kind === "status" && (
        <div className="attendance-modal" role="dialog" aria-modal="true" aria-label="Ch\u1ea5m tr\u1ea1ng th\u00e1i">
          <button
            type="button"
            className="attendance-modal-backdrop"
            aria-label="\u0110\u00f3ng"
            onClick={closeModal}
          />
          <div className="attendance-modal-panel attendance-modal-panel--status">
            <button type="button" className="attendance-modal-close" onClick={closeModal} aria-label="X">
              ×
            </button>
            <h3 className="attendance-modal-title">
              {"Ch\u1ea5m tr\u1ea1ng th\u00e1i — "}
              {modal.staffName}
            </h3>
            <p className="muted attendance-modal-sub">
              {"Ng\u00e0y: "}
              {modal.date}
            </p>

            <div className="attendance-modal-field">
              <label>{"Tr\u1ea1ng th\u00e1i \u0111i l\u00e0m"}</label>
              <select
                className="attendance-status-select"
                value={modal.presenceStatus}
                onChange={(e) => setModal({ ...modal, presenceStatus: e.target.value })}
              >
                <option value="present">{"C\u00f3 m\u1eb7t"}</option>
                <option value="late">{"\u0110i mu\u1ed9n"}</option>
                <option value="absent">{"V\u1eafng"}</option>
              </select>
            </div>

            {modal.presenceStatus === "late" ? (
              <div className="attendance-modal-row3">
                <div className="attendance-modal-field">
                  <label>{"S\u1ed1 ph\u00fat \u0111i mu\u1ed9n"}</label>
                  <input
                    type="number"
                    min={0}
                    value={modal.lateMinutes}
                    onChange={(e) => setModal({ ...modal, lateMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="attendance-modal-field">
                  <label>{"Ti\u1ec1n ph\u1ea1t \u0111i mu\u1ed9n (VND)"}</label>
                  <input
                    type="number"
                    min={0}
                    value={modal.latePenalty}
                    onChange={(e) => setModal({ ...modal, latePenalty: Number(e.target.value) })}
                  />
                </div>
                <div className="attendance-modal-field" />
              </div>
            ) : null}

            <div className="attendance-modal-section">
              <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-muted)" }}>
                Thêm phạt phát sinh (tuỳ chọn)
              </h4>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div className="attendance-modal-field" style={{ flex: 1, minWidth: 140 }}>
                  <label>Tiền phạt (VND)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="VD: 50000"
                    value={modal.additionalPenalty}
                    onChange={(e) => setModal({ ...modal, additionalPenalty: e.target.value })}
                  />
                </div>
                <div className="attendance-modal-field" style={{ flex: 1, minWidth: 140 }}>
                  <label>Ghi chú lý do phạt</label>
                  <input
                    type="text"
                    placeholder="VD: Làm hỏng dụng cụ"
                    value={modal.additionalPenaltyNote}
                    onChange={(e) => setModal({ ...modal, additionalPenaltyNote: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="attendance-modal-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 15, marginTop: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: "var(--text-active)" }}>
                  Lịch sử phạt của nhân sự
                </h4>
                <span className="muted" style={{ fontSize: 12 }}>Tháng {modal.date.slice(0, 7)}</span>
              </div>
              
              <div className="penalty-history-list" style={{ maxHeight: 200, overflowY: "auto" }}>
                {modal.penaltyHistory && modal.penaltyHistory.length > 0 ? (
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ textAlign: "left", padding: "8px 4px" }}>Ngày / Ghi chú</th>
                        <th style={{ textAlign: "right", padding: "8px 4px" }}>Số tiền</th>
                        <th style={{ textAlign: "right", padding: "8px 4px", width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {modal.penaltyHistory.map((h) => {
                        const currentDayRow = modal.kind === 'kpi' ? byStaffKpi.get(modal.staffId) : byStaffStatus.get(modal.staffId);
                        const isToday = h.attendance_id && currentDayRow?.id === h.attendance_id;
                        const isEditing = editingAdj?.id === h.id;

                        return (
                          <tr key={h.id} style={{ 
                            borderBottom: "1px dotted var(--border-color)",
                            background: isToday ? "rgba(248, 113, 113, 0.05)" : "transparent"
                          }}>
                            <td style={{ padding: "8px 4px" }}>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editingAdj.note} 
                                  onChange={e => setEditingAdj({...editingAdj, note: e.target.value})}
                                  style={{ width: '100%', fontSize: 12, padding: '2px 4px' }}
                                />
                              ) : (
                                <>
                                  {isToday && <span style={{ color: "#f87171", fontWeight: "bold", marginRight: 5 }}>[Ngày này]</span>}
                                  {h.note || "Phạt KPI/Đi muộn"}
                                </>
                              )}
                            </td>
                            <td style={{ textAlign: "right", color: "#f87171", padding: "8px 4px", fontWeight: isToday ? "bold" : "normal" }}>
                              {isEditing ? (
                                <input 
                                  type="number" 
                                  value={editingAdj.amount} 
                                  onChange={e => setEditingAdj({...editingAdj, amount: e.target.value})}
                                  style={{ width: 80, fontSize: 12, padding: '2px 4px', textAlign: 'right' }}
                                />
                              ) : (
                                <>-{fmtMoney(h.amount)}đ</>
                              )}
                            </td>
                            <td style={{ textAlign: "right", padding: "8px 4px" }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                {isEditing ? (
                                  <>
                                    <button className="icon-btn" title="Lưu" onClick={handleUpdateAdjustment}>✅</button>
                                    <button className="icon-btn" title="Hủy" onClick={() => setEditingAdj(null)}>❌</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="icon-btn" title="Sửa" onClick={() => setEditingAdj({ id: h.id, amount: h.amount, note: h.note || "" })}>✏️</button>
                                    <button className="icon-btn danger" title="Xóa" onClick={() => handleDeleteAdjustment(h.id)}>🗑️</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>Chưa có lịch sử phạt trong tháng này.</p>
                )}
              </div>
              
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: "bold" }}>Tổng phạt trong tháng:</span>
                <span style={{ fontSize: 13, color: "#f87171", fontWeight: "bold" }}>
                  -{fmtMoney(modal.penaltyHistory?.reduce((s, h) => s + h.amount, 0) || 0)}đ
                </span>
              </div>
            </div>

            <div className="attendance-modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                {"H\u1ee7y"}
              </button>
              <button type="button" className="primary" onClick={saveStatusModal}>
                {"L\u01b0u"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
