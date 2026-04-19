import { useMemo, useState } from "react";
import { api } from "../api/client";
import { vietnamTodayIsoDate } from "../utils/vietnamTime";

function newStaffForm() {
  return {
    id: null,
    name: "",
    type: "main",
    baseSalary: "",
    holdRemaining: "",
    accountNumber: "",
    status: "working",
    startDate: vietnamTodayIsoDate(),
    endDate: ""
  };
}

export function StaffPage({ data, selectedBranchId }) {
  const [form, setForm] = useState(() => newStaffForm());
  const [error, setError] = useState("");

  const { activeStaff, leftStaff } = useMemo(() => {
    const branch = data.staff.filter((s) => s.branchId === selectedBranchId);
    return {
      activeStaff: branch.filter((s) => s.status !== "left"),
      leftStaff: branch.filter((s) => s.status === "left")
    };
  }, [data.staff, selectedBranchId]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(newStaffForm());
    setError("");
  }

  const needsBaseSalary = form.type === "assistant";

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Vui l\u00f2ng nh\u1eadp H\u1ecd t\u00ean.");
      return;
    }
    if (needsBaseSalary && (!form.baseSalary || Number(form.baseSalary) <= 0)) {
      setError("Vui l\u00f2ng nh\u1eadp L\u01b0\u01a1ng c\u1ee9ng h\u1ee3p l\u1ec7.");
      return;
    }
    if (form.holdRemaining === "" || Number(form.holdRemaining) < 0) {
      setError("Vui l\u00f2ng nh\u1eadp Ti\u1ec1n giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i h\u1ee3p l\u1ec7.");
      return;
    }
    if (form.status === "left" && !form.endDate) {
      setError("Vui l\u00f2ng nh\u1eadp Ng\u00e0y k\u1ebft th\u00fac khi nh\u00e2n vi\u00ean \u0111\u00e3 ngh\u1ec9.");
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      setError("Ng\u00e0y k\u1ebft th\u00fac ph\u1ea3i l\u1edbn h\u01a1n ho\u1eb7c b\u1eb1ng Ng\u00e0y b\u1eaft \u0111\u1ea7u.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      branchId: selectedBranchId,
      baseSalary: needsBaseSalary ? Number(form.baseSalary) : 0,
      holdRemaining: Number(form.holdRemaining),
      accountNumber: form.accountNumber.trim(),
      status: form.status,
      startDate: form.startDate,
      endDate: form.status === "left" ? form.endDate : null
    };

    if (form.id) await api.updateStaff(form.id, payload);
    else await api.createStaff(payload);

    await data.reload();
    resetForm();
  }

  function handleEdit(staff) {
    setForm({
      id: staff.id,
      name: staff.name || "",
      type: staff.type || "main",
      baseSalary: String(staff.baseSalary || ""),
      holdRemaining: String(staff.holdRemaining ?? 0),
      accountNumber: staff.accountNumber || "",
      status: staff.status || "working",
      startDate: staff.startDate || vietnamTodayIsoDate(),
      endDate: staff.endDate || ""
    });
    setError("");
  }

  async function handleDelete(staff) {
    if (!confirm(`X\u00f3a nh\u00e2n vi\u00ean ${staff.name}?`)) return;
    await api.deleteStaff(staff.id);
    await data.reload();
    if (form.id === staff.id) resetForm();
  }

  function renderStaffTable(title, rows, showEndDate) {
    return (
      <div className="card">
        <div className="page-header">
          <h3>{title} ({rows.length})</h3>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{"T\u00ean"}</th>
                <th>{"Lo\u1ea1i"}</th>
                <th>{"Chi nh\u00e1nh"}</th>
                <th>{"L\u01b0\u01a1ng c\u1ee9ng"}</th>
                <th>{"Giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i"}</th>
                <th>STK</th>
                <th>{"Ng\u00e0y b\u1eaft \u0111\u1ea7u"}</th>
                <th>{"Ng\u00e0y k\u1ebft th\u00fac"}</th>
                <th className="col-actions">{"Thao t\u00e1c"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td><span className={`badge ${s.type === "main" ? "badge-blue" : "badge-yellow"}`}>{s.type === "main" ? "Th\u1ee3 ch\u00ednh" : "Th\u1ee3 ph\u1ee5"}</span></td>
                  <td>{data.branches.find((b) => b.id === s.branchId)?.name || "-"}</td>
                  <td className={s.type === "main" ? "muted" : undefined}>
                    {s.type === "main" ? "—" : `${new Intl.NumberFormat("vi-VN").format(s.baseSalary)} VND`}
                  </td>
                  <td>{new Intl.NumberFormat("vi-VN").format(s.holdRemaining || 0)} VND</td>
                  <td>{s.accountNumber || "-"}</td>
                  <td>{s.startDate || "-"}</td>
                  <td>{showEndDate ? (s.endDate || "-") : "-"}</td>
                  <td className="col-actions">
                    <button className="icon-btn" title={"S\u1eeda"} onClick={() => handleEdit(s)}>{"✏️"}</button>
                    <button className="icon-btn danger" title={"X\u00f3a"} onClick={() => handleDelete(s)}>{"🗑️"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="page-header">
          <h3>{form.id ? "Ch\u1ec9nh s\u1eeda nh\u00e2n vi\u00ean" : "Th\u00eam nh\u00e2n vi\u00ean"}</h3>
          {form.id && <button className="secondary" onClick={resetForm}>{"H\u1ee7y s\u1eeda"}</button>}
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="muted">{"H\u1ecd t\u00ean *"}</span>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"Lo\u1ea1i th\u1ee3"}</span>
            <select
              value={form.type}
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  type: v,
                  baseSalary: v === "main" ? "" : prev.baseSalary
                }));
              }}
            >
              <option value="main">{"Th\u1ee3 ch\u00ednh"}</option>
              <option value="assistant">{"Th\u1ee3 ph\u1ee5"}</option>
            </select>
          </label>

          <label className="field">
            <span className="muted">{"Chi nh\u00e1nh"}</span>
            <input value={data.branches.find((b) => b.id === selectedBranchId)?.name || ""} disabled />
          </label>

          {needsBaseSalary ? (
            <label className="field">
              <span className="muted">{"L\u01b0\u01a1ng c\u1ee9ng (VND) *"}</span>
              <input type="number" min={0} value={form.baseSalary} onChange={(e) => setField("baseSalary", e.target.value)} />
            </label>
          ) : (
            <label className="field">
              <span className="muted">{"L\u01b0\u01a1ng c\u1ee9ng"}</span>
              <input type="text" value="0" disabled readOnly />
            </label>
          )}

          <label className="field">
            <span className="muted">{"Ti\u1ec1n giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i (VND) *"}</span>
            <input type="number" value={form.holdRemaining} onChange={(e) => setField("holdRemaining", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"S\u1ed1 t\u00e0i kho\u1ea3n"}</span>
            <input value={form.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"Tr\u1ea1ng th\u00e1i"}</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="working">{"\u0110i l\u00e0m"}</option>
              <option value="left">{"\u0110\u00e3 ngh\u1ec9"}</option>
            </select>
          </label>

          <label className="field">
            <span className="muted">{"Ng\u00e0y b\u1eaft \u0111\u1ea7u"}</span>
            <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"Ng\u00e0y k\u1ebft th\u00fac"} {form.status === "left" ? "*" : ""}</span>
            <input
              type="date"
              value={form.endDate}
              disabled={form.status !== "left"}
              onChange={(e) => setField("endDate", e.target.value)}
            />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div style={{ marginTop: 12 }}>
          <button className="primary" onClick={handleSave}>{form.id ? "L\u01b0u thay \u0111\u1ed5i" : "Th\u00eam nh\u00e2n vi\u00ean"}</button>
        </div>
      </div>

      {renderStaffTable("Nhân sự đang hoạt động", activeStaff, false)}
      {renderStaffTable("Nhân sự đã nghỉ", leftStaff, true)}
    </>
  );
}
