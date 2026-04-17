import { useMemo, useState } from "react";
import { api } from "../api/client";

const initialForm = {
  id: null,
  name: "",
  type: "main",
  baseSalary: "",
  holdRemaining: "",
  accountNumber: "",
  status: "active",
  startDate: new Date().toISOString().slice(0, 10)
};

export function StaffPage({ data, selectedBranchId }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const filteredStaff = useMemo(
    () => data.staff.filter((s) => s.branchId === selectedBranchId),
    [data.staff, selectedBranchId]
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({ ...initialForm, startDate: new Date().toISOString().slice(0, 10) });
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Vui l\u00f2ng nh\u1eadp H\u1ecd t\u00ean.");
      return;
    }
    if (!form.baseSalary || Number(form.baseSalary) <= 0) {
      setError("Vui l\u00f2ng nh\u1eadp L\u01b0\u01a1ng c\u1ee9ng h\u1ee3p l\u1ec7.");
      return;
    }
    if (form.holdRemaining === "" || Number(form.holdRemaining) < 0) {
      setError("Vui l\u00f2ng nh\u1eadp Ti\u1ec1n giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i h\u1ee3p l\u1ec7.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      branchId: selectedBranchId,
      baseSalary: Number(form.baseSalary),
      holdRemaining: Number(form.holdRemaining),
      accountNumber: form.accountNumber.trim(),
      status: form.status,
      startDate: form.startDate
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
      status: staff.status || "active",
      startDate: staff.startDate || new Date().toISOString().slice(0, 10)
    });
    setError("");
  }

  async function handleDelete(staff) {
    if (!confirm(`X\u00f3a nh\u00e2n vi\u00ean ${staff.name}?`)) return;
    await api.deleteStaff(staff.id);
    await data.reload();
    if (form.id === staff.id) resetForm();
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
            <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
              <option value="main">{"Th\u1ee3 ch\u00ednh"}</option>
              <option value="assistant">{"Th\u1ee3 ph\u1ee5"}</option>
            </select>
          </label>

          <label className="field">
            <span className="muted">{"Chi nh\u00e1nh"}</span>
            <input value={data.branches.find((b) => b.id === selectedBranchId)?.name || ""} disabled />
          </label>

          <label className="field">
            <span className="muted">{"L\u01b0\u01a1ng c\u1ee9ng (VND) *"}</span>
            <input type="number" value={form.baseSalary} onChange={(e) => setField("baseSalary", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"Ti\u1ec1n giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i (VND) *"}</span>
            <input type="number" value={form.holdRemaining} onChange={(e) => setField("holdRemaining", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"S\u1ed1 t\u00e0i kho\u1ea3n"}</span>
            <input value={form.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} />
          </label>

          <label className="field">
            <span className="muted">{"Ng\u00e0y b\u1eaft \u0111\u1ea7u"}</span>
            <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div style={{ marginTop: 12 }}>
          <button className="primary" onClick={handleSave}>{form.id ? "L\u01b0u thay \u0111\u1ed5i" : "Th\u00eam nh\u00e2n vi\u00ean"}</button>
        </div>
      </div>

      <div className="card">
        <div className="page-header"><h3>{"Danh s\u00e1ch nh\u00e2n s\u1ef1"} ({filteredStaff.length})</h3></div>
        <table>
          <thead>
            <tr>
              <th>{"T\u00ean"}</th>
              <th>{"Lo\u1ea1i"}</th>
              <th>{"Chi nh\u00e1nh"}</th>
              <th>{"L\u01b0\u01a1ng c\u1ee9ng"}</th>
              <th>{"Giam l\u01b0\u01a1ng c\u00f2n l\u1ea1i"}</th>
              <th>STK</th>
              <th>{"Tr\u1ea1ng th\u00e1i"}</th>
              <th>{"Thao t\u00e1c"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td><span className={`badge ${s.type === "main" ? "badge-blue" : "badge-yellow"}`}>{s.type === "main" ? "Th\u1ee3 ch\u00ednh" : "Th\u1ee3 ph\u1ee5"}</span></td>
                <td>{data.branches.find((b) => b.id === s.branchId)?.name || "-"}</td>
                <td>{new Intl.NumberFormat("vi-VN").format(s.baseSalary)} VND</td>
                <td>{new Intl.NumberFormat("vi-VN").format(s.holdRemaining || 0)} VND</td>
                <td>{s.accountNumber || "-"}</td>
                <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-red"}`}>{s.status}</span></td>
                <td>
                  <button className="icon-btn" title={"S\u1eeda"} onClick={() => handleEdit(s)}>{"Sua"}</button>
                  <button className="icon-btn danger" title={"X\u00f3a"} onClick={() => handleDelete(s)}>{"Xoa"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
