import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoneyThousands } from "../utils/format";

/** Các ngày YYYY-MM-DD trong tháng `YYYY-MM`. */
function monthIsoDates(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return Array.from({ length: last }, (_, i) => {
    const d = i + 1;
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  });
}

export function KpiManagerPage({ data, selectedBranchId }) {
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pickId, setPickId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [attRows, setAttRows] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(false);

  const branchStaff = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter((s) => Number(s.branchId) === bid && s.status === "working")
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId]);

  const inListIds = useMemo(() => new Set(list.map((r) => r.id)), [list]);

  const canAdd = useMemo(
    () => branchStaff.filter((s) => !inListIds.has(s.id)),
    [branchStaff, inListIds]
  );

  const loadList = useCallback(async () => {
    if (!selectedBranchId) {
      setList([]);
      return;
    }
    setLoadingList(true);
    try {
      setList(await api.getManagerKpiStaff(selectedBranchId));
    } catch {
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, [selectedBranchId]);

  const loadAttendanceMonth = useCallback(async () => {
    if (!selectedBranchId) {
      setAttRows([]);
      return;
    }
    setLoadingAtt(true);
    try {
      setAttRows(await api.getAttendanceByMonth(month, selectedBranchId));
    } catch {
      setAttRows([]);
    } finally {
      setLoadingAtt(false);
    }
  }, [month, selectedBranchId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadAttendanceMonth();
  }, [loadAttendanceMonth]);

  const dates = useMemo(() => monthIsoDates(month), [month]);

  const revenueByStaffDate = useMemo(() => {
    const ids = new Set(list.map((x) => x.id));
    const m = new Map();
    for (const a of attRows) {
      if (!ids.has(a.staff_id)) continue;
      m.set(`${a.staff_id}_${a.date}`, Number(a.revenue) || 0);
    }
    return m;
  }, [attRows, list]);

  const gridRows = useMemo(() => {
    return list.map((staff) => {
      let total = 0;
      const cells = dates.map((iso) => {
        const key = `${staff.id}_${iso}`;
        if (!revenueByStaffDate.has(key)) return { value: null };
        const v = revenueByStaffDate.get(key);
        total += v;
        return { value: v };
      });
      return { staff, cells, total };
    });
  }, [list, dates, revenueByStaffDate]);

  async function handleAdd() {
    if (!pickId || !selectedBranchId) return;
    try {
      const row = await api.addManagerKpiStaff({
        staffId: Number(pickId),
        branchId: selectedBranchId
      });
      setList((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name, "vi")));
      setPickId("");
    } catch (e) {
      alert(e.message || "Không thêm được");
    }
  }

  async function handleRemove(id) {
    if (!confirm("Bỏ nhân viên này khỏi KPI quản lí?")) return;
    try {
      await api.removeManagerKpiStaff(id);
      setList((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e.message || "Không xóa được");
    }
  }

  if (!selectedBranchId) {
    return (
      <div className="card">
        <p className="muted">Vui lòng chọn chi nhánh ở mục Lọc chi nhánh trước.</p>
      </div>
    );
  }

  const branchName = data.branches.find((b) => Number(b.id) === Number(selectedBranchId))?.name || "—";

  return (
    <div className="kpi-manager-page">
      <div className="card">
        <div className="page-header">
          <h3>Danh sách chạy KPI quản lí</h3>
          <span className="muted">
            Chi nhánh: <strong>{branchName}</strong>
          </span>
        </div>
        <p className="muted small" style={{ marginBottom: 16 }}>
          Chỉ chọn nhân viên thuộc chi nhánh này. Bảng doanh thu dưới lấy từ chấm công, hiển thị theo nghìn đồng.
        </p>

        <div className="row" style={{ marginBottom: 16, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value="">— Chọn nhân viên —</option>
            {canAdd.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type === "main" ? "Thợ chính" : "Thợ phụ"})
              </option>
            ))}
          </select>
          <button type="button" className="primary" disabled={!pickId || canAdd.length === 0} onClick={handleAdd}>
            Thêm
          </button>
        </div>

        {loadingList ? (
          <p className="muted">Đang tải danh sách…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Loại</th>
                <th style={{ width: 100 }}>Gỡ</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Chưa có ai — thêm nhân viên để xem bảng doanh thu.
                  </td>
                </tr>
              ) : (
                list.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <span className={`badge ${r.type === "main" ? "badge-blue" : "badge-yellow"}`}>
                        {r.type === "main" ? "Thợ chính" : "Thợ phụ"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="secondary" onClick={() => handleRemove(r.id)}>
                        Gỡ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card kpi-manager-table-card">
        <div className="page-header">
          <h3>Bảng doanh thu KPI quản lí</h3>
        </div>
        <div className="row" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <label className="muted">Tháng</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button type="button" className="secondary" onClick={() => loadAttendanceMonth()}>
            Làm mới dữ liệu
          </button>
          <span className="muted small">
            Chấm công nhập đồng; bảng hiển thị nghìn đồng. Làm mới sau khi chấm công.
          </span>
        </div>
        <p className="muted small kpi-manager-unit-hint" style={{ marginBottom: 8 }}>
          Đơn vị bảng: <strong>nghìn đồng</strong> (bỏ 3 chữ số cuối so với đồng).
        </p>

        {list.length === 0 ? (
          <p className="muted">Thêm ít nhất một nhân viên vào KPI quản lí để xem bảng.</p>
        ) : loadingAtt ? (
          <p className="muted">Đang tải doanh thu…</p>
        ) : (
          <div className="kpi-manager-grid-wrap">
            <table className="kpi-manager-table">
              <thead>
                <tr>
                  <th className="kpi-manager-sticky-name">Nhân viên</th>
                  {dates.map((iso) => (
                    <th key={iso} className="kpi-manager-th-day" title={iso}>
                      {iso.slice(8, 10)}
                    </th>
                  ))}
                  <th
                    className="kpi-manager-th-total kpi-manager-sticky-total"
                    title="Tổng (nghìn đồng)"
                  >
                    Tổng
                  </th>
                </tr>
              </thead>
              <tbody>
                {gridRows.map(({ staff, cells, total }) => (
                  <tr key={staff.id}>
                    <td className="kpi-manager-sticky-name" title={staff.name}>
                      {staff.name}
                    </td>
                    {cells.map((c, idx) => (
                      <td key={dates[idx]} className="kpi-manager-cell-num kpi-manager-cell-day">
                        {c.value === null ? <span className="muted">—</span> : fmtMoneyThousands(c.value)}
                      </td>
                    ))}
                    <td className="kpi-manager-cell-num kpi-manager-cell-total kpi-manager-sticky-total">
                      <strong>{fmtMoneyThousands(total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
