import { KpiWeekAttendanceReport, KpiMonthAttendanceReport } from "./KpiPeriodAttendanceTable";
import { KpiConfigPage } from "./KpiConfigPage";
import { KpiManagerPage } from "./KpiManagerPage";

export function KpiResultsPage({ data, selectedBranchId, subTab }) {
  return (
    <div className="kpi-results-page">
      {subTab === "week" && <KpiWeekAttendanceReport data={data} selectedBranchId={selectedBranchId} />}
      {subTab === "month" && <KpiMonthAttendanceReport data={data} selectedBranchId={selectedBranchId} />}
      {subTab === "manager" && <KpiManagerPage data={data} selectedBranchId={selectedBranchId} />}
      {subTab === "config" && <KpiConfigPage data={data} selectedBranchId={selectedBranchId} />}
    </div>
  );
}
