import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export function KpiConfigPage({ data, selectedBranchId }) {
  const [baseCfg, setBaseCfg] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formCfg, setFormCfg] = useState(null);

  const branchStaff = useMemo(
    () => data.staff.filter((s) => s.branchId === selectedBranchId),
    [data.staff, selectedBranchId]
  );

  useEffect(() => {
    api.getKpiConfig().then(setBaseCfg);
  }, []);

  useEffect(() => {
    if (!selectedStaffId || !baseCfg) {
      setFormCfg(null);
      setStartDate("");
      setEndDate("");
      return;
    }
    const staff = branchStaff.find((s) => s.id === Number(selectedStaffId));
    const fallbackCfg = JSON.parse(JSON.stringify(baseCfg[staff.type]));
    api.getStaffKpiSetting(selectedStaffId).then((setting) => {
      setStartDate(setting?.startDate || new Date().toISOString().slice(0, 10));
      setEndDate(setting?.endDate || "");
      setFormCfg(setting?.config || fallbackCfg);
    });
  }, [selectedStaffId, baseCfg, branchStaff]);

  function updateField(key, value) {
    setFormCfg((prev) => ({ ...prev, [key]: Number(value) }));
  }

  async function handleSave() {
    if (!selectedStaffId || !formCfg || !startDate) return;
    await api.saveStaffKpiSetting({
      staffId: Number(selectedStaffId),
      startDate,
      endDate: endDate || null,
      config: formCfg
    });
    alert("Đã lưu KPI cho nhân viên.");
  }

  return (
    <div className="card">
      <div className="page-header"><h3>Cài đặt KPI theo nhân viên</h3></div>

      <div className="row" style={{ marginBottom: 12 }}>
        <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
          <option value="">Chọn nhân viên của chi nhánh đang lọc</option>
          {branchStaff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {!selectedStaffId && <p className="muted">Vui lòng chọn nhân viên trước khi cài đặt KPI.</p>}

      {selectedStaffId && formCfg && (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="muted">Ngày bắt đầu</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <label className="muted">Ngày kết thúc (có thể để trống)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="row">
            <label className="muted">Lịch đặt tháng</label>
            <input type="number" value={formCfg.monthlyBookings || 0} onChange={(e) => updateField("monthlyBookings", e.target.value)} />
            <label className="muted">Check-in thang (%)</label>
            <input type="number" value={formCfg.monthlyCheckinRate || 0} onChange={(e) => updateField("monthlyCheckinRate", e.target.value)} />
            {formCfg.weeklyWash !== undefined && (
              <>
                <label className="muted">KPI gội tuần</label>
                <input type="number" value={formCfg.weeklyWash || 0} onChange={(e) => updateField("weeklyWash", e.target.value)} />
              </>
            )}
            {formCfg.monthlyRevenue !== undefined && (
              <>
                <label className="muted">Doanh thu tháng</label>
                <input type="number" value={formCfg.monthlyRevenue || 0} onChange={(e) => updateField("monthlyRevenue", e.target.value)} />
              </>
            )}
            <button className="primary" onClick={handleSave}>Lưu KPI</button>
          </div>
        </>
      )}
    </div>
  );
}
