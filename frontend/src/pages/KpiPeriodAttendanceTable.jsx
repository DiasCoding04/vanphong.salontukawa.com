import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import {
  addIsoDays,
  employmentOverlapsIsoRange,
  employmentOverlapsMonth,
  getMondaySundayIsoWeekContaining,
  vietnamTodayIsoDate
} from "../utils/vietnamTime";
import { currentMonth, formatCheckinRatePct } from "../utils/format";

function formatVnd(n) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("vi-VN")} đ`;
}

/** dd/mm/yyyy từ YYYY-MM-DD */
function isoToViDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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
  period
}) {
  const emptyMsg = isAssistant ? "Không có thợ phụ trong chi nhánh." : "Không có thợ chính trong chi nhánh.";
  const showWashColumn = isAssistant && period === "week";
  /* 8 cột thợ chính (+1 cột gội nếu thợ phụ) — khớp colgroup/colspan, tránh ô trống bên phải */
  const colCount = showWashColumn ? 9 : 8;

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
                    <td>{s.name}</td>
                    <td>{`${presentDays} ngày có mặt`}</td>
                    <td>{totalClients}</td>
                    <td>{totalCheckins}</td>
                    <td className={kpiCellBgClass(kpiReady, checks, checksActive, "checkin")}>
                      {formatCheckinRatePct(totalClients, totalCheckins)}
                    </td>
                    <td className={kpiCellBgClass(kpiReady, checks, checksActive, "bookings")}>
                      {m?.totalBookings ?? 0}
                    </td>
                    {showWashColumn ? (
                      <td className={kpiCellBgClass(kpiReady, checks, checksActive, "wash")}>{m?.totalWash ?? 0}</td>
                    ) : null}
                    <td className={kpiCellBgClass(kpiReady, checks, checksActive, "products")}>
                      {m?.totalProducts ?? 0}
                    </td>
                    <td className={kpiCellBgClass(kpiReady, checks, checksActive, "revenue")}>
                      {formatVnd(m?.totalRevenue ?? 0)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** KPI tuần: tổng cả tuần (Thứ Hai–Chủ nhật), không chọn “một ngày trong tuần”. */
export function KpiWeekAttendanceReport({ data, selectedBranchId }) {
  const [weekMonday, setWeekMonday] = useState(
    () => getMondaySundayIsoWeekContaining(vietnamTodayIsoDate()).weekStart
  );
  const [kpiRowById, setKpiRowById] = useState(() => new Map());
  const [kpiReady, setKpiReady] = useState(false);

  const weekEnd = useMemo(() => addIsoDays(weekMonday, 6), [weekMonday]);

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

  const rangeLabel = `${isoToViDate(weekMonday)} – ${isoToViDate(weekEnd)}`;
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
      />
      <AttendanceStyleTotalsTable
        sectionTitle="Thợ phụ"
        isAssistant
        staffRows={staffRowsAssistant}
        periodLabel={null}
        kpiReady={kpiReady}
        kpiRowById={kpiRowById}
        period="week"
      />
    </>
  );
}

/** KPI tháng: tổng các chỉ số chấm công trong tháng. */
export function KpiMonthAttendanceReport({ data, selectedBranchId }) {
  const [month, setMonth] = useState(currentMonth());
  const [kpiRowById, setKpiRowById] = useState(() => new Map());
  const [kpiReady, setKpiReady] = useState(false);

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
      />
      <AttendanceStyleTotalsTable
        sectionTitle="Thợ phụ"
        isAssistant
        staffRows={staffRowsAssistant}
        periodLabel={null}
        kpiReady={kpiReady}
        kpiRowById={kpiRowById}
        period="month"
      />
    </>
  );
}
