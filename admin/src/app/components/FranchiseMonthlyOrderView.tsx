import {
  downloadFranchiseMonthlyReportExcel,
  formatMonthlyCellDetail,
  formatMonthlyCellSummary,
  type FranchiseMonthlyReport,
} from '../lib/franchiseMonthlyOrderReport';

type FranchiseMonthlyOrderViewProps = {
  loading: boolean;
  report: FranchiseMonthlyReport;
  monthColumnHeaders: string[];
  reportYear: number;
  reportYearOptions: number[];
  onYearChange: (year: number) => void;
};

export function FranchiseMonthlyOrderView({
  loading,
  report,
  monthColumnHeaders,
  reportYear,
  reportYearOptions,
  onYearChange,
}: FranchiseMonthlyOrderViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">가맹점별 월별 주문 현황</p>
          <p className="text-xs text-gray-500 mt-0.5">
            달력 기준(예: 1월 1일~31일, 2월 1일~28일). 건수·금액은 취소 주문을 제외합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reportYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            {reportYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => downloadFranchiseMonthlyReportExcel(report)}
            disabled={report.rows.length === 0}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            월별 현황 엑셀 다운로드
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 min-w-[180px]">
                가맹점
              </th>
              {monthColumnHeaders.map((header) => (
                <th
                  key={header}
                  className="px-3 py-3 text-center font-semibold text-gray-900 min-w-[108px] whitespace-nowrap"
                  title={header}
                >
                  {header}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-[#1A4D2E] min-w-[108px]">연간 합계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                  주문 내역을 불러오는 중입니다.
                </td>
              </tr>
            ) : report.rows.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                  {reportYear}년 가맹점(B2B) 주문이 없습니다.
                </td>
              </tr>
            ) : (
              <>
                {report.rows.map((row) => (
                  <tr key={row.franchiseKey} className="hover:bg-lime-50/60">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-100">
                      <p className="font-medium text-gray-900">{row.franchiseName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{row.franchiseKey}</p>
                    </td>
                    {row.months.map((cell, monthIndex) => (
                      <td
                        key={`${row.franchiseKey}-${monthIndex}`}
                        className="px-2 py-3 text-center align-top"
                        title={formatMonthlyCellDetail(cell)}
                      >
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-snug">
                          {formatMonthlyCellSummary(cell)}
                        </pre>
                      </td>
                    ))}
                    <td
                      className="px-2 py-3 text-center align-top bg-lime-50/50"
                      title={formatMonthlyCellDetail(row.yearTotal)}
                    >
                      <pre className="text-xs font-semibold text-gray-900 whitespace-pre-wrap font-sans leading-snug">
                        {formatMonthlyCellSummary(row.yearTotal)}
                      </pre>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 border-r border-gray-200">합계</td>
                  {report.monthTotals.map((cell, monthIndex) => (
                    <td
                      key={`total-${monthIndex}`}
                      className="px-2 py-3 text-center"
                      title={formatMonthlyCellDetail(cell)}
                    >
                      <pre className="text-xs text-gray-900 whitespace-pre-wrap font-sans leading-snug">
                        {formatMonthlyCellSummary(cell)}
                      </pre>
                    </td>
                  ))}
                  <td
                    className="px-2 py-3 text-center bg-lime-100"
                    title={formatMonthlyCellDetail(report.grandTotal)}
                  >
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap font-sans leading-snug">
                      {formatMonthlyCellSummary(report.grandTotal)}
                    </pre>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
