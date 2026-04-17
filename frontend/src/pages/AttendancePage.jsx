import { useMemo, useState } from "react";
import { api } from "../api/client";

export function AttendancePage({ data }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);

  const byStaff = useMemo(() => {
    const map = new Map();
    for (const row of rows) map.set(row.staff_id, row);
    return map;
  }, [rows]);

  async function loadByDate() {
    setRows(await api.getAttendanceByDate(date));
  }

  async function saveForm(form) {
    await api.saveAttendance(form);
    setEditing(null);
    await loadByDate();
  }

  function startEdit(staff) {
    const existing = byStaff.get(staff.id);
    setEditing(
      existing
        ? {
            staffId: staff.id,
            date,
            present: existing.present === 1,
            bookings: existing.bookings,
            totalClients: existing.total_clients,
            checkins: existing.checkins,
            products: existing.products,
            revenue: existing.revenue,
            wash: existing.wash
          }
        : { staffId: staff.id, date, present: true, bookings: 0, totalClients: 0, checkins: 0, products: 0, revenue: 0, wash: 0 }
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="primary" onClick={loadByDate}>Tải dữ liệu</button>
      </div>
      <table>
        <thead><tr><th>Nhân viên</th><th>Trạng thái</th><th>Khách</th><th>Lịch đặt</th><th>Check-in</th><th>Doanh thu</th><th>Gội</th><th>Hành động</th></tr></thead>
        <tbody>
          {data.staff.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{byStaff.get(s.id)?.present === 1 ? "Có mặt" : "Chưa chấm"}</td>
              <td>{byStaff.get(s.id)?.total_clients ?? "-"}</td>
              <td>{byStaff.get(s.id)?.bookings ?? "-"}</td>
              <td>{byStaff.get(s.id)?.checkins ?? "-"}</td>
              <td>{byStaff.get(s.id)?.revenue ?? "-"}</td>
              <td>{s.type === "assistant" ? byStaff.get(s.id)?.wash ?? "-" : "-"}</td>
              <td><button className="primary" onClick={() => startEdit(s)}>Chấm công</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>Cập nhật chấm công</h4>
          <div className="row">
            <select value={editing.present ? "1" : "0"} onChange={(e) => setEditing({ ...editing, present: e.target.value === "1" })}>
              <option value="1">Có mặt</option>
              <option value="0">Vắng</option>
            </select>
            <input type="number" placeholder="Khách hôm trước" value={editing.totalClients} onChange={(e) => setEditing({ ...editing, totalClients: Number(e.target.value) })} />
            <input type="number" placeholder="Khách đặt lịch" value={editing.bookings} onChange={(e) => setEditing({ ...editing, bookings: Number(e.target.value) })} />
            <input type="number" placeholder="Checkin" value={editing.checkins} onChange={(e) => setEditing({ ...editing, checkins: Number(e.target.value) })} />
            <input type="number" placeholder="Sản phẩm" value={editing.products} onChange={(e) => setEditing({ ...editing, products: Number(e.target.value) })} />
            <input type="number" placeholder="Doanh thu" value={editing.revenue} onChange={(e) => setEditing({ ...editing, revenue: Number(e.target.value) })} />
            <input type="number" placeholder="Gội (thợ phụ)" value={editing.wash} onChange={(e) => setEditing({ ...editing, wash: Number(e.target.value) })} />
            <button className="primary" onClick={() => saveForm(editing)}>Lưu</button>
          </div>
        </div>
      )}
    </div>
  );
}
