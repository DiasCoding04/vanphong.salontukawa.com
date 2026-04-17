import { useMemo, useState } from "react";
import { api } from "../api/client";

export function AttendancePage({ data, selectedBranchId }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);

  const staffRows = data.staff.filter((s) => s.branchId === selectedBranchId);

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
    setEditing(existing
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
        <button className="primary" onClick={loadByDate}>{"T\u1ea3i d\u1eef li\u1ec7u"}</button>
      </div>
      <table>
        <thead><tr><th>{"Nh\u00e2n vi\u00ean"}</th><th>{"Tr\u1ea1ng th\u00e1i"}</th><th>{"Kh\u00e1ch"}</th><th>{"L\u1ecbch \u0111\u1eb7t"}</th><th>Check-in</th><th>{"Doanh thu"}</th><th>{"G\u1ed9i"}</th><th>{"H\u00e0nh \u0111\u1ed9ng"}</th></tr></thead>
        <tbody>
          {staffRows.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{byStaff.get(s.id)?.present === 1 ? "C\u00f3 m\u1eb7t" : "Ch\u01b0a ch\u1ea5m"}</td>
              <td>{byStaff.get(s.id)?.total_clients ?? "-"}</td>
              <td>{byStaff.get(s.id)?.bookings ?? "-"}</td>
              <td>{byStaff.get(s.id)?.checkins ?? "-"}</td>
              <td>{byStaff.get(s.id)?.revenue ?? "-"}</td>
              <td>{s.type === "assistant" ? byStaff.get(s.id)?.wash ?? "-" : "-"}</td>
              <td><button className="primary" onClick={() => startEdit(s)}>{"Ch\u1ea5m c\u00f4ng"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="card" style={{ marginTop: 12 }}>
          <h4>{"C\u1eadp nh\u1eadt ch\u1ea5m c\u00f4ng"}</h4>
          <div className="row">
            <select value={editing.present ? "1" : "0"} onChange={(e) => setEditing({ ...editing, present: e.target.value === "1" })}>
              <option value="1">{"C\u00f3 m\u1eb7t"}</option>
              <option value="0">{"V\u1eafng"}</option>
            </select>
            <input type="number" placeholder={"Kh\u00e1ch h\u00f4m tr\u01b0\u1edbc"} value={editing.totalClients} onChange={(e) => setEditing({ ...editing, totalClients: Number(e.target.value) })} />
            <input type="number" placeholder={"Kh\u00e1ch \u0111\u1eb7t l\u1ecbch"} value={editing.bookings} onChange={(e) => setEditing({ ...editing, bookings: Number(e.target.value) })} />
            <input type="number" placeholder="Checkin" value={editing.checkins} onChange={(e) => setEditing({ ...editing, checkins: Number(e.target.value) })} />
            <input type="number" placeholder={"S\u1ea3n ph\u1ea9m"} value={editing.products} onChange={(e) => setEditing({ ...editing, products: Number(e.target.value) })} />
            <input type="number" placeholder={"Doanh thu"} value={editing.revenue} onChange={(e) => setEditing({ ...editing, revenue: Number(e.target.value) })} />
            <input type="number" placeholder={"G\u1ed9i (th\u1ee3 ph\u1ee5)"} value={editing.wash} onChange={(e) => setEditing({ ...editing, wash: Number(e.target.value) })} />
            <button className="primary" onClick={() => saveForm(editing)}>{"L\u01b0u"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
