import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "../api/client";
import { currentMonth, fmtMoney, formatViDateShort } from "../utils/format";
import { getMondaySundayIsoWeekContaining, vietnamTodayIsoDate, addIsoDays } from "../utils/vietnamTime";

/** Làm mới nền các bảng chuyển khoản khi tab đang mở (không cần F5). */
const TRANSFER_TABLE_POLL_MS = 20_000;

function SimpleBarChart({ data, xKey, yKey, title, color = "#f0c040" }) {
  if (!data || data.length === 0) {
    return (
      <div className="simple-chart-container">
        <h4>{title}</h4>
        <div className="table-scroll" style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Chưa có dữ liệu
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d[yKey] || 0), 1);
  const height = 200;
  const barWidth = 40;
  const gap = 20;
  const width = data.length * (barWidth + gap) + 40;

  return (
    <div className="simple-chart-container">
      <h4>{title}</h4>
      <div className="table-scroll">
        <svg width={width} height={height + 60} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
          {data.map((d, i) => {
            const val = d[yKey] || 0;
            const barHeight = (val / maxVal) * height;
            const x = 30 + i * (barWidth + gap);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={height - barHeight + 20}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={4}
                />
                <text
                  x={x + barWidth / 2}
                  y={height + 40}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                  transform={`rotate(15, ${x + barWidth / 2}, ${height + 40})`}
                >
                  {d[xKey]}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - barHeight + 15}
                  fill="var(--text-main)"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {yKey === 'total_revenue' ? (val / 1000000).toFixed(1) + 'M' : val}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function SimpleLineChart({ data, xKey, yKey, title, color = "#60a5fa" }) {
  if (!data || data.length === 0) {
    return (
      <div className="simple-chart-container">
        <h4>{title}</h4>
        <div className="table-scroll" style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
          Chưa có dữ liệu theo ngày trong tháng này
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d[yKey] || 0), 1);
  const height = 200;
  const padding = 40;
  const width = Math.max(500, data.length * 40 + padding * 2);
  const xSpan = Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padding + i * ((width - padding * 2) / xSpan);
    const y = height - (d[yKey] / maxVal) * height + 20;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="simple-chart-container">
      <h4>{title}</h4>
      <div className="table-scroll">
        <svg width={width} height={height + 60} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            points={points}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {data.map((d, i) => {
            const x = padding + i * ((width - padding * 2) / xSpan);
            const y = height - (d[yKey] / maxVal) * height + 20;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill={color} />
                <text
                  x={x}
                  y={height + 40}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {d[xKey].slice(-2)}
                </text>
                {i % 2 === 0 && (
                  <text
                    x={x}
                    y={y - 10}
                    fill="var(--text-main)"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {(d[yKey] / 1000000).toFixed(1)}M
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function KpiTransferTable({ title, list, criterion, isPass, amount, type }) {
  return (
    <div className="card kpi-transfer-card" style={{ marginBottom: 20 }}>
      <h4 style={{ marginBottom: 15, color: isPass ? "#34d399" : "#f87171" }}>{title}</h4>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Chi nhánh</th>
              <th>Chỉ số thực tế</th>
              <th>Số tiền thưởng/phạt</th>
              <th>Số tài khoản</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.branch_name || "-"}</td>
                  <td>
                    {type === 'month' ? (
                      <>
                        {criterion === 'revenue' && `${fmtMoney(s.totalRevenue)}đ`}
                        {criterion === 'products' && `${s.totalProducts} sp`}
                      </>
                    ) : (
                      <>
                        {criterion === 'bookings' && `${s.totalBookings} lượt`}
                        {criterion === 'wash' && `${s.totalWash} lượt`}
                        {criterion === 'checkin' && `${s.checkinRate}%`}
                      </>
                    )}
                  </td>
                  <td style={{ color: isPass ? "#34d399" : "#f87171", fontWeight: "bold" }}>
                    {isPass ? "+" : "-"}{fmtMoney(amount)}
                  </td>
                  <td>{s.account_number || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>
                  Chưa có nhân sự
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalaryTransferMonthTable({ title, staffList }) {
  if (staffList.length === 0) return null;
  return (
    <div className="card kpi-transfer-card" style={{ marginBottom: 20 }}>
      <h4 style={{ marginBottom: 15 }}>{title}</h4>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Số tiền cần chuyển</th>
              <th>Số tài khoản</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td style={{ fontWeight: 600 }}>{fmtMoney(r.total)}</td>
                <td>{r.account_number && String(r.account_number).trim() ? r.account_number : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardPage({ data, selectedBranchId }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [month, setMonth] = useState(currentMonth());
  const [weekMonday, setWeekMonday] = useState(() => 
    getMondaySundayIsoWeekContaining(vietnamTodayIsoDate()).weekStart
  );

  const weekRange = useMemo(() => ({
    from: weekMonday,
    to: addIsoDays(weekMonday, 6)
  }), [weekMonday]);

  const [stats, setStats] = useState(null);
  const [weekKpi, setWeekKpi] = useState([]);
  const [monthKpi, setMonthKpi] = useState([]);
  const [salaryTransferBranchId, setSalaryTransferBranchId] = useState(null);
  const [salaryTransferRows, setSalaryTransferRows] = useState([]);
  const [salaryTransferLoading, setSalaryTransferLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffVersion, setStaffVersion] = useState(0);

  useEffect(() => {
    setStaffVersion(v => v + 1);
  }, [data.reloadVersion]);

  const enrichKpiWithBranchNames = useCallback(
    (rows) =>
      rows.map((s) => {
        const b = data.branches.find((br) => br.id === s.branch_id);
        return { ...s, branch_name: b ? b.name : "" };
      }),
    [data.branches]
  );

  const loadWeekTransfer = useCallback(async () => {
    const res = await api.getKpiWeekReport(weekRange.from, weekRange.to);
    setWeekKpi(enrichKpiWithBranchNames(res));
  }, [weekRange, enrichKpiWithBranchNames]);

  const loadMonthTransfer = useCallback(async () => {
    const res = await api.getKpiReport(month);
    setMonthKpi(enrichKpiWithBranchNames(res));
  }, [month, enrichKpiWithBranchNames]);

  const loadSalaryTransfer = useCallback(
    async ({ silent = false } = {}) => {
      if (salaryTransferBranchId == null) return;
      if (!silent) setSalaryTransferLoading(true);
      try {
        const list = await api.getSalaryReport(month, salaryTransferBranchId);
        setSalaryTransferRows(list);
      } catch (err) {
        console.error(err);
        setSalaryTransferRows([]);
      } finally {
        if (!silent) setSalaryTransferLoading(false);
      }
    },
    [month, salaryTransferBranchId]
  );

  useEffect(() => {
    if (activeTab === "overview") {
      setLoading(true);
      api.getDashboardStats(month)
        .then(res => {
          setStats(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else if (activeTab === "transfer") {
      setLoading(true);
      loadWeekTransfer()
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else if (activeTab === "transfer_month") {
      setLoading(true);
      loadMonthTransfer()
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else if (activeTab === "salary_transfer") {
      loadSalaryTransfer({ silent: false });
    }
  }, [month, weekRange, activeTab, data.branches, staffVersion, loadWeekTransfer, loadMonthTransfer, loadSalaryTransfer]);

  useEffect(() => {
    setSalaryTransferBranchId((prev) => {
      if (prev != null && data?.branches?.some((b) => b.id === prev)) return prev;
      return (selectedBranchId || data?.branches?.[0]?.id) ?? null;
    });
  }, [selectedBranchId, data?.branches]);

  /** Luôn làm mới dữ liệu khi đang xem một trong các bảng chuyển khoản (không cần F5). */
  useEffect(() => {
    if (activeTab === "transfer") {
      const id = setInterval(() => {
        loadWeekTransfer().catch((err) => console.error(err));
      }, TRANSFER_TABLE_POLL_MS);
      return () => clearInterval(id);
    }
    if (activeTab === "transfer_month") {
      const id = setInterval(() => {
        loadMonthTransfer().catch((err) => console.error(err));
      }, TRANSFER_TABLE_POLL_MS);
      return () => clearInterval(id);
    }
    if (activeTab === "salary_transfer") {
      const id = setInterval(() => {
        loadSalaryTransfer({ silent: true });
      }, TRANSFER_TABLE_POLL_MS);
      return () => clearInterval(id);
    }
    return undefined;
  }, [activeTab, loadWeekTransfer, loadMonthTransfer, loadSalaryTransfer]);

  const salaryTransferMain = useMemo(
    () => salaryTransferRows.filter((r) => r.type === "main"),
    [salaryTransferRows]
  );
  const salaryTransferAssistant = useMemo(
    () => salaryTransferRows.filter((r) => r.type === "assistant"),
    [salaryTransferRows]
  );

  const activeStaff = data.staff.filter((s) => s.status === "working").length;
  const mainStaff = data.staff.filter((s) => s.type === "main").length;
  const assistantStaff = data.staff.filter((s) => s.type === "assistant").length;

  // Phân loại 10 bảng cho KPI tuần
  const tables = useMemo(() => {
    if (activeTab !== "transfer") return [];
    
    // ... (giữ nguyên logic tables tuần)
    // 1. Phân loại cơ bản
    const getList = (type, criterion, isPass) => 
      weekKpi.filter(s => s.type === type && s.checksActive?.[criterion] && s.checks?.[criterion] === isPass);

    // 2. Tính toán tiền phạt cho từng tiêu chí
    const chemPenaltyRate = 200000;
    const washPenaltyRate = 200000;
    const checkinPenaltyMain = 100000;
    const checkinPenaltyAssistant = 50000;

    // --- THỢ CHÍNH ---
    const mainChemFailed = getList("main", "bookings", false);
    const mainChemPassed = getList("main", "bookings", true);
    const mainCheckinFailed = getList("main", "checkin", false);
    const mainCheckinPassed = getList("main", "checkin", true);

    const mainChemReward = mainChemPassed.length > 0 
      ? Math.floor((mainChemFailed.length * chemPenaltyRate) / mainChemPassed.length) 
      : 0;
    const mainCheckinReward = mainCheckinPassed.length > 0 
      ? Math.floor((mainCheckinFailed.length * checkinPenaltyMain) / mainCheckinPassed.length) 
      : 0;

    // --- THỢ PHỤ ---
    const asstChemFailed = getList("assistant", "bookings", false);
    const asstChemPassed = getList("assistant", "bookings", true);
    const asstWashFailed = getList("assistant", "wash", false);
    const asstWashPassed = getList("assistant", "wash", true);
    const asstCheckinFailed = getList("assistant", "checkin", false);
    const asstCheckinPassed = getList("assistant", "checkin", true);

    const asstChemReward = asstChemPassed.length > 0 
      ? Math.floor((asstChemFailed.length * chemPenaltyRate) / asstChemPassed.length) 
      : 0;
    const asstWashReward = asstWashPassed.length > 0 
      ? Math.floor((asstWashFailed.length * washPenaltyRate) / asstWashPassed.length) 
      : 0;
    const asstCheckinReward = asstCheckinPassed.length > 0 
      ? Math.floor((asstCheckinFailed.length * checkinPenaltyAssistant) / asstCheckinPassed.length) 
      : 0;

    return [
      { title: "Thợ phụ - Đạt KPI Hóa chất", list: asstChemPassed, criterion: "bookings", isPass: true, amount: asstChemReward, type: "week" },
      { title: "Thợ phụ - Không đạt KPI Hóa chất", list: asstChemFailed, criterion: "bookings", isPass: false, amount: chemPenaltyRate, type: "week" },
      
      { title: "Thợ phụ - Đạt KPI Gội", list: asstWashPassed, criterion: "wash", isPass: true, amount: asstWashReward, type: "week" },
      { title: "Thợ phụ - Không đạt KPI Gội", list: asstWashFailed, criterion: "wash", isPass: false, amount: washPenaltyRate, type: "week" },
      
      { title: "Thợ phụ - Đạt KPI Check-in", list: asstCheckinPassed, criterion: "checkin", isPass: true, amount: asstCheckinReward, type: "week" },
      { title: "Thợ phụ - Không đạt KPI Check-in", list: asstCheckinFailed, criterion: "checkin", isPass: false, amount: checkinPenaltyAssistant, type: "week" },
      
      { title: "Thợ chính - Đạt KPI Hóa chất", list: mainChemPassed, criterion: "bookings", isPass: true, amount: mainChemReward, type: "week" },
      { title: "Thợ chính - Không đạt KPI Hóa chất", list: mainChemFailed, criterion: "bookings", isPass: false, amount: chemPenaltyRate, type: "week" },
      
      { title: "Thợ chính - Đạt KPI Check-in", list: mainCheckinPassed, criterion: "checkin", isPass: true, amount: mainCheckinReward, type: "week" },
      { title: "Thợ chính - Không đạt KPI Check-in", list: mainCheckinFailed, criterion: "checkin", isPass: false, amount: checkinPenaltyMain, type: "week" },
    ];
  }, [weekKpi, activeTab]);

  // Phân loại bảng cho KPI tháng
  const monthTables = useMemo(() => {
    if (activeTab !== "transfer_month") return [];

    const getList = (type, criterion, isPass) => 
      monthKpi.filter(s => s.type === type && s.checksActive?.[criterion] && s.checks?.[criterion] === isPass);

    const penaltyRate = 300000;

    // --- THỢ CHÍNH ---
    const mainRevFailed = getList("main", "revenue", false);
    const mainRevPassed = getList("main", "revenue", true);
    const mainProdFailed = getList("main", "products", false);
    const mainProdPassed = getList("main", "products", true);

    const mainRevReward = mainRevPassed.length > 0 
      ? Math.floor((mainRevFailed.length * penaltyRate) / mainRevPassed.length) : 0;
    const mainProdReward = mainProdPassed.length > 0 
      ? Math.floor((mainProdFailed.length * penaltyRate) / mainProdPassed.length) : 0;

    // --- THỢ PHỤ ---
    const asstRevFailed = getList("assistant", "revenue", false);
    const asstRevPassed = getList("assistant", "revenue", true);
    const asstProdFailed = getList("assistant", "products", false);
    const asstProdPassed = getList("assistant", "products", true);

    const asstRevReward = asstRevPassed.length > 0 
      ? Math.floor((asstRevFailed.length * penaltyRate) / asstRevPassed.length) : 0;
    const asstProdReward = asstProdPassed.length > 0 
      ? Math.floor((asstProdFailed.length * penaltyRate) / asstProdPassed.length) : 0;

    return [
      { title: "Thợ chính - Đạt KPI Doanh thu tháng", list: mainRevPassed, criterion: "revenue", isPass: true, amount: mainRevReward, type: "month" },
      { title: "Thợ chính - Không đạt KPI Doanh thu tháng", list: mainRevFailed, criterion: "revenue", isPass: false, amount: penaltyRate, type: "month" },
      
      { title: "Thợ chính - Đạt KPI Sản phẩm tháng", list: mainProdPassed, criterion: "products", isPass: true, amount: mainProdReward, type: "month" },
      { title: "Thợ chính - Không đạt KPI Sản phẩm tháng", list: mainProdFailed, criterion: "products", isPass: false, amount: penaltyRate, type: "month" },

      { title: "Thợ phụ - Đạt KPI Doanh thu tháng", list: asstRevPassed, criterion: "revenue", isPass: true, amount: asstRevReward, type: "month" },
      { title: "Thợ phụ - Không đạt KPI Doanh thu tháng", list: asstRevFailed, criterion: "revenue", isPass: false, amount: penaltyRate, type: "month" },
      
      { title: "Thợ phụ - Đạt KPI Sản phẩm tháng", list: asstProdPassed, criterion: "products", isPass: true, amount: asstProdReward, type: "month" },
      { title: "Thợ phụ - Không đạt KPI Sản phẩm tháng", list: asstProdFailed, criterion: "products", isPass: false, amount: penaltyRate, type: "month" },
    ];
  }, [monthKpi, activeTab]);

  return (
    <>
      <div className="card attendance-tabs-card" style={{ marginBottom: 16 }}>
        <div className="attendance-page-tabs">
          <button
            type="button"
            className={activeTab === "overview" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setActiveTab("overview")}
          >
            Quan sát tổng quan
          </button>
          <button
            type="button"
            className={activeTab === "transfer" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setActiveTab("transfer")}
          >
            Bảng chuyển khoản KPI tuần
          </button>
          <button
            type="button"
            className={activeTab === "transfer_month" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setActiveTab("transfer_month")}
          >
            Bảng chuyển khoản KPI tháng
          </button>
          <button
            type="button"
            className={activeTab === "salary_transfer" ? "attendance-tab active" : "attendance-tab"}
            onClick={() => setActiveTab("salary_transfer")}
          >
            Bảng chuyển khoản lương tháng
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-title">{"Chi nhánh"}</div><div className="stat-value">{data.branches.length}</div></div>
            <div className="stat-card"><div className="stat-title">{"Nhân sự hoạt động"}</div><div className="stat-value">{activeStaff}</div></div>
            <div className="stat-card"><div className="stat-title">{"Thợ chính"}</div><div className="stat-value">{mainStaff}</div></div>
            <div className="stat-card"><div className="stat-title">{"Thợ phụ"}</div><div className="stat-value">{assistantStaff}</div></div>
          </div>

          <div className="card">
            <div className="page-header" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Phân tích tổng quan hệ thống</h3>
              <div className="row" style={{ margin: 0 }}>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                <span className="muted">{loading ? "Đang tải dữ liệu..." : "Đã đồng bộ"}</span>
              </div>
            </div>

            {stats && data.branches.length === 0 ? (
              <p className="muted" style={{ textAlign: "center", padding: "24px 12px" }}>
                Chưa có chi nhánh — thêm chi nhánh (mục lọc / quản lý chi nhánh) để xem biểu đồ doanh thu và sản phẩm theo chi nhánh, cùng biến động theo ngày.
              </p>
            ) : stats ? (
              <div className="dashboard-charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="chart-item card" style={{ background: "rgba(0,0,0,0.1)", marginBottom: 0 }}>
                  <SimpleBarChart 
                    data={stats.branchStats} 
                    xKey="branch_name" 
                    yKey="total_revenue" 
                    title="Doanh thu khách đặt lịch theo chi nhánh (Triệu VNĐ)" 
                    color="#f0c040"
                  />
                </div>
                <div className="chart-item card" style={{ background: "rgba(0,0,0,0.1)", marginBottom: 0 }}>
                  <SimpleBarChart 
                    data={stats.branchStats} 
                    xKey="branch_name" 
                    yKey="total_products" 
                    title="Sản phẩm theo chi nhánh" 
                    color="#34d399"
                  />
                </div>
                <div className="chart-item card" style={{ background: "rgba(0,0,0,0.1)", marginBottom: 0, gridColumn: "span 2" }}>
                  <SimpleLineChart 
                    data={stats.dailyStats} 
                    xKey="date" 
                    yKey="total_revenue" 
                    title="Biến động doanh thu khách đặt lịch toàn hệ thống (Triệu VNĐ)" 
                    color="#60a5fa"
                  />
                </div>
              </div>
            ) : null}

            {data.error ? <p className="muted">{data.error}</p> : null}
          </div>
        </>
      ) : activeTab === "transfer" ? (
        <div className="salary-transfer-container">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: 0 }}>Chi tiết chuyển khoản KPI Tuần</h3>
              <div className="row" style={{ margin: 0, gap: 10 }}>
                <strong style={{ marginRight: 10 }}>{formatViDateShort(weekRange.from)} – {formatViDateShort(weekRange.to)}</strong>
                <button type="button" className="secondary" onClick={() => setWeekMonday(prev => addIsoDays(prev, -7))}>Tuần trước</button>
                <button type="button" className="secondary" onClick={() => setWeekMonday(getMondaySundayIsoWeekContaining(vietnamTodayIsoDate()).weekStart)}>Tuần này</button>
                <button type="button" className="secondary" onClick={() => setWeekMonday(prev => addIsoDays(prev, 7))}>Tuần sau</button>
                <input 
                  type="date" 
                  value={weekMonday} 
                  onChange={(e) => setWeekMonday(getMondaySundayIsoWeekContaining(e.target.value).weekStart)} 
                  style={{ width: 140 }}
                />
                <span className="muted" style={{ marginLeft: 10 }}>{loading ? "Đang tính..." : `Đã tải ${weekKpi.length} NV`}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {tables.map((t, idx) => (
              <KpiTransferTable key={idx} {...t} />
            ))}
          </div>
        </div>
      ) : activeTab === "transfer_month" ? (
        <div className="salary-transfer-container">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h3 style={{ margin: 0 }}>Chi tiết chuyển khoản KPI Tháng</h3>
              <div className="row" style={{ margin: 0, gap: 10 }}>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                <span className="muted" style={{ marginLeft: 10 }}>{loading ? "Đang tính..." : `Đã tải ${monthKpi.length} NV`}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-charts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {monthTables.map((t, idx) => (
              <KpiTransferTable key={idx} {...t} />
            ))}
          </div>
        </div>
      ) : (
        <div className="salary-transfer-container">
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 0, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ margin: 0 }}>Chuyển khoản lương theo chi nhánh</h3>
              <div className="row" style={{ margin: 0, alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="muted" style={{ marginRight: 8 }}>Tháng:</label>
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="muted" style={{ marginRight: 8 }}>Chi nhánh:</label>
                  <select
                    value={salaryTransferBranchId ?? ""}
                    onChange={(e) => setSalaryTransferBranchId(Number(e.target.value))}
                    disabled={!data?.branches?.length}
                  >
                    {(data?.branches || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="muted">
                  {salaryTransferLoading ? "Đang tải..." : `Đã tải ${salaryTransferRows.length} nhân viên`}
                </span>
              </div>
            </div>
          </div>
          {!data?.branches?.length ? (
            <div className="card">
              <p className="muted">Chưa có chi nhánh — thêm chi nhánh ở mục Quản lý chi nhánh để dùng bảng chuyển khoản.</p>
            </div>
          ) : salaryTransferRows.length === 0 && !salaryTransferLoading ? (
            <div className="card">
              <p className="muted">Không có nhân viên trong phạm vi tháng này cho chi nhánh đã chọn.</p>
            </div>
          ) : (
            <>
              <SalaryTransferMonthTable title="Thợ chính" staffList={salaryTransferMain} />
              <SalaryTransferMonthTable title="Thợ phụ" staffList={salaryTransferAssistant} />
            </>
          )}
        </div>
      )}
    </>
  );
}
