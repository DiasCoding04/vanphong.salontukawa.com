export const API_BASE_URL = "http://localhost:4000";
const API_URL = `${API_BASE_URL}/api`;

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try {
      const j = await res.json();
      if (j.message) msg = j.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getCccdImageUrl(staffId) {
  return `${API_URL}/staff-personal-info/cccd-image/${staffId}`;
}

export const api = {
  getBranches: () => request(`/branches?_t=${Date.now()}`),
  createBranch: (payload) => request("/branches", { method: "POST", body: JSON.stringify(payload) }),
  deleteBranch: (branchId) => request(`/branches/${branchId}`, { method: "DELETE" }),
  getStaff: () => request(`/staff?_t=${Date.now()}`),
  createStaff: (payload) => request("/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => request(`/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: "DELETE" }),
  getStaffPersonalInfo: (branchId, staffId) =>
    request(`/staff-personal-info?_t=${Date.now()}${branchId ? `&branchId=${branchId}` : ""}${staffId ? `&staffId=${staffId}` : ""}`),
  saveStaffPersonalInfo: (payload) => request("/staff-personal-info", { method: "PUT", body: JSON.stringify(payload) }),
  uploadCccdImage: async (staffId, file) => {
    const fd = new FormData();
    fd.append("staffId", String(staffId));
    fd.append("file", file);
    return request(`/staff-personal-info/cccd-upload?_t=${Date.now()}`, { method: "POST", body: fd });
  },
  getAttendanceByDate: (date, branchId) =>
    request(
      `/attendance?_t=${Date.now()}&date=${encodeURIComponent(date)}${branchId != null && branchId !== "" ? `&branchId=${encodeURIComponent(branchId)}` : ""}`
    ),
  getAttendanceByMonth: (month, branchId) =>
    request(
      `/attendance?_t=${Date.now()}&month=${encodeURIComponent(month)}${branchId != null && branchId !== "" ? `&branchId=${encodeURIComponent(branchId)}` : ""}`
    ),
  getAttendanceByRange: (from, to, branchId) =>
    request(
      `/attendance?_t=${Date.now()}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
        branchId != null && branchId !== "" ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }`
    ),
  saveAttendance: (payload) => request("/attendance", { method: "PUT", body: JSON.stringify(payload) }),
  getKpiReport: (month, branchId) => request(`/reports/kpi?_t=${Date.now()}&month=${month}${branchId ? `&branchId=${branchId}` : ""}`),
  getDashboardStats: (month) => request(`/reports/dashboard?_t=${Date.now()}&month=${month}`),
  getKpiWeekReport: (from, to, branchId) =>
    request(
      `/reports/kpi-week?_t=${Date.now()}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
        branchId != null && branchId !== "" ? `&branchId=${encodeURIComponent(branchId)}` : ""
      }`
    ),
  getSalaryReport: (month, branchId) => request(`/reports/salary?_t=${Date.now()}&month=${month}${branchId ? `&branchId=${branchId}` : ""}`),
  applyMonthlyHoldDeductions: (payload) => request("/hold-deductions/apply-month", { method: "POST", body: JSON.stringify(payload) }),
  addSalaryAdjustment: (payload) => request("/salary-adjustments", { method: "POST", body: JSON.stringify(payload) }),
  updateSalaryAdjustment: (id, payload) => request(`/salary-adjustments/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSalaryAdjustment: (id) => request(`/salary-adjustments/${id}`, { method: "DELETE" }),
  getSalaryAdjustments: (params = {}) => {
    const q = new URLSearchParams();
    if (params.month) q.set("month", params.month);
    if (params.staffId != null && params.staffId !== "") q.set("staffId", String(params.staffId));
    if (params.type) q.set("type", params.type);
    q.set("_t", String(Date.now()));
    const s = q.toString();
    return request(`/salary-adjustments${s ? `?${s}` : ""}`);
  },
  saveSalaryBonusSet: (payload) => request("/salary-adjustments/bulk", { method: "PUT", body: JSON.stringify(payload) }),
  getKpiConfig: () => request(`/kpi-config?_t=${Date.now()}`),
  saveKpiConfig: (payload) => request("/kpi-config", { method: "PUT", body: JSON.stringify(payload) }),
  getStaffKpiSetting: (staffId) => request(`/staff-kpi-settings?_t=${Date.now()}&staffId=${staffId}`),
  saveStaffKpiSetting: (payload) => request("/staff-kpi-settings", { method: "PUT", body: JSON.stringify(payload) }),
  getManagerKpiStaff: (branchId) => request(`/manager-kpi-staff?_t=${Date.now()}&branchId=${encodeURIComponent(branchId)}`),
  addManagerKpiStaff: (payload) => request("/manager-kpi-staff", { method: "POST", body: JSON.stringify(payload) }),
  removeManagerKpiStaff: (staffId) => request(`/manager-kpi-staff/${staffId}`, { method: "DELETE" }),
  getCrossBranchBookings: (params) => {
    let url = `/cross-branch-bookings?_t=${Date.now()}&serviceBranchId=${params.serviceBranchId}`;
    if (params.date) url += `&date=${params.date}`;
    if (params.month) url += `&month=${params.month}`;
    return request(url);
  },
  addCrossBranchBooking: (payload) => request("/cross-branch-bookings", { method: "POST", body: JSON.stringify(payload) }),
  updateCrossBranchBooking: (id, payload) => request(`/cross-branch-bookings/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCrossBranchBooking: (id) => request(`/cross-branch-bookings/${id}`, { method: "DELETE" }),
  getDailyReports: (date, branchId) =>
    request(
      `/daily-reports?_t=${Date.now()}&date=${encodeURIComponent(date)}&branchId=${encodeURIComponent(branchId)}`
    ),
  saveDailyReports: (payload) => request("/daily-reports", { method: "PUT", body: JSON.stringify(payload) })
};
