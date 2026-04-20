/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import {
  addIsoDays,
  employmentOverlapsIsoRange,
  employmentOverlapsMonth,
  getMondaySundayIsoWeekContaining,
  vietnamTodayIsoDate
} from "../utils/vietnamTime";
import { currentMonth, formatCheckinRatePct, formatViDateShort } from "../utils/format";

function formatVnd(n) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("vi-VN")} đ`;
}

function monthStringToIsoRange(month) {
  const [y, m] = String(month).split("-").map(Number);
  if (!y || !m) return { from: "", to: "" };
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function dayStatusLabel(row) {
  if (!row) return "—";
  if (row.present !== 1) return "Vắng";
  if (row.late_minutes != null && row.late_minutes !== "") return `Đi muộn (${row.late_minutes}′)`;
  return "Có mặt";
}

/** Cột bảng tổng → cột bảng chi tiết (ô được tô trong modal). */
const DRILL_COL_TO_DETAIL = {
  name: "date",
  status: "status",
  clients: "clients",
  checkins: "checkins",
  checkinPct: "checkinPct",
  bookings: "bookings",
  wash: "wash",
  products: "products",
  revenue: "revenue"
};

function KpiHistoryModal({ open, onClose, staff, rangeFrom, rangeTo, selectedBranchId, periodTitle, highlightCol, isAssistant }) {
  const [dayRows, setDayRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !staff?.id || !rangeFrom || !rangeTo || selectedBranchId == null || selectedBranchId === "") {
      setDayRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const all = await api.getAttendanceByRange(rangeFrom, rangeTo, selectedBranchId);
        if (cancelled) return;
        const mine = all.filter((r) => r.staff_id === staff.id);
        const byDate = new Map(mine.map((r) => [r.date, r]));
        const days = [];
        let d = rangeFrom;
        while (d <= rangeTo) {
          days.push({ date: d, row: byDate.get(d) ?? null });
          d = addIsoDays(d, 1);
        }
        setDayRows(days);
      } catch {
        if (!cancelled) setDayRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, staff?.id, rangeFrom, rangeTo, selectedBranchId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !staff) return null;

  const showWash = isAssistant;
  const colSpan = showWash ? 9 : 8;
  function HC(col) {
    return highlightCol === col ? "kpi-history-col-highlight" : undefined;
  }

  return (
    <div className="attendance-modal" role="dialog" aria-modal="true" aria-label="Chi tiết KPI theo ngày">
      <button type="button" className="attendance-modal-backdrop" onClick={onClose} aria-label="Đóng" />
      <div className="attendance-modal-panel" style={{ maxWidth: 960, width: "min(960px, 96vw)" }}>
        <button type="button" className="attendance-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h3 className="attendance-modal-title">Chi tiết theo ngày</h3>
        <p className="muted attendance-modal-sub">
          {staff.name} · {periodTitle}
        </p>
        <div className="table-scroll kpi-table-scroll" style={{ maxHeight: "70vh" }}>
          <table className="kpi-attendance-table kpi-history-modal-table">
            <thead>
              <tr>
                <th className={HC("date")}>Ngày</th>
                <th className={HC("status")}>Trạng thái</th>
                <th className={HC("clients")}>Khách</th>
                <th className={HC("checkins")}>Check-in</th>
                <th className={HC("checkinPct")}>% check-in</th>
                <th className={HC("bookings")}>Lịch HC</th>
                {showWash ? <th className={HC("wash")}>Lịch gội</th> : null}
                <th className={HC("products")}>Sản phẩm</th>
                <th className={HC("revenue")}>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="muted">
                    Đang tải...
                  </td>
                </tr>
              ) : dayRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="muted">
                    Không có dữ liệu trong kỳ.
                  </td>
                </tr>
              ) : (
                dayRows.map(({ date, row }) => (
                  <tr key={date}>
                    <td className={HC("date")}>{formatViDateShort(date)}</td>
                    <td className={HC("status")}>{dayStatusLabel(row)}</td>
                    <td className={HC("clients")}>{row ? row.total_clients ?? 0 : "—"}</td>
                    <td className={HC("checkins")}>{row ? row.checkins ?? 0 : "—"}</td>
                    <td className={HC("checkinPct")}>
                      {row ? formatCheckinRatePct(row.total_clients, row.checkins) : "—"}
                    </td>
                    <td className={HC("bookings")}>{row ? row.bookings ?? 0 : "—"}</td>
                    {showWash ? <td className={HC("wash")}>{row ? row.wash ?? 0 : "—"}</td> : null}
                    <td className={HC("products")}>{row ? row.products ?? 0 : "—"}</td>
                    <td className={HC("revenue")}>{row ? formatVnd(Number(row.revenue) || 0) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Nền ô theo KPI. Backend trả checks / checksActive: tuần — lịch HC, check-in, (thợ phụ) gội;
 * tháng — chỉ doanh thu và sản phẩm (không tô % check-in / lịch HC).
 */
function kpiCellBgClass(kpiReady, checks, checksActive, key) {
  if (!kpiReady) return undefined;
  if (!checksActive?.[key]) return undefined;
  const raw = checks?.[key];
  if (typeof raw !== "boolean") return undefined;
  return raw ? "kpi-criterion-pass" : "kpi-criterion-fail";
}

/** Số liệu bảng lấy từ GET /reports/kpi hoặc /reports/kpi-week (một nguồn với logic KPI). */
function AttendanceStyleTotalsTable({
  sectionTitle,
  isAssistant,
  staffRows,
  periodLabel,
  kpiReady,
  kpiRowById,
  /** "week": cột lịch đặt gội cho thợ phụ; "month": không có cột này (KPI tháng không tính gội). */
  period,
  /** Khi đủ 3 giá trị: mỗi ô mở modal chi tiết theo ngày (GET /attendance?from&to). */
  rangeFrom,
  rangeTo,
  selectedBranchId,
  /** Nhãn kỳ trong modal, ví dụ "Tuần 01/04/2026 – 07/04/2026" hoặc "Tháng 2026-04". */
  periodRangeTitle
}) {
  const [history, setHistory] = useState(null);
  const emptyMsg = isAssistant ? "Không có thợ phụ trong chi nhánh." : "Không có thợ chính trong chi nhánh.";
  const showWashColumn = isAssistant && period === "week";
  /* 8 cột thợ chính (+1 cột gội nếu thợ phụ) — khớp colgroup/colspan, tránh ô trống bên phải */
  const colCount = showWashColumn ? 9 : 8;
  const canDrill = Boolean(selectedBranchId && rangeFrom && rangeTo);

  function tdDrill(className, colKey, children, s) {
    const cls = [className, canDrill ? "kpi-cell-drill" : ""].filter(Boolean).join(" ");
    return (
      <td
        className={cls || undefined}
        title={canDrill ? "Xem chi tiết theo ngày trong kỳ" : undefined}
        onClick={
          canDrill
            ? () => setHistory({ staff: s, colKey })
            : undefined
        }
        role={canDrill ? "button" : undefined}
        tabIndex={canDrill ? 0 : undefined}
        onKeyDown={
          canDrill
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setHistory({ staff: s, colKey });
                }
              }
            : undefined
        }
      >
        {children}
      </td>
    );
  }

  return (
    <div className="card kpi-period-card" style={{ marginBottom: 16 }}>
      {periodLabel ? (
        <p className="muted" style={{ marginBottom: 10 }}>
          {periodLabel}
        </p>
      ) : null}
      <div className="page-header" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{sectionTitle}</h3>
      </div>
      {canDrill ? (
        <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
          Bấm vào từng ô trong bảng để xem lịch sử theo ngày trong kỳ (dữ liệu chấm công).
        </p>
      ) : null}
      <div className="table-scroll kpi-table-scroll">
        <table className="kpi-attendance-table">
          <colgroup>
            {Array.from({ length: colCount }).map((_, i) => (
              <col key={i} style={{ width: `${100 / colCount}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>{"Nh\u00e2n vi\u00ean"}</th>
              <th>{"Tr\u1ea1ng th\u00e1i"}</th>
              <th>{"S\u1ed1 kh\u00e1ch \u0111\u00e3 l\u00e0m"}</th>
              <th>Check-in</th>
              <th>{"% check-in"}</th>
              <th>{"L\u1ecbch \u0111\u1eb7t h\u00f3a ch\u1ea5t"}</th>
              {showWashColumn ? <th>{"L\u1ecbch \u0111\u1eb7t g\u1ed9i"}</th> : null}
              <th>{"S\u1ed1 s\u1ea3n ph\u1ea9m b\u00e1n"}</th>
              <th>{"Doanh thu"}</th>
            </tr>
          </thead>
          <tbody>
            {staffRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="muted">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              staffRows.map((s) => {
                const m = kpiRowById.get(s.id);
                const checks = m?.checks;
                const checksActive = m?.checksActive;
                const presentDays = m?.presentDays ?? 0;
                const totalClients = m?.totalClients ?? 0;
                const totalCheckins = m?.totalCheckins ?? 0;
                return (
                  <tr key={s.id}>
                    {tdDrill(undefined, "name", s.name, s)}
                    {tdDrill(undefined, "status", `${presentDays} ngày có mặt`, s)}
                    {tdDrill(undefined, "clients", totalClients, s)}
                    {tdDrill(undefined, "checkins", totalCheckins, s)}
                    {tdDrill(
                      kpiCellBgClass(kpiReady, checks, checksActive, "checkin"),
                      "checkinPct",
                      formatCheckinRatePct(totalClients, totalCheckins),
                      s
                    )}
                    {tdDrill(
                      kpiCellBgClass(kpiReady, checks, checksActive, "bookings"),
                      "bookings",
                      m?.totalBookings ?? 0,
                      s
                    )}
                    {showWashColumn
                      ? tdDrill(
                          kpiCellBgClass(kpiReady, checks, checksActive, "wash"),
                          "wash",
                          m?.totalWash ?? 0,
                          s
                        )
                      : null}
                    {tdDrill(
                      kpiCellBgClass(kpiReady, checks, checksActive, "products"),
                      "products",
                      m?.totalProducts ?? 0,
                      s
                    )}
                    {tdDrill(
                      kpiCellBgClass(kpiReady, checks, checksActive, "revenue"),
                      "revenue",
                      formatVnd(m?.totalRevenue ?? 0),
                      s
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {history ? (
        <KpiHistoryModal
          open
          onClose={() => setHistory(null)}
          staff={history.staff}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          selectedBranchId={selectedBranchId}
          periodTitle={periodRangeTitle || ""}
          highlightCol={DRILL_COL_TO_DETAIL[history.colKey]}
          isAssistant={isAssistant}
        />
      ) : null}
    </div>
  );
}

/** KPI tuần: tổng cả tuần (Thứ Hai–Chủ nhật), không chọn "một ngày trong tuần". */
export function KpiWeekAttendanceReport({ data, selectedBranchId }) {
  const [weekMonday, setWeekMonday] = useState(
    () => getMondaySundayIsoWeekContaining(vietnamTodayIsoDate()).weekStart
  );
  const [kpiRowById, setKpiRowById] = useState(() => new Map());
  const [kpiReady, setKpiReady] = useState(false);
  const [staffVersion, setStaffVersion] = useState(0);

  const weekEnd = useMemo(() => addIsoDays(weekMonday, 6), [weekMonday]);

  useEffect(() => {
    setStaffVersion(v => v + 1);
  }, [data.reloadVersion]);

  useEffect(() => {
    if (!selectedBranchId) {
      setKpiRowById(new Map());
      setKpiReady(false);
      return;
    }
    let cancelled = false;
    setKpiReady(false);
    (async () => {
      try {
        const kpiRows = await api.getKpiWeekReport(weekMonday, weekEnd, selectedBranchId);
        if (cancelled) return;
        setKpiRowById(new Map(kpiRows.map((r) => [r.id, r])));
        setKpiReady(true);
      } catch {
        if (!cancelled) {
          setKpiRowById(new Map());
          setKpiReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekMonday, weekEnd, selectedBranchId, staffVersion]);

  useEffect(() => {
    if (!selectedBranchId) return;
    const POLL_MS = 500;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const kpiRows = await api.getKpiWeekReport(weekMonday, weekEnd, selectedBranchId);
        setKpiRowById(new Map(kpiRows.map((r) => [r.id, r])));
        setKpiReady(true);
      } catch {
        /* giữ bảng cũ khi lỗi mạng */
      }
    }
    const id = setInterval(poll, POLL_MS);
    function onVis() {
      if (document.visibilityState === "visible") poll();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [weekMonday, weekEnd, selectedBranchId]);

  const staffRows = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter(
        (s) =>
          s.status === "working" &&
          Number(s.branchId) === bid &&
          employmentOverlapsIsoRange(s, weekMonday, weekEnd)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId, weekMonday, weekEnd]);

  const rangeLabel = `${formatViDateShort(weekMonday)} – ${formatViDateShort(weekEnd)}`;
  const periodLabel = `Tổng tuần ${rangeLabel}`;

  const staffRowsMain = useMemo(
    () => staffRows.filter((s) => s.type === "main"),
    [staffRows]
  );
  const staffRowsAssistant = useMemo(
    () => staffRows.filter((s) => s.type === "assistant"),
    [staffRows]
  );

  return (
    <>
      <div className="card kpi-period-card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <strong>{rangeLabel}</strong>
          <button type="button" className="secondary" onClick={() => setWeekMonday((w) => addIsoDays(w, -7))}>
            Tuần trước
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setWeekMonday(getMondaySundayIsoWeekContaining(vietnamTodayIsoDate()).weekStart)}
          >
            Tuần này
          </button>
        </div>
      </div>
      <AttendanceStyleTotalsTable
        sectionTitle="Thợ chính"
        isAssistant={false}
        staffRows={staffRowsMain}
        periodLabel={periodLabel}
        kpiReady={kpiReady}
        kpiRowById={kpiRowById}
        period="week"
        rangeFrom={weekMonday}
        rangeTo={weekEnd}
        selectedBranchId={selectedBranchId}
        periodRangeTitle={`Tuần ${rangeLabel}`}
      />
      <AttendanceStyleTotalsTable
        sectionTitle="Thợ phụ"
        isAssistant
        staffRows={staffRowsAssistant}
        periodLabel={null}
        kpiReady={kpiReady}
        kpiRowById={kpiRowById}
        period="week"
        rangeFrom={weekMonday}
        rangeTo={weekEnd}
        selectedBranchId={selectedBranchId}
        periodRangeTitle={`Tuần ${rangeLabel}`}
      />
    </>
  );
}

/** KPI tháng: tổng các chỉ số chấm công trong tháng. */
export function KpiMonthAttendanceReport({ data, selectedBranchId }) {
  const [month, setMonth] = useState(currentMonth());
  const [kpiRowById, setKpiRowById] = useState(() => new Map());
  const [kpiReady, setKpiReady] = useState(false);
  const [staffVersion, setStaffVersion] = useState(0);

  useEffect(() => {
    setStaffVersion(v => v + 1);
  }, [data.reloadVersion]);

  useEffect(() => {
    if (!selectedBranchId) {
      setKpiRowById(new Map());
      setKpiReady(false);
      return;
    }
    let cancelled = false;
    setKpiReady(false);
    (async () => {
      try {
        const kpiRows = await api.getKpiReport(month, selectedBranchId);
        if (cancelled) return;
        setKpiRowById(new Map(kpiRows.map((r) => [r.id, r])));
        setKpiReady(true);
      } catch {
        if (!cancelled) {
          setKpiRowById(new Map());
          setKpiReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, selectedBranchId, staffVersion]);

  useEffect(() => {
    if (!selectedBranchId) return;
    const POLL_MS = 500;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const kpiRows = await api.getKpiReport(month, selectedBranchId);
        setKpiRowById(new Map(kpiRows.map((r) => [r.id, r])));
        setKpiReady(true);
      } catch {
        /* giữ bảng cũ */
      }
    }
    const id = setInterval(poll, POLL_MS);
    function onVis() {
      if (document.visibilityState === "visible") poll();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [month, selectedBranchId]);

  const staffRows = useMemo(() => {
    if (selectedBranchId == null || selectedBranchId === "") return [];
    const bid = Number(selectedBranchId);
    return data.staff
      .filter(
        (s) =>
          s.status === "working" &&
          Number(s.branchId) === bid &&
          employmentOverlapsMonth(s, month)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [data.staff, selectedBranchId, month]);

  const staffRowsMain = useMemo(
    () => staffRows.filter((s) => s.type === "main"),
    [staffRows]
  );
  const staffRowsAssistant = useMemo(
    () => staffRows.filter((s) => s.type === "assistant"),
    [staffRows]
  );

  const monthRange = useMemo(() => monthStringToIsoRange(month), [month]);

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <AttendanceStyleTotalsTable
        sectionTitle="Thợ chính"
        isAssistant={false}
        staffRows={staffRowsMain}
        periodLabel={null}
        kpiReady={kpiReady}
        kpiRowById={kpiRowById}
        period="month"
        rangeFrom={monthRange.from}
        rangeTo={monthRange.to}
        selectedBranchId={selectedBranchId}
        periodRangeTitle={`Tháng ${month}`}
      />
      <AttendanceStyleTotalsTable
        sectionTitle="Thợ phụ"
        isAssistant
        staffRows={staffRowsAssistant}
        periodLabel={null}
        kpiReady={kpiReady}
        kpiRowById={kpiRowById}
        period="month"
        rangeFrom={monthRange.from}
        rangeTo={monthRange.to}
        selectedBranchId={selectedBranchId}
        periodRangeTitle={`Tháng ${month}`}
      />
    </>
  );
}
