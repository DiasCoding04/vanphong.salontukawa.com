import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { vietnamTodayIsoDate } from "../utils/vietnamTime";

const CHEMICAL_REVENUE_MIN = 450000;

function formatVnd(n) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("vi-VN")} đ`;
}

function parseStoredBookings(jsonStr) {
  if (!jsonStr || jsonStr === "[]") return [];
  try {
    const p = JSON.parse(jsonStr);
    if (!Array.isArray(p)) return [];
    return p.map((b) => ({ revenue: Number(b.revenue) }));
  } catch {
    return [];
  }
}

export function AttendancePage({ data, selectedBranchId }) {
  const [date, setDate] = useState(vietnamTodayIsoDate());
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);

  const staffRows = data.staff.filter((s) => {
    if (s.branchId !== selectedBranchId) return false;
    if (!s.startDate || s.startDate > date) return false;
    if (s.endDate && s.endDate < date) return false;
    return true;
  });

  const byStaff = useMemo(() => {
    const map = new Map();
    for (const row of rows) map.set(row.staff_id, row);
    return map;
  }, [rows]);

  async function loadByDate() {
    if (!selectedBranchId) {
      setRows([]);
      return;
    }
    setRows(await api.getAttendanceByDate(date, selectedBranchId));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedBranchId) {
        setRows([]);
        return;
      }
      try {
        const next = await api.getAttendanceByDate(date, selectedBranchId);
        if (!cancelled) setRows(next);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, selectedBranchId]);

  function closeModal() {
    setModal(null);
  }

  function openModal(staff) {
    const row = byStaff.get(staff.id);
    let nid = 1;
    const chemParsed = parseStoredBookings(row?.chemical_bookings_json);
    const chemicalLines =
      chemParsed.length > 0
        ? chemParsed.map((b) => ({
            id: nid++,
            revenue: Number.isFinite(b.revenue) ? String(b.revenue) : ""
          }))
        : row && row.bookings > 0
          ? Array.from({ length: row.bookings }, () => ({ id: nid++, revenue: "" }))
          : [];

    const washParsed = staff.type === "assistant" ? parseStoredBookings(row?.wash_bookings_json) : [];
    const washLines =
      staff.type !== "assistant"
        ? []
        : washParsed.length > 0
          ? washParsed.map((b) => ({
              id: nid++,
              revenue: Number.isFinite(b.revenue) ? String(b.revenue) : ""
            }))
          : row && row.wash > 0
            ? Array.from({ length: row.wash }, () => ({ id: nid++, revenue: "" }))
            : [];

    setModal({
      staffId: staff.id,
      staffName: staff.name,
      staffType: staff.type,
      present: row ? row.present === 1 : true,
      totalClients: row ? row.total_clients : 0,
      checkins: row ? row.checkins : 0,
      products: row ? row.products : 0,
      chemicalLines,
      washLines
    });
  }

  function sumLineRevenues(lines) {
    return lines.reduce((s, line) => {
      const n = Number(String(line.revenue).replace(/\s/g, ""));
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
  }

  async function saveModal() {
    if (!modal) return;
    const chemicalPayload = modal.chemicalLines.map((line) => ({
      revenue: Math.round(Number(String(line.revenue).replace(/\s/g, "")))
    }));
    for (const b of chemicalPayload) {
      if (!Number.isFinite(b.revenue) || b.revenue <= CHEMICAL_REVENUE_MIN) {
        alert(
          "Mỗi lịch đặt hóa chất phải có doanh thu lớn hơn 450.000 VND. Hãy xóa dòng trống hoặc điền đủ từng lịch."
        );
        return;
      }
    }

    const washPayload =
      modal.staffType === "assistant"
        ? modal.washLines.map((line) => ({
            revenue: Math.round(Number(String(line.revenue).replace(/\s/g, "")))
          }))
        : [];

    if (modal.staffType === "assistant") {
      for (const b of washPayload) {
        if (!Number.isFinite(b.revenue) || b.revenue <= 0) {
          alert("Mỗi lịch đặt gội phải có doanh thu lớn hơn 0. Hãy xóa dòng trống hoặc điền đủ từng lịch.");
          return;
        }
      }
    }

    try {
      await api.saveAttendance({
        staffId: modal.staffId,
        date,
        present: modal.present,
        totalClients: modal.totalClients || 0,
        checkins: modal.checkins || 0,
        products: modal.products || 0,
        chemicalBookings: chemicalPayload,
        washBookings: washPayload
      });
      closeModal();
      await loadByDate();
    } catch (e) {
      alert(e.message || "Không lưu được");
    }
  }

  const modalBookingTotal = modal ? sumLineRevenues(modal.chemicalLines) + sumLineRevenues(modal.washLines) : 0;

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="secondary" onClick={() => loadByDate()}>
          {"L\u00e0m m\u1edbi"}
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>{"Nh\u00e2n vi\u00ean"}</th>
            <th>{"Tr\u1ea1ng th\u00e1i"}</th>
            <th>{"S\u1ed1 kh\u00e1ch \u0111\u00e3 l\u00e0m"}</th>
            <th>Check-in</th>
            <th>{"L\u1ecbch \u0111\u1eb7t h\u00f3a ch\u1ea5t"}</th>
            <th>{"L\u1ecbch \u0111\u1eb7t g\u1ed9i"}</th>
            <th>{"S\u1ed1 s\u1ea3n ph\u1ea9m b\u00e1n"}</th>
            <th>{"Doanh thu"}</th>
            <th>{"H\u00e0nh \u0111\u1ed9ng"}</th>
          </tr>
        </thead>
        <tbody>
          {staffRows.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{byStaff.get(s.id)?.present === 1 ? "C\u00f3 m\u1eb7t" : "Ch\u01b0a ch\u1ea5m"}</td>
              <td>{byStaff.get(s.id)?.total_clients ?? "-"}</td>
              <td>{byStaff.get(s.id)?.checkins ?? "-"}</td>
              <td>{byStaff.get(s.id)?.bookings ?? "-"}</td>
              <td>{s.type === "assistant" ? byStaff.get(s.id)?.wash ?? "-" : "-"}</td>
              <td>{byStaff.get(s.id)?.products ?? "-"}</td>
              <td>
                {byStaff.get(s.id)?.revenue != null ? formatVnd(byStaff.get(s.id).revenue) : "-"}
              </td>
              <td>
                <button className="primary" type="button" onClick={() => openModal(s)}>
                  {"Ch\u1ea5m c\u00f4ng"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div className="attendance-modal" role="dialog" aria-modal="true" aria-label="Ch\u1ea5m c\u00f4ng">
          <button
            type="button"
            className="attendance-modal-backdrop"
            aria-label="\u0110\u00f3ng"
            onClick={closeModal}
          />
          <div className="attendance-modal-panel">
            <button type="button" className="attendance-modal-close" onClick={closeModal} aria-label="X">
              ×
            </button>
            <h3 className="attendance-modal-title">
              {"Ch\u1ea5m c\u00f4ng — "}
              {modal.staffName}
            </h3>
            <p className="muted attendance-modal-sub">
              {"Ng\u00e0y: "}
              {date}
              {" · "}
              {"T\u1ed5ng doanh thu t\u1eeb c\u00e1c l\u1ecbch: "}
              <strong>{formatVnd(modalBookingTotal)}</strong>
            </p>

            <div className="attendance-modal-field">
              <label>{"Tr\u1ea1ng th\u00e1i"}</label>
              <select
                value={modal.present ? "1" : "0"}
                onChange={(e) => setModal({ ...modal, present: e.target.value === "1" })}
              >
                <option value="1">{"C\u00f3 m\u1eb7t"}</option>
                <option value="0">{"V\u1eafng"}</option>
              </select>
            </div>

            <div className="attendance-modal-row3">
              <div className="attendance-modal-field">
                <label>{"S\u1ed1 kh\u00e1ch \u0111\u00e3 l\u00e0m"}</label>
                <input
                  type="number"
                  min={0}
                  value={modal.totalClients}
                  onChange={(e) => setModal({ ...modal, totalClients: Number(e.target.value) })}
                />
              </div>
              <div className="attendance-modal-field">
                <label>Check-in</label>
                <input
                  type="number"
                  min={0}
                  value={modal.checkins}
                  onChange={(e) => setModal({ ...modal, checkins: Number(e.target.value) })}
                />
              </div>
              <div className="attendance-modal-field">
                <label>{"S\u1ed1 s\u1ea3n ph\u1ea9m b\u00e1n"}</label>
                <input
                  type="number"
                  min={0}
                  value={modal.products}
                  onChange={(e) => setModal({ ...modal, products: Number(e.target.value) })}
                />
              </div>
            </div>

            <div
              className={
                modal.staffType === "assistant"
                  ? "attendance-modal-bookings attendance-modal-bookings--split"
                  : "attendance-modal-bookings"
              }
            >
            <div className="attendance-modal-section">
              <div className="attendance-modal-section-head">
                <h4>{"L\u1ecbch \u0111\u1eb7t h\u00f3a ch\u1ea5t"}</h4>
                <span className="muted">
                  {"S\u1ed1 l\u1ecbch: "}
                  {modal.chemicalLines.length}
                  {" · m\u1ed7i l\u1ecbch > 450.000 \u0111"}
                </span>
              </div>
              <p className="muted small">{"M\u1ed7i d\u00f2ng l\u00e0 m\u1ed9t l\u1ecbch v\u1edbi doanh thu ri\u00eang c\u1ee7a l\u1ecbch \u0111\u00f3."}</p>
              <ul className="attendance-modal-lines">
                {modal.chemicalLines.map((line, idx) => (
                  <li key={line.id}>
                    <span className="attendance-line-idx">{idx + 1}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Doanh thu lịch (VND)"
                      value={line.revenue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setModal({
                          ...modal,
                          chemicalLines: modal.chemicalLines.map((l) => (l.id === line.id ? { ...l, revenue: v } : l))
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() =>
                        setModal({
                          ...modal,
                          chemicalLines: modal.chemicalLines.filter((l) => l.id !== line.id)
                        })
                      }
                    >
                      {"X\u00f3a"}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setModal({
                    ...modal,
                    chemicalLines: [...modal.chemicalLines, { id: Date.now(), revenue: "" }]
                  })
                }
              >
                {"+ Th\u00eam l\u1ecbch h\u00f3a ch\u1ea5t"}
              </button>
            </div>

            {modal.staffType === "assistant" ? (
              <div className="attendance-modal-section">
                <div className="attendance-modal-section-head">
                  <h4>{"L\u1ecbch \u0111\u1eb7t g\u1ed9i"}</h4>
                  <span className="muted">
                    {"S\u1ed1 l\u1ecbch: "}
                    {modal.washLines.length}
                  </span>
                </div>
                <p className="muted small">{"M\u1ed7i d\u00f2ng m\u1ed9t l\u1ecbch g\u1ed9i v\u00e0 doanh thu t\u01b0\u01a1ng \u1ee9ng."}</p>
                <ul className="attendance-modal-lines">
                  {modal.washLines.map((line, idx) => (
                    <li key={line.id}>
                      <span className="attendance-line-idx">{idx + 1}</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Doanh thu lịch (VND)"
                        value={line.revenue}
                        onChange={(e) => {
                          const v = e.target.value;
                          setModal({
                            ...modal,
                            washLines: modal.washLines.map((l) => (l.id === line.id ? { ...l, revenue: v } : l))
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() =>
                          setModal({
                            ...modal,
                            washLines: modal.washLines.filter((l) => l.id !== line.id)
                          })
                        }
                      >
                        {"X\u00f3a"}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setModal({
                      ...modal,
                      washLines: [...modal.washLines, { id: Date.now(), revenue: "" }]
                    })
                  }
                >
                  {"+ Th\u00eam l\u1ecbch g\u1ed9i"}
                </button>
              </div>
            ) : null}
            </div>

            <div className="attendance-modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                {"H\u1ee7y"}
              </button>
              <button type="button" className="primary" onClick={saveModal}>
                {"L\u01b0u"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
