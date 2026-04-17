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
  getStaff: () => request("/staff"),
  createStaff: (payload) => request("/staff", { method: "POST", body: JSON.stringify(payload) }),
  getAttendanceByDate: (date) => request(`/attendance?date=${date}`),
  saveAttendance: (payload) => request("/attendance", { method: "PUT", body: JSON.stringify(payload) }),
  getKpiReport: (month) => request(`/reports/kpi?month=${month}`),
  getSalaryReport: (month) => request(`/reports/salary?month=${month}`),
  addSalaryAdjustment: (payload) => request("/salary-adjustments", { method: "POST", body: JSON.stringify(payload) }),
  saveSalaryBonusSet: (payload) => request("/salary-adjustments/bulk", { method: "PUT", body: JSON.stringify(payload) }),
  getKpiConfig: () => request("/kpi-config"),
  saveKpiConfig: (payload) => request("/kpi-config", { method: "PUT", body: JSON.stringify(payload) })
};
