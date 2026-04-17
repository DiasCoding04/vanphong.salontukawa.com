import { useState } from "react";
import { api } from "../api/client";

const initialForm = {
  name: "",
  type: "main",
  branchId: 1,
  baseSalary: 5000000,
  status: "active",
  startDate: new Date().toISOString().slice(0, 10)
};

export function StaffPage({ data }) {
  const [form, setForm] = useState(initialForm);

  async function handleAdd() {
    await api.createStaff({ ...form, branchId: Number(form.branchId), baseSalary: Number(form.baseSalary) });
    await data.reload();
    setForm(initialForm);
  }

  return (
    <>
      <div className="card">
        <div className="page-header"><h3>Thêm nhân viên</h3></div>
        <div className="row">
          <input placeholder="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="main">Thợ chính</option>
            <option value="assistant">Thợ phụ</option>
          </select>
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
            {data.branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <button className="primary" onClick={handleAdd}>Lưu</button>
        </div>
      </div>

      <div className="card">
        <div className="page-header"><h3>Danh sách nhân sự ({data.staff.length})</h3></div>
        <table>
          <thead><tr><th>Tên</th><th>Loại</th><th>Chi nhánh</th><th>Lương cứng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {data.staff.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td><span className={`badge ${s.type === "main" ? "badge-blue" : "badge-yellow"}`}>{s.type === "main" ? "Thợ chính" : "Thợ phụ"}</span></td>
                <td>{data.branches.find((b) => b.id === s.branchId)?.name || "-"}</td>
                <td>{new Intl.NumberFormat("vi-VN").format(s.baseSalary)} VND</td>
                <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-red"}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
