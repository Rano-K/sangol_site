import ExcelJS from 'exceljs';

export const SANGOL_SUPPLIER = {
  businessNumber: '354-86-00779',
  companyName: '농업회사법인 주식회사 산골',
  representative: '정현철',
  address: '강원특별자치도 화천군 사내면 검단길 213-49 (광덕리)',
  businessType: '작물재배업',
  businessCategory: '농산물임산물재배업',
  phone: '02-422-8220',
  fax: '02-784-8222',
} as const;

export type TransactionStatementItem = {
  productName: string;
  unit: string;
  taxType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type TransactionStatementOrder = {
  id: number;
  createdAt: string;
  franchiseName: string;
  franchiseContactPerson: string | null;
  franchiseBusinessNumber: string | null;
  franchisePhone: string | null;
  franchiseAddress: string | null;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  recipientName: string | null;
  deliveryRequest: string | null;
  totalAmount: number;
  items: TransactionStatementItem[];
};

type StatementTheme = 'supplier' | 'recipient';

const ITEM_ROW_COUNT = 10;
const LAST_COL = 8;

const THEME_COLORS: Record<StatementTheme, string> = {
  supplier: 'FFC00000',
  recipient: 'FF0070C0',
};

const THEME_SUBTITLES: Record<StatementTheme, string> = {
  supplier: '[공급자 보관용]',
  recipient: '[공급 받는자 보관용]',
};

const formatBusinessNumber = (value: string | null | undefined): string => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return String(value ?? '').trim();
};

const formatKrw = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) return '';
  return Math.round(value).toLocaleString('ko-KR');
};

const formatStatementDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatMonthDay = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
};

const isTaxExempt = (taxType: string): boolean => {
  const normalized = taxType.trim().toLowerCase();
  return normalized === 'tax_exempt' || normalized === 'exempt' || normalized === '면세';
};

const buildCustomerName = (order: TransactionStatementOrder): string => {
  const store = order.franchiseName.trim();
  const person = (order.franchiseContactPerson || order.recipientName || '').trim();
  if (store && person) return `${store} / ${person}`;
  return store || person || '-';
};

const thinBorder = (color: string): Partial<ExcelJS.Borders> => ({
  top: { style: 'thin', color: { argb: color } },
  left: { style: 'thin', color: { argb: color } },
  bottom: { style: 'thin', color: { argb: color } },
  right: { style: 'thin', color: { argb: color } },
});

const applyBorderRange = (
  worksheet: ExcelJS.Worksheet,
  rowStart: number,
  colStart: number,
  rowEnd: number,
  colEnd: number,
  color: string
): void => {
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      worksheet.getCell(row, col).border = thinBorder(color);
    }
  }
};

const setCell = (
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  options?: {
    bold?: boolean;
    size?: number;
    align?: Partial<ExcelJS.Alignment>;
    color?: string;
    fillArgb?: string;
    borderColor?: string;
    numFmt?: string;
  }
): void => {
  const cell = worksheet.getCell(row, col);
  cell.value = value;
  cell.font = {
    name: 'Malgun Gothic',
    size: options?.size ?? 10,
    bold: options?.bold ?? false,
    color: options?.color ? { argb: options.color } : undefined,
  };
  if (options?.align) cell.alignment = options.align;
  if (options?.fillArgb) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fillArgb } };
  }
  if (options?.borderColor) cell.border = thinBorder(options.borderColor);
  if (options?.numFmt) cell.numFmt = options.numFmt;
};

type LineTotals = {
  supplyTotal: number;
  taxTotal: number;
  grandTotal: number;
};

const calcLineTotals = (items: TransactionStatementItem[]): LineTotals => {
  let supplyTotal = 0;
  let taxTotal = 0;
  items.forEach((item) => {
    const supply = item.totalPrice || item.unitPrice * item.quantity;
    supplyTotal += supply;
    if (!isTaxExempt(item.taxType)) {
      taxTotal += Math.round(supply * 0.1);
    }
  });
  return { supplyTotal, taxTotal, grandTotal: supplyTotal + taxTotal };
};

