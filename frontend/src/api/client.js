const API_URL = "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getBranches: () => request("/branches"),
  createBranch: (payload) => request("/branches", { method: "POST", body: JSON.stringify(payload) }),
  deleteBranch: (branchId) => request(`/branches/${branchId}`, { method: "DELETE" }),
  getStaff: () => request("/staff"),
  createStaff: (payload) => request("/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => request(`/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: "DELETE" }),
  getAttendanceByDate: (date) => request(`/attendance?date=${date}`),
  saveAttendance: (payload) => request("/attendance", { method: "PUT", body: JSON.stringify(payload) }),
  getKpiReport: (month, branchId) => request(`/reports/kpi?month=${month}${branchId ? `&branchId=${branchId}` : ""}`),
  getSalaryReport: (month, branchId) => request(`/reports/salary?month=${month}${branchId ? `&branchId=${branchId}` : ""}`),
  applyMonthlyHoldDeductions: (payload) => request("/hold-deductions/apply-month", { method: "POST", body: JSON.stringify(payload) }),
  addSalaryAdjustment: (payload) => request("/salary-adjustments", { method: "POST", body: JSON.stringify(payload) }),
  saveSalaryBonusSet: (payload) => request("/salary-adjustments/bulk", { method: "PUT", body: JSON.stringify(payload) }),
  getKpiConfig: () => request("/kpi-config"),
  saveKpiConfig: (payload) => request("/kpi-config", { method: "PUT", body: JSON.stringify(payload) }),
  getStaffKpiSetting: (staffId) => request(`/staff-kpi-settings?staffId=${staffId}`),
  saveStaffKpiSetting: (payload) => request("/staff-kpi-settings", { method: "PUT", body: JSON.stringify(payload) })
};
