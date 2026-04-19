import { useEffect, useMemo, useRef, useState } from "react";
import { api, getCccdImageUrl } from "../api/client";
import { isBirthdayOnVietnamCalendarDay, vietnamTomorrowParts } from "../utils/vietnamTime";
import { formatViDateShort } from "../utils/format";

const emptyForm = {
  staffId: "",
  phone: "",
  nationalId: "",
  birthDate: "",
  hometown: ""
};

function parseBirthDate(value) {
  if (!value) return { day: "", month: "", year: "" };
  const slashMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return { day: slashMatch[1], month: slashMatch[2], year: slashMatch[3] };
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return { day: isoMatch[3], month: isoMatch[2], year: isoMatch[1] };
  }
  return { day: "", month: "", year: "" };
}

function isValidBirthDate(day, month, year) {
  if (!day && !month && !year) return true;
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return false;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || y < 1900 || y > 2100) return false;
  const maxDay = new Date(y, m, 0).getDate();
  return d >= 1 && d <= maxDay;
}

export function PersonalInfoPage({ data, selectedBranchId }) {
  const [form, setForm] = useState(emptyForm);
  const [birth, setBirth] = useState({ day: "", month: "", year: "" });
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cccdOverlayStaffId, setCccdOverlayStaffId] = useState(null);
  const [uploadingCccd, setUploadingCccd] = useState(false);
  const birthRefs = useRef([]);
  const cccdFileRef = useRef(null);

  const branchStaff = useMemo(() => {
    const bid = Number(selectedBranchId);
    return data.staff.filter((s) => Number(s.branchId) === bid);
  }, [data.staff, selectedBranchId]);

  const { activePersonalRows, leftPersonalRows } = useMemo(() => {
    const active = [];
    const left = [];
    for (const row of rows) {
      const id = Number(row.staffId);
      const s = data.staff.find((x) => Number(x.id) === id);
      if (s?.status === "left") left.push(row);
      else active.push(row);
    }
    return { activePersonalRows: active, leftPersonalRows: left };
  }, [rows, data.staff]);

  const birthdayTomorrowStaffIds = useMemo(() => {
    const { month, day } = vietnamTomorrowParts();
    const ids = new Set();
    for (const row of rows) {
      if (isBirthdayOnVietnamCalendarDay(row.birthDate, month, day)) {
        ids.add(Number(row.staffId));
      }
    }
    return ids;
  }, [rows]);

  const selectedHasCccd = useMemo(() => {
    const r = rows.find((x) => Number(x.staffId) === Number(form.staffId));
    return Boolean(r?.hasCccdImage);
  }, [rows, form.staffId]);

  function staffName(staffId) {
    const id = Number(staffId);
    return branchStaff.find((s) => Number(s.id) === id)?.name || `#${id}`;
  }

  function handleEditRow(staffId) {
    setError("");
    handlePickStaff(String(staffId));
  }

  function renderSavedTable(title, list) {
    return (
      <div className="card">
        <div className="page-header">
          <h3>
            {title} ({list.length})
          </h3>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Tên nhân sự</th>
                <th>SĐT</th>
                <th>CCCD</th>
                <th className="col-allow-wrap">Ảnh CCCD</th>
                <th>Ngày sinh</th>
                <th>Quê quán</th>
                <th className="col-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const highlight = birthdayTomorrowStaffIds.has(Number(row.staffId));
                return (
                <tr key={row.staffId} className={highlight ? "birthday-soon-row" : undefined}>
                  <td>
                    {highlight && (
                      <span className="birthday-soon-inline" title="Sinh nhật vào ngày mai (theo giờ Việt Nam)">
                        Sinh nhật ngày mai
                      </span>
                    )}
                    {staffName(row.staffId)}
                  </td>
                  <td>{row.phone || "-"}</td>
                  <td>{row.nationalId || "-"}</td>
                  <td className="col-allow-wrap">
                    {row.hasCccdImage ? (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setCccdOverlayStaffId(Number(row.staffId))}
                      >
                        Xem CCCD
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{row.birthDate ? formatViDateShort(row.birthDate) : "-"}</td>
                  <td>{row.hometown || "-"}</td>
                  <td className="col-actions">
                    <button type="button" className="icon-btn" title="Sửa" onClick={() => handleEditRow(row.staffId)}>
                      ✏️
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!selectedBranchId) return;
    api
      .getStaffPersonalInfo(selectedBranchId)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [selectedBranchId]);

  useEffect(() => {
    if (cccdOverlayStaffId == null) return;
    function onKey(e) {
      if (e.key === "Escape") setCccdOverlayStaffId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cccdOverlayStaffId]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePickStaff(staffId) {
    if (!staffId) {
      setForm(emptyForm);
      setBirth({ day: "", month: "", year: "" });
      return;
    }
    api
      .getStaffPersonalInfo(selectedBranchId, staffId)
      .then((items) => {
        const found = items[0];
        if (!found) {
          setForm({ ...emptyForm, staffId });
          setBirth({ day: "", month: "", year: "" });
          return;
        }
        setForm({
          staffId: String(found.staffId),
          phone: found.phone || "",
          nationalId: found.nationalId || "",
          birthDate: found.birthDate || "",
          hometown: found.hometown || ""
        });
        setBirth(parseBirthDate(found.birthDate || ""));
        setRows((prev) => {
          const id = Number(found.staffId);
          const filtered = prev.filter((r) => Number(r.staffId) !== id);
          return [...filtered, found].sort((a, b) => Number(a.staffId) - Number(b.staffId));
        });
      })
      .catch((err) => setError(err.message));
  }

  function focusBirthIndex(index) {
    birthRefs.current[index]?.focus();
  }

  function handleBirthChange(part, raw, maxLength, nextIndex) {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, maxLength);
    setBirth((prev) => {
      const next = { ...prev, [part]: digitsOnly };
      setField(
        "birthDate",
        next.day && next.month && next.year ? `${next.day}/${next.month}/${next.year}` : ""
      );
      return next;
    });
    if (digitsOnly.length === maxLength && nextIndex !== null) {
      focusBirthIndex(nextIndex);
    }
  }

  function handleBirthKeyDown(event, index, part) {
    if (event.key === "ArrowRight" && index < 2) {
      event.preventDefault();
      focusBirthIndex(index + 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBirthIndex(index - 1);
      return;
    }
    if (event.key === "Backspace" && !birth[part] && index > 0) {
      focusBirthIndex(index - 1);
    }
  }

  async function handleCccdFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !form.staffId) return;
    setUploadingCccd(true);
    setError("");
    try {
      await api.uploadCccdImage(Number(form.staffId), file);
      const updated = await api.getStaffPersonalInfo(selectedBranchId);
      setRows(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingCccd(false);
    }
  }

  async function handleSave() {
    if (!form.staffId) {
      setError("Vui lòng chọn nhân viên.");
      return;
    }
    if (!form.nationalId.trim()) {
      setError("Vui lòng nhập CCCD.");
      return;
    }
    if (!birth.day || !birth.month || !birth.year) {
      setError("Vui lòng nhập đủ ngày sinh (DD/MM/YYYY).");
      return;
    }
    if (!isValidBirthDate(birth.day, birth.month, birth.year)) {
      setError("Ngày sinh không hợp lệ (định dạng DD/MM/YYYY).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.saveStaffPersonalInfo({
        staffId: Number(form.staffId),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        birthDate: birth.day && birth.month && birth.year ? `${birth.day}/${birth.month}/${birth.year}` : "",
        hometown: form.hometown.trim()
      });
      const updated = await api.getStaffPersonalInfo(selectedBranchId);
      setRows(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="page-header">
          <h3>Thông tin cá nhân</h3>
        </div>
        {form.staffId && birthdayTomorrowStaffIds.has(Number(form.staffId)) && (
          <p className="birthday-soon-form-banner">
            Nhân viên này có sinh nhật vào ngày mai (theo giờ Việt Nam).
          </p>
        )}
        <div className="form-grid">
          <label className="field">
            <span className="muted">Nhân viên *</span>
            <select value={form.staffId} onChange={(e) => handlePickStaff(e.target.value)}>
              <option value="">— Chọn nhân viên —</option>
              {branchStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {birthdayTomorrowStaffIds.has(Number(s.id)) ? "🎂 " : ""}
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="muted">SĐT</span>
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </label>
          <label className="field">
            <span className="muted">CCCD *</span>
            <input value={form.nationalId} onChange={(e) => setField("nationalId", e.target.value)} />
          </label>
          <label className="field">
            <span className="muted">Ngày sinh *</span>
            <div className="row" style={{ gap: 6 }}>
              <input
                ref={(el) => {
                  birthRefs.current[0] = el;
                }}
                value={birth.day}
                onChange={(e) => handleBirthChange("day", e.target.value, 2, 1)}
                onKeyDown={(e) => handleBirthKeyDown(e, 0, "day")}
                placeholder="DD"
                inputMode="numeric"
                style={{ width: 64 }}
              />
              <span>/</span>
              <input
                ref={(el) => {
                  birthRefs.current[1] = el;
                }}
                value={birth.month}
                onChange={(e) => handleBirthChange("month", e.target.value, 2, 2)}
                onKeyDown={(e) => handleBirthKeyDown(e, 1, "month")}
                placeholder="MM"
                inputMode="numeric"
                style={{ width: 64 }}
              />
              <span>/</span>
              <input
                ref={(el) => {
                  birthRefs.current[2] = el;
                }}
                value={birth.year}
                onChange={(e) => handleBirthChange("year", e.target.value, 4, null)}
                onKeyDown={(e) => handleBirthKeyDown(e, 2, "year")}
                placeholder="YYYY"
                inputMode="numeric"
                style={{ width: 88 }}
              />
            </div>
          </label>
          <label className="field">
            <span className="muted">Quê quán</span>
            <input value={form.hometown} onChange={(e) => setField("hometown", e.target.value)} />
          </label>
          <div className="field cccd-upload-field">
            <span className="muted">Ảnh CCCD</span>
            <div className="cccd-upload-actions">
              <input
                id="personal-cccd-file"
                ref={cccdFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only-file"
                disabled={!form.staffId || uploadingCccd}
                onChange={handleCccdFileChange}
              />
              <label
                htmlFor="personal-cccd-file"
                className={`cccd-file-trigger${!form.staffId || uploadingCccd ? " is-disabled" : ""}`}
                title={!form.staffId ? "Chọn nhân viên trước khi tải ảnh" : undefined}
              >
                {uploadingCccd ? "Đang tải..." : "Tải ảnh CCCD"}
              </label>
              {form.staffId && selectedHasCccd && (
                <button type="button" className="primary" onClick={() => setCccdOverlayStaffId(Number(form.staffId))}>
                  Xem CCCD
                </button>
              )}
            </div>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ marginTop: 12 }}>
          <button className="primary" disabled={saving} onClick={handleSave}>
            {saving ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </div>
      </div>

      {renderSavedTable("Thông tin nhân sự đang hoạt động", activePersonalRows)}
      {renderSavedTable("Thông tin nhân sự đã nghỉ", leftPersonalRows)}

      {cccdOverlayStaffId != null && (
        <div className="cccd-overlay" role="dialog" aria-modal="true" aria-label="Xem ảnh CCCD">
          <div
            className="cccd-overlay-backdrop"
            role="presentation"
            onClick={() => setCccdOverlayStaffId(null)}
          />
          <div className="cccd-overlay-panel">
            <button
              type="button"
              className="cccd-overlay-close"
              aria-label="Đóng"
              onClick={() => setCccdOverlayStaffId(null)}
            >
              ×
            </button>
            <img src={getCccdImageUrl(cccdOverlayStaffId)} alt="Ảnh CCCD" />
          </div>
        </div>
      )}
    </>
  );
}