const renderStatementBlock = (
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  theme: StatementTheme,
  order: TransactionStatementOrder
): number => {
  const color = THEME_COLORS[theme];
  const totals = calcLineTotals(order.items);
  const statementDate = formatStatementDate(order.createdAt);
  const monthDay = formatMonthDay(order.createdAt);
  const projectSite = (order.deliveryAddress || order.franchiseName || '').trim();
  const customerAddress = (order.franchiseAddress || order.deliveryAddress || '').trim();
  const customerPhone = (order.franchisePhone || order.deliveryPhone || '').trim();
  const remarksDefault = order.deliveryRequest?.trim() || '';

  let row = startRow;

  worksheet.mergeCells(row, 1, row, LAST_COL);
  setCell(worksheet, row, 1, '거 래 명 세 표', {
    bold: true,
    size: 20,
    align: { horizontal: 'center', vertical: 'middle' },
    color,
  });
  worksheet.getRow(row).height = 32;
  row += 1;

  worksheet.mergeCells(row, 1, row, LAST_COL);
  setCell(worksheet, row, 1, THEME_SUBTITLES[theme], {
    bold: true,
    size: 11,
    align: { horizontal: 'center', vertical: 'middle' },
    color,
  });
  row += 2;

  const headerStart = row;
  const headerRows: Array<{ label: string; value: string; supplierLabel?: string; supplierValue?: string }> = [
    { label: '프로젝트/현장', value: projectSite, supplierLabel: '등록번호', supplierValue: SANGOL_SUPPLIER.businessNumber },
    { label: '일    자', value: statementDate, supplierLabel: '상    호', supplierValue: SANGOL_SUPPLIER.companyName },
    {
      label: '등록번호',
      value: formatBusinessNumber(order.franchiseBusinessNumber),
      supplierLabel: '성    명',
      supplierValue: SANGOL_SUPPLIER.representative,
    },
    { label: '거 래 처', value: buildCustomerName(order), supplierLabel: '주    소', supplierValue: SANGOL_SUPPLIER.address },
    {
      label: '주    소',
      value: customerAddress,
      supplierLabel: '업    태',
      supplierValue: `${SANGOL_SUPPLIER.businessType}    종목  ${SANGOL_SUPPLIER.businessCategory}`,
    },
    {
      label: '전화번호',
      value: customerPhone,
      supplierLabel: '전화번호',
      supplierValue: SANGOL_SUPPLIER.phone,
    },
    { label: '팩스번호', value: '', supplierLabel: '팩스번호', supplierValue: SANGOL_SUPPLIER.fax },
  ];

  headerRows.forEach((entry) => {
    setCell(worksheet, row, 1, entry.label, { bold: true, borderColor: color, align: { vertical: 'middle' } });
    worksheet.mergeCells(row, 2, row, 4);
    setCell(worksheet, row, 2, entry.value, { borderColor: color, align: { vertical: 'middle', wrapText: true } });
    setCell(worksheet, row, 5, entry.supplierLabel ?? '', {
      bold: true,
      borderColor: color,
      align: { vertical: 'middle', horizontal: 'center' },
    });
    worksheet.mergeCells(row, 6, row, LAST_COL);
    setCell(worksheet, row, 6, entry.supplierValue ?? '', {
      borderColor: color,
      align: { vertical: 'middle', wrapText: true },
    });
    worksheet.getRow(row).height = entry.label === '주    소' || entry.supplierLabel === '주    소' ? 36 : 22;
    row += 1;
  });

  applyBorderRange(worksheet, headerStart, 5, row - 1, LAST_COL, color);
  row += 1;

  worksheet.mergeCells(row, 1, row, 2);
  setCell(worksheet, row, 1, '합 계 금 액', {
    bold: true,
    size: 14,
    borderColor: color,
    align: { horizontal: 'center', vertical: 'middle' },
    color,
  });
  worksheet.mergeCells(row, 3, row, LAST_COL);
  setCell(worksheet, row, 3, formatKrw(totals.grandTotal || totals.supplyTotal), {
    bold: true,
    size: 16,
    borderColor: color,
    align: { horizontal: 'right', vertical: 'middle' },
  });
  worksheet.getRow(row).height = 28;
  row += 1;

  const tableHeaderRow = row;
  const headers = ['월일', '품목', '규격', '수량', '단가', '공급가액', '세액', '비고'];
  headers.forEach((header, index) => {
    setCell(worksheet, row, index + 1, header, {
      bold: true,
      borderColor: color,
      align: { horizontal: 'center', vertical: 'middle' },
      fillArgb: theme === 'supplier' ? 'FFFCE4D6' : 'FFD9E1F2',
      color,
    });
  });
  row += 1;

  const itemRows: Array<{
    monthDay: string;
    name: string;
    spec: string;
    qty: number | '';
    unitPrice: number | '';
    supply: number | '';
    tax: number | '';
    note: string;
  }> = order.items.map((item) => {
    const supply = item.totalPrice || item.unitPrice * item.quantity;
    const tax = isTaxExempt(item.taxType) ? 0 : Math.round(supply * 0.1);
    return {
      monthDay,
      name: item.productName,
      spec: item.unit || '',
      qty: item.quantity,
      unitPrice: item.unitPrice,
      supply,
      tax: tax || '',
      note: remarksDefault,
    };
  });

  while (itemRows.length < ITEM_ROW_COUNT) {
    itemRows.push({
      monthDay: '',
      name: '',
      spec: '',
      qty: '',
      unitPrice: '',
      supply: '',
      tax: '',
      note: '',
    });
  }

  itemRows.forEach((line) => {
    const values: ExcelJS.CellValue[] = [
      line.monthDay,
      line.name,
      line.spec,
      line.qty,
      line.unitPrice === '' ? '' : line.unitPrice,
      line.supply === '' ? '' : line.supply,
      line.tax === '' ? '' : line.tax,
      line.note,
    ];
    values.forEach((value, index) => {
      const col = index + 1;
      const isNumeric = col >= 4 && col <= 7;
      setCell(worksheet, row, col, value, {
        borderColor: color,
        align: {
          horizontal: isNumeric ? 'right' : col === 1 ? 'center' : 'left',
          vertical: 'middle',
          wrapText: col === 2,
        },
        numFmt: isNumeric && typeof value === 'number' ? '#,##0' : undefined,
      });
    });
    worksheet.getRow(row).height = 20;
    row += 1;
  });

  worksheet.mergeCells(row, 1, row, 5);
  setCell(worksheet, row, 1, '전미수잔액', { bold: true, borderColor: color, align: { horizontal: 'center', vertical: 'middle' } });
  setCell(worksheet, row, 6, '합    계', { bold: true, borderColor: color, align: { horizontal: 'center', vertical: 'middle' }, color });
  setCell(worksheet, row, 7, formatKrw(totals.supplyTotal), {
    bold: true,
    borderColor: color,
    align: { horizontal: 'right', vertical: 'middle' },
  });
  setCell(worksheet, row, 8, '', { borderColor: color });
  row += 1;

  worksheet.mergeCells(row, 1, row, 2);
  setCell(worksheet, row, 1, '총합계', { bold: true, borderColor: color, align: { horizontal: 'center', vertical: 'middle' } });
  setCell(worksheet, row, 3, formatKrw(totals.grandTotal || totals.supplyTotal), {
    bold: true,
    borderColor: color,
    align: { horizontal: 'right', vertical: 'middle' },
  });
  setCell(worksheet, row, 4, '입금액', { bold: true, borderColor: color, align: { horizontal: 'center', vertical: 'middle' } });
  setCell(worksheet, row, 5, '', { borderColor: color });
  setCell(worksheet, row, 6, '총미수잔액', { bold: true, borderColor: color, align: { horizontal: 'center', vertical: 'middle' } });
  setCell(worksheet, row, 7, '', { borderColor: color });
  worksheet.mergeCells(row, 8, row, 8);
  setCell(worksheet, row, 8, '인수자', { bold: true, borderColor: color, align: { horizontal: 'center', vertical: 'middle' } });

  applyBorderRange(worksheet, tableHeaderRow, 1, row, LAST_COL, color);

  return row + 2;
};

