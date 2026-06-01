import * as XLSX from 'xlsx';

export type OrderStatusKey = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type MonthlyOrderCell = {
  orderCount: number;
  cancelledCount: number;
  totalAmount: number;
  byStatus: Record<OrderStatusKey, number>;
};

export type FranchiseMonthlyRow = {
  franchiseKey: string;
  franchiseName: string;
  months: MonthlyOrderCell[];
  yearTotal: MonthlyOrderCell;
};

export type FranchiseMonthlyReport = {
  year: number;
  rows: FranchiseMonthlyRow[];
  monthTotals: MonthlyOrderCell[];
  grandTotal: MonthlyOrderCell;
};

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'] as const;

const emptyCell = (): MonthlyOrderCell => ({
  orderCount: 0,
  cancelledCount: 0,
  totalAmount: 0,
  byStatus: { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
});

const addOrderToCell = (cell: MonthlyOrderCell, status: OrderStatusKey, amount: number): void => {
  cell.orderCount += 1;
  cell.byStatus[status] += 1;
  if (status === 'cancelled') {
    cell.cancelledCount += 1;
    return;
  }
  cell.totalAmount += amount;
};

const mergeCells = (target: MonthlyOrderCell, source: MonthlyOrderCell): void => {
  target.orderCount += source.orderCount;
  target.cancelledCount += source.cancelledCount;
  target.totalAmount += source.totalAmount;
  (Object.keys(target.byStatus) as OrderStatusKey[]).forEach((key) => {
    target.byStatus[key] += source.byStatus[key];
  });
};

export const getMonthRangeLabel = (year: number, month: number): string => {
  const lastDay = new Date(year, month, 0).getDate();
  return `${month}월(${month}/1~${month}/${lastDay})`;
};

export const getOrderLocalYearMonth = (createdAt: string): { year: number; month: number } | null => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

export type OrderForMonthlyReport = {
  orderChannel: 'b2b' | 'b2c';
  franchiseKey: string | null;
  franchiseName: string;
  status: OrderStatusKey;
  totalAmount: number;
  createdAt: string;
};

export const buildFranchiseMonthlyReport = (
  orders: OrderForMonthlyReport[],
  year: number
): FranchiseMonthlyReport => {
  const b2bOrders = orders.filter((order) => order.orderChannel === 'b2b');
  const franchiseMap = new Map<string, { franchiseKey: string; franchiseName: string; months: MonthlyOrderCell[] }>();

  b2bOrders.forEach((order) => {
    const ym = getOrderLocalYearMonth(order.createdAt);
    if (!ym || ym.year !== year) return;

    const key = order.franchiseKey || `name:${order.franchiseName}`;
    let row = franchiseMap.get(key);
    if (!row) {
      row = {
        franchiseKey: order.franchiseKey || key,
        franchiseName: order.franchiseName,
        months: Array.from({ length: 12 }, () => emptyCell()),
      };
      franchiseMap.set(key, row);
    }

    const cell = row.months[ym.month - 1];
    addOrderToCell(cell, order.status, order.totalAmount);
  });

  const rows: FranchiseMonthlyRow[] = Array.from(franchiseMap.values())
    .map((row) => {
      const yearTotal = emptyCell();
      row.months.forEach((monthCell) => mergeCells(yearTotal, monthCell));
      return { ...row, yearTotal };
    })
    .sort((a, b) => a.franchiseName.localeCompare(b.franchiseName, 'ko-KR'));

  const monthTotals = Array.from({ length: 12 }, () => emptyCell());
  const grandTotal = emptyCell();
  rows.forEach((row) => {
    row.months.forEach((cell, index) => mergeCells(monthTotals[index], cell));
    mergeCells(grandTotal, row.yearTotal);
  });

  return { year, rows, monthTotals, grandTotal };
};

export const formatMonthlyCellSummary = (cell: MonthlyOrderCell): string => {
  if (cell.orderCount === 0) return '-';
  const activeCount = cell.orderCount - cell.cancelledCount;
  const amountText =
    cell.totalAmount > 0 ? `₩${cell.totalAmount.toLocaleString('ko-KR')}` : '₩0';
  return `${activeCount}건\n${amountText}`;
};

export const formatMonthlyCellDetail = (cell: MonthlyOrderCell): string => {
  if (cell.orderCount === 0) return '';
  const parts = [
    `합계 ${cell.orderCount}건`,
    `₩${cell.totalAmount.toLocaleString('ko-KR')}`,
    cell.byStatus.pending ? `대기 ${cell.byStatus.pending}` : '',
    cell.byStatus.processing ? `처리 ${cell.byStatus.processing}` : '',
    cell.byStatus.shipped ? `출고 ${cell.byStatus.shipped}` : '',
    cell.byStatus.delivered ? `완료 ${cell.byStatus.delivered}` : '',
    cell.byStatus.cancelled ? `취소 ${cell.byStatus.cancelled}` : '',
  ].filter(Boolean);
  return parts.join(' · ');
};

export const getMonthColumnHeaders = (year: number): string[] =>
  MONTH_LABELS.map((_, index) => getMonthRangeLabel(year, index + 1));

export const downloadFranchiseMonthlyReportExcel = (report: FranchiseMonthlyReport): void => {
  const monthHeaders = getMonthColumnHeaders(report.year);

  const summaryRows = report.rows.map((row) => {
    const record: Record<string, string | number> = {
      가맹점키: row.franchiseKey,
      가맹점명: row.franchiseName,
    };
    row.months.forEach((cell, index) => {
      const label = monthHeaders[index];
      record[`${label}_건수`] = cell.orderCount - cell.cancelledCount;
      record[`${label}_금액`] = cell.totalAmount;
      record[`${label}_취소`] = cell.cancelledCount;
    });
    record['연간_건수'] = row.yearTotal.orderCount - row.yearTotal.cancelledCount;
    record['연간_금액'] = row.yearTotal.totalAmount;
    record['연간_취소'] = row.yearTotal.cancelledCount;
    return record;
  });

  const totalRow: Record<string, string | number> = {
    가맹점키: '',
    가맹점명: '합계',
  };
  report.monthTotals.forEach((cell, index) => {
    const label = monthHeaders[index];
    totalRow[`${label}_건수`] = cell.orderCount - cell.cancelledCount;
    totalRow[`${label}_금액`] = cell.totalAmount;
    totalRow[`${label}_취소`] = cell.cancelledCount;
  });
  totalRow['연간_건수'] = report.grandTotal.orderCount - report.grandTotal.cancelledCount;
  totalRow['연간_금액'] = report.grandTotal.totalAmount;
  totalRow['연간_취소'] = report.grandTotal.cancelledCount;

  const statusRows = report.rows.flatMap((row) =>
    row.months.flatMap((cell, monthIndex) => {
      if (cell.orderCount === 0) return [];
      return [
        {
          가맹점키: row.franchiseKey,
          가맹점명: row.franchiseName,
          월: monthHeaders[monthIndex],
          기간: monthHeaders[monthIndex],
          주문건수: cell.orderCount,
          유효건수: cell.orderCount - cell.cancelledCount,
          주문금액: cell.totalAmount,
          대기: cell.byStatus.pending,
          처리중: cell.byStatus.processing,
          출고: cell.byStatus.shipped,
          배송완료: cell.byStatus.delivered,
          취소: cell.byStatus.cancelled,
        },
      ];
    })
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([...summaryRows, totalRow]), '가맹점월별요약');
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(statusRows.length > 0 ? statusRows : [{ 안내: '해당 연도 주문 없음' }]),
    '상태별상세'
  );
  XLSX.writeFile(workbook, `가맹점-월별주문현황-${report.year}.xlsx`);
};
