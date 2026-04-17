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
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function getCccdImageUrl(staffId) {
  return `${API_URL}/staff-personal-info/cccd-image/${staffId}`;
}

export const api = {
  getBranches: () => request("/branches"),
  createBranch: (payload) => request("/branches", { method: "POST", body: JSON.stringify(payload) }),
  deleteBranch: (branchId) => request(`/branches/${branchId}`, { method: "DELETE" }),
  getStaff: () => request("/staff"),
  createStaff: (payload) => request("/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => request(`/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: "DELETE" }),
  getStaffPersonalInfo: (branchId, staffId) =>
    request(`/staff-personal-info?${branchId ? `branchId=${branchId}` : ""}${branchId && staffId ? "&" : ""}${staffId ? `staffId=${staffId}` : ""}`),
  saveStaffPersonalInfo: (payload) => request("/staff-personal-info", { method: "PUT", body: JSON.stringify(payload) }),
  uploadCccdImage: async (staffId, file) => {
    const fd = new FormData();
    fd.append("staffId", String(staffId));
    fd.append("file", file);
    const res = await fetch(`${API_URL}/staff-personal-info/cccd-upload`, { method: "POST", body: fd });
    if (!res.ok) {
      let msg = `API error: ${res.status}`;
      try {
        const j = await res.json();
        if (j.message) msg = j.message;
      } catch (_) {}
      throw new Error(msg);
    }
    return res.json();
  },
  getAttendanceByDate: (date, branchId) =>
    request(
      `/attendance?date=${encodeURIComponent(date)}${branchId != null && branchId !== "" ? `&branchId=${encodeURIComponent(branchId)}` : ""}`
    ),
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
