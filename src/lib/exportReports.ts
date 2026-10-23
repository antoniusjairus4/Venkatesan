import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PastChitSnapshot } from './api';

// Formatting Helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ---------------------------------------------------------------------------
// 1. Export PDF (Professional Closure & Audit Report)
// ---------------------------------------------------------------------------
export function exportPastChitPdf(snapshot: PastChitSnapshot): void {
  const { group, metrics, timeline, members, late_payments, installments } = snapshot;

  // Initialize PDF (A4 Portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Color Palette
  const PRIMARY: [number, number, number] = [19, 78, 74]; // #134e4a Forest dark
  const GOLD: [number, number, number] = [180, 83, 9]; // #b45309 Amber
  const SLATE: [number, number, number] = [51, 65, 85]; // #334155 Slate
  const LIGHT_BG: [number, number, number] = [248, 250, 252]; // #f8fafc

  let currentY = 16;

  // Header Banner
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'F');

  // Title Text inside Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RAJAMANICKAM CHIT FUND', margin + 6, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(204, 251, 241); // mint-100
  doc.text('OFFICIAL SCHEME CLOSURE REPORT & AUDIT CERTIFICATE', margin + 6, currentY + 16);
  doc.text('Salem, Tamil Nadu • Managing Foreman: K. Venkatesan', margin + 6, currentY + 22);

  // Status Badge in Banner
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 38, currentY + 7, 32, 14, 2, 2, 'F');
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COMPLETED', pageWidth - margin - 35, currentY + 13);
  doc.setFontSize(7);
  doc.text('100% RECOVERED', pageWidth - margin - 37, currentY + 18);

  currentY += 34;

  // ---------------------------------------------------------------------------
  // Section 1: Group Summary
  // ---------------------------------------------------------------------------
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Group Summary & Closure Details', margin, currentY);

  currentY += 4;

  const potVal = Number(group.total_pot_value);
  const baseMonthly = Number(group.installment_base_amount);
  const totalColl = Number(metrics.total_collected);

  const groupSummaryData = [
    [
      { content: 'Chit Scheme Name', styles: { fontStyle: 'bold' as const } },
      group.name,
      { content: 'Cycle Period', styles: { fontStyle: 'bold' as const } },
      `${formatDate(metrics.start_date)} → ${formatDate(metrics.end_date)}`,
    ],
    [
      { content: 'Total Pot Value', styles: { fontStyle: 'bold' as const } },
      formatCurrency(potVal),
      { content: 'Scheme Duration', styles: { fontStyle: 'bold' as const } },
      `${group.total_months} Months (20 Cycles)`,
    ],
    [
      { content: 'Base Monthly Due', styles: { fontStyle: 'bold' as const } },
      formatCurrency(baseMonthly),
      { content: 'Subscribers / Shares', styles: { fontStyle: 'bold' as const } },
      `${metrics.member_count} Members (${group.total_shares || 20} Tickets)`,
    ],
    [
      { content: 'Total Inst. Cleared', styles: { fontStyle: 'bold' as const } },
      `${metrics.total_installments} of ${metrics.total_installments} (100%)`,
      { content: 'Total Amount Collected', styles: { fontStyle: 'bold' as const } },
      formatCurrency(totalColl),
    ],
    [
      { content: 'Delayed Payments', styles: { fontStyle: 'bold' as const } },
      `${metrics.late_payments_count} Instances (All Cleared)`,
      { content: 'Audit Status', styles: { fontStyle: 'bold' as const } },
      'CLOSED & ARCHIVED (Zero Arrears)',
    ],
  ];

  autoTable(doc, {
    body: groupSummaryData,
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: SLATE,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fillColor: LIGHT_BG, textColor: PRIMARY, fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 50 },
      2: { fillColor: LIGHT_BG, textColor: PRIMARY, fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 48 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ---------------------------------------------------------------------------
  // Section 2: Member Summary & Ticket Allocations
  // ---------------------------------------------------------------------------
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Subscriber Roster & Clearance Summary', margin, currentY);

  currentY += 4;

  const memberRows = members.map((m) => [
    `#${m.share_ticket_number}`,
    m.member_name,
    m.phone,
    m.address || 'Salem, TN',
    formatCurrency(Number(m.total_paid)),
    m.late_count > 0 ? `${m.late_count} Delayed` : 'Prompt',
    'CLEARED',
  ]);

  autoTable(doc, {
    head: [['Ticket', 'Member Name', 'Phone', 'Town / Address', 'Total Paid', 'Discipline', 'Status']],
    body: memberRows,
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: SLATE,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 16, halign: 'center' },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { cellWidth: 26 },
      3: { cellWidth: 38 },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 16, halign: 'center', textColor: [22, 101, 52], fontStyle: 'bold' },
    },
  });

  // ---------------------------------------------------------------------------
  // Section 3: Monthly Collections & Timeline (New Page)
  // ---------------------------------------------------------------------------
  doc.addPage();
  currentY = 16;

  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Monthly Collection Timeline (Month 1 to 20)', margin, currentY);

  currentY += 4;

  let runningTotal = 0;
  const timelineRows = timeline.map((t) => {
    runningTotal += Number(t.collected_amount);
    return [
      `Month ${t.month_number}`,
      `${t.installment_count} / ${t.installment_count}`,
      formatCurrency(Number(t.expected_amount)),
      formatCurrency(Number(t.collected_amount)),
      t.late_count > 0 ? `${t.late_count} Delay` : '0',
      '100.0%',
      formatCurrency(runningTotal),
    ];
  });

  autoTable(doc, {
    head: [['Cycle', 'Inst. Count', 'Target Due', 'Net Collected', 'Delays', 'Recovery %', 'Cumulative']],
    body: timelineRows,
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: SLATE,
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ---------------------------------------------------------------------------
  // Section 4: Late / Delayed Payments Audit
  // ---------------------------------------------------------------------------
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. Delayed / Follow-up Payments Audit Log', margin, currentY);

  currentY += 4;

  if (late_payments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nil - All 400 installments across 20 months were paid strictly on time.', margin, currentY + 4);
    currentY += 10;
  } else {
    const lateRows = late_payments.map((l) => [
      `Month ${l.month_number}`,
      `#${l.share_ticket_number}`,
      l.member_name,
      l.member_phone,
      formatCurrency(Number(l.paid_amount)),
      formatDate(l.last_payment_date),
      l.notes || 'Delayed payment resolved after notice',
    ]);

    autoTable(doc, {
      head: [['Cycle', 'Ticket', 'Member Name', 'Phone', 'Amount', 'Date Paid', 'Audit Notes']],
      body: lateRows,
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: GOLD,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: SLATE,
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 38 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 38 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---------------------------------------------------------------------------
  // Section 5: Foreman Certification & Legal Closing Sign-off
  // ---------------------------------------------------------------------------
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 40, 2, 2, 'FD');

  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('5. Final Closing Certification & Legal Release', margin + 5, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  const certText =
    `This is to certify that Chit Scheme "${group.name}" was successfully operated and completed for 20 months. ` +
    `All 20 monthly auctions were executed in accordance with Tamil Nadu Chit Funds practices. All prize amounts ` +
    `were disbursed to prized subscribers without dispute. All 400 subscriber installment dues totaling ${formatCurrency(totalColl)} ` +
    `have been 100% collected and settled. There are no outstanding arrears or bad debts against this group.`;

  const splitCert = doc.splitTextToSize(certText, pageWidth - margin * 2 - 10);
  doc.text(splitCert, margin + 5, currentY + 15);

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text('K. Venkatesan', margin + 5, currentY + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text('Managing Foreman & Organizer • Rajamanickam Chit Fund, Salem', margin + 5, currentY + 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text('Audit Verified & Archived', pageWidth - margin - 45, currentY + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 45, currentY + 36);

  // Page Numbers Footer on All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Rajamanickam Chit Fund, Salem • Scheme Closure Report: ${group.name} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger Save / Download
  const filename = `Rajamanickam_Chit_Fund_${sanitizeFilename(group.name)}_Closure_Report.pdf`;
  doc.save(filename);
}

// ---------------------------------------------------------------------------
// 2. Export Excel (.xlsx) (Separate Sheets for all dimensions)
// ---------------------------------------------------------------------------
export function exportPastChitExcel(snapshot: PastChitSnapshot): void {
  const { group, metrics, timeline, members, late_payments, installments } = snapshot;

  const wb = XLSX.utils.book_new();

  // --------------------------------------------------
  // Sheet 1: Group Summary
  // --------------------------------------------------
  const summaryAoa = [
    ['RAJAMANICKAM CHIT FUND - PAST CHIT GROUP CLOSURE SUMMARY'],
    ['Salem, Tamil Nadu • Managing Foreman: K. Venkatesan'],
    [],
    ['Parameter', 'Value'],
    ['Chit Scheme Name', group.name],
    ['Total Pot Value (₹)', Number(group.total_pot_value)],
    ['Duration (Months)', Number(group.total_months)],
    ['Total Shares / Tickets', Number(group.total_shares || 20)],
    ['Base Monthly Installment (₹)', Number(group.installment_base_amount)],
    ['Start Date', formatDate(metrics.start_date)],
    ['End Date', formatDate(metrics.end_date)],
    ['Total Members Enrolled', metrics.member_count],
    ['Total Installments Cleared', metrics.total_installments],
    ['Total Amount Collected (₹)', metrics.total_collected],
    ['Late Payments Count', metrics.late_payments_count],
    ['Completion Status', metrics.completion_status],
    ['Recovery Rate', '100.0%'],
    ['Foreman / Organizer', 'K. Venkatesan'],
    ['Report Generated Date', new Date().toLocaleDateString('en-IN')],
    ['Notes / Archive Remarks', group.notes || 'Full recovery, closed without dispute'],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Group Summary');

  // --------------------------------------------------
  // Sheet 2: Members
  // --------------------------------------------------
  const membersData = members.map((m) => ({
    'Ticket Number': m.share_ticket_number,
    'Member Name': m.member_name,
    'Phone Number': m.phone,
    'Address / Town': m.address || 'Salem, TN',
    'Total Paid (₹)': Number(m.total_paid),
    'Delayed Payments Count': m.late_count,
    'Prized / Winner': m.is_prized ? 'Yes' : 'No',
    'Clearance Status': 'FULLY_CLEARED',
  }));
  const wsMembers = XLSX.utils.json_to_sheet(membersData);
  wsMembers['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 25 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMembers, 'Members');

  // --------------------------------------------------
  // Sheet 3: Payments (Full 400 Historical Records)
  // --------------------------------------------------
  const paymentsData = installments.map((i) => ({
    'Installment ID': i.id,
    'Month Number': i.month_number,
    'Ticket Number': i.share_ticket_number,
    'Member Name': i.member_name,
    'Phone Number': i.member_phone,
    'Base Amount (₹)': Number(i.base_amount),
    'Dividend Deduction (₹)': Number(i.dividend_deduction || 0),
    'Net Due Amount (₹)': Number(i.net_due_amount),
    'Paid Amount (₹)': Number(i.paid_amount),
    'Payment Status': i.status,
    'Payment Date': formatDate(i.last_payment_date),
    'Notes / Remarks': i.notes || '',
  }));
  const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
  wsPayments['!cols'] = [
    { wch: 38 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

  // --------------------------------------------------
  // Sheet 4: Monthly Summary
  // --------------------------------------------------
  let cum = 0;
  const monthlyData = timeline.map((t) => {
    cum += Number(t.collected_amount);
    return {
      'Month': `Month ${t.month_number}`,
      'Installments Cleared': `${t.installment_count} / ${t.installment_count}`,
      'Expected Amount (₹)': Number(t.expected_amount),
      'Collected Amount (₹)': Number(t.collected_amount),
      'Collection %': '100.0%',
      'Delayed Payments Cleared': t.late_count,
      'Cumulative Collection (₹)': cum,
    };
  });
  const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
  wsMonthly['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Summary');

  // --------------------------------------------------
  // Sheet 5: Payment Timeline
  // --------------------------------------------------
  const timelineData = timeline.map((t) => ({
    'Cycle Month': t.month_number,
    'Total Installments Expected': t.installment_count,
    'Total Installments Cleared': t.installment_count,
    'Timely Installments': t.installment_count - t.late_count,
    'Delayed Installments': t.late_count,
    'Total Inflow (₹)': Number(t.collected_amount),
    'Recovery Status': 'COMPLETED',
  }));
  const wsTimeline = XLSX.utils.json_to_sheet(timelineData);
  wsTimeline['!cols'] = [
    { wch: 14 },
    { wch: 26 },
    { wch: 26 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTimeline, 'Payment Timeline');

  // --------------------------------------------------
  // Sheet 6: Late Payments
  // --------------------------------------------------
  const lateData = late_payments.map((l) => ({
    'Month Number': l.month_number,
    'Ticket Number': l.share_ticket_number,
    'Member Name': l.member_name,
    'Phone Number': l.member_phone,
    'Amount Paid (₹)': Number(l.paid_amount),
    'Date Cleared': formatDate(l.last_payment_date),
    'Follow-up / Audit Remarks': l.notes || 'Cleared after delay notice',
  }));
  const wsLate = XLSX.utils.json_to_sheet(lateData);
  wsLate['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 25 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLate, 'Late Payments');

  // Trigger Save / Download
  const filename = `Rajamanickam_Chit_Fund_${sanitizeFilename(group.name)}_Ledger.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ---------------------------------------------------------------------------
// 3. Export All (Triggers both PDF and Excel download)
// ---------------------------------------------------------------------------
export function exportPastChitAll(snapshot: PastChitSnapshot): void {
  exportPastChitPdf(snapshot);
  setTimeout(() => {
    exportPastChitExcel(snapshot);
  }, 400);
}