const STATEMENT_COLUMN_WIDTHS = [8, 24, 10, 8, 12, 14, 12, 12] as const;

const applyStatementWorksheetLayout = (worksheet: ExcelJS.Worksheet): void => {
  worksheet.views = [{ showGridLines: false }];
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  worksheet.columns = STATEMENT_COLUMN_WIDTHS.map((width) => ({ width }));
};

export const sanitizeWorksheetName = (name: string): string =>
  name
    .replace(/[\\/*?:[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || '거래명세표';

const addOrderStatementSheet = (
  workbook: ExcelJS.Workbook,
  order: TransactionStatementOrder,
  sheetName: string
): void => {
  const worksheet = workbook.addWorksheet(sanitizeWorksheetName(sheetName));
  applyStatementWorksheetLayout(worksheet);
  let nextRow = 1;
  nextRow = renderStatementBlock(worksheet, nextRow, 'supplier', order);
  renderStatementBlock(worksheet, nextRow, 'recipient', order);
};

export const buildTransactionStatementWorkbook = async (
  order: TransactionStatementOrder
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '산골 Admin';
  workbook.created = new Date();
  addOrderStatementSheet(workbook, order, '거래명세표');
  return workbook;
};

export const buildMultiOrderTransactionStatementWorkbook = async (
  orders: TransactionStatementOrder[]
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '산골 Admin';
  workbook.created = new Date();

  const usedSheetNames = new Set<string>();
  orders.forEach((order) => {
    const baseName = `주문${order.id}`;
    let sheetName = baseName;
    let suffix = 1;
    while (usedSheetNames.has(sheetName)) {
      sheetName = `${baseName.slice(0, 28)}-${suffix}`;
      suffix += 1;
    }
    usedSheetNames.add(sheetName);
    addOrderStatementSheet(workbook, order, sheetName);
  });

  return workbook;
};

const triggerWorkbookDownload = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadTransactionStatement = async (order: TransactionStatementOrder): Promise<void> => {
  const workbook = await buildTransactionStatementWorkbook(order);
  const safeName = order.franchiseName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  const datePart = formatStatementDate(order.createdAt) || new Date().toISOString().slice(0, 10);
  await triggerWorkbookDownload(workbook, `거래명세표-주문${order.id}-${safeName}-${datePart}.xlsx`);
};

export const downloadMultiOrderTransactionStatements = async (
  orders: TransactionStatementOrder[],
  fileLabel: string
): Promise<void> => {
  if (orders.length === 0) {
    throw new Error('다운로드할 거래명세표가 없습니다.');
  }
  const workbook = await buildMultiOrderTransactionStatementWorkbook(orders);
  const datePart = new Date().toISOString().slice(0, 10);
  const safeLabel = fileLabel.replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
  await triggerWorkbookDownload(workbook, `거래명세표-${safeLabel}-${datePart}.xlsx`);
};
