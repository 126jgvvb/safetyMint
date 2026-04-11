import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generatePDF(transactions) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(0, 212, 170);
  doc.text('SafetyMint - Transaction Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  const tableData = transactions.map(txn => [
    txn.memberName,
    txn.phoneNumber,
    txn.groupName,
    `$${txn.amountPaid.toLocaleString()}`,
    txn.date,
    `${txn.interestRate}%`,
    `$${txn.amountToReturn.toLocaleString()}`,
    txn.dateOfReturn,
    txn.status === 'reserve_used' ? 'Reserve Used' : txn.status
  ]);
  
  doc.autoTable({
    head: [['Member Name', 'Phone', 'Group', 'Amount Paid', 'Date', 'Interest', 'Return Amount', 'Return Date', 'Status']],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [26, 31, 54],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 15 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 },
    },
  });
  
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('SafetyMint - Secure Loan Management', 14, finalY);
  
  doc.save('safetymint-transactions.pdf');
}