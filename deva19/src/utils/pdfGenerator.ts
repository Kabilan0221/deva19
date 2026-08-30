import { jsPDF } from 'jspdf';
import { Invoice } from '../types';
import { DEVARAJ_LOGO_BASE64 } from '../assets/logoBase64';

// Real pixel aspect ratio (width / height) of the source logo file. All PDF
// logo placements below derive their width FROM a fixed height using this
// ratio, so the artwork is never stretched/squashed out of shape.
const LOGO_ASPECT_RATIO = 1264 / 848;

// Helper to strictly sanitize text into standard ASCII so jsPDF never renders garbled characters
function cleanAscii(text: string | undefined | null, fallback: string = ''): string {
  if (!text) return fallback;
  // Strip non-ASCII characters and brackets
  const clean = text
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || fallback;
}

// Truncates `text` (with an ellipsis) so it never exceeds `maxWidthMm` when
// rendered at the doc's current font/size - prevents columns from visually
// overlapping regardless of how long a product name/content string is.
function fitText(doc: jsPDF, text: string, maxWidthMm: number): string {
  if (doc.getTextWidth(text) <= maxWidthMm) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}...`) > maxWidthMm) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

// -------------------------------------------------------------
// 1. OFFICIAL INVOICE / CASH BILL PDF GENERATOR
// -------------------------------------------------------------
export function generateInvoicePDF(invoice: Invoice, shopDetails?: any): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = 'DEVARAJ CRACKERS';
  const tagline = 'Direct Sivakasi Festival Crackers & Fireworks Outlet';
  const address = 'No.27, Kilkathirpur New Bypass, Opp. Nayara Petrol Bunk';
  const city = 'Kanchipuram - 631502, Tamil Nadu';
  const contact = 'Ph: 98947 77176 / 94444 15380';
  const gst = shopDetails?.gst_number || '33AAACD9981E1Z5';

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Festive Bar (Deep Crimson & Festive Amber)
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 5, pageWidth, 1.5, 'F');

  // Embed Official DJ Devaraj Logo Centered at Top Header
  try {
    if (DEVARAJ_LOGO_BASE64) {
      const logoHeight = 22;
      const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(DEVARAJ_LOGO_BASE64, 'JPEG', logoX, 8, logoWidth, logoHeight);
    }
  } catch (err) {
    console.warn('PDF Logo embedding note:', err);
  }

  // Shop Header Details (Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(185, 28, 28);
  doc.text(shopName, pageWidth / 2, 34, { align: 'center' });

  // Address & Contacts (Centered)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`${address}, ${city}`, pageWidth / 2, 39, { align: 'center' });
  doc.text(`${contact} | GSTIN: ${gst}`, pageWidth / 2, 43.5, { align: 'center' });

  // Header separator line
  y = 47.5;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(14, y, pageWidth - 14, y);
  doc.setDrawColor(185, 28, 28);
  doc.setLineWidth(0.2);
  doc.line(14, y + 1, pageWidth - 14, y + 1);

  // Invoice Title & Meta Badge Bar
  y += 5.5;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(14, y - 3.5, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(14, y - 3.5, pageWidth - 28, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(185, 28, 28);
  doc.text('TAX INVOICE / CASH BILL', 18, y + 2.5);

  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(`Invoice No: ${invoice.invoice_number}`, pageWidth - 18, y + 2.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const formattedDate = new Date(invoice.created_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  doc.text(`Source: ${invoice.order_source === 'WORKER_POS' ? 'Store Counter (Billing Desk)' : 'Online Web Store'}`, 18, y + 7.5);
  doc.text(`Date & Time: ${formattedDate}`, pageWidth - 18, y + 7.5, { align: 'right' });

  // Customer & Payment Info Boxes
  y += 15;
  const colWidth = (pageWidth - 32) / 2;

  // Box 1: Billed To (Customer)
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, y, colWidth, 26, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('BILLED TO (CUSTOMER DETAILS)', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text(cleanAscii(invoice.customer_name, 'Counter Customer'), 18, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text(`Mobile: ${cleanAscii(invoice.customer_mobile, 'Walk-in')}`, 18, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  const customerAddr = cleanAscii(invoice.customer_address, 'Kanchipuram, Tamil Nadu');
  const addressLines = doc.splitTextToSize(customerAddr, colWidth - 8);
  doc.text(addressLines.slice(0, 1), 18, y + 19.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('(Track your order anytime using Mobile / Invoice No)', 18, y + 23.5);

  // Box 2: Order & Payment Info
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14 + colWidth + 4, y, colWidth, 24, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('PAYMENT & FULFILLMENT', 18 + colWidth + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Payment Mode:`, 18 + colWidth + 4, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text(invoice.payment_mode || 'CASH', 50 + colWidth + 4, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`Payment Status:`, 18 + colWidth + 4, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(invoice.status || 'PAID', 50 + colWidth + 4, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`Billed By:`, 18 + colWidth + 4, y + 20);
  doc.setTextColor(20, 20, 20);
  doc.text(cleanAscii(invoice.worker_name, 'Store Billing Desk'), 50 + colWidth + 4, y + 20);

  // Product Items Table
  y += 28;
  const tableHeaderY = y;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, tableHeaderY, pageWidth - 28, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  const c1 = 16;
  const c2 = 28;
  const c3 = 105;
  const c4 = 125;
  const c5 = 145;
  const c6 = 165;
  const c7 = pageWidth - 16;

  doc.text('#', c1, tableHeaderY + 5);
  doc.text('Product Item Description', c2, tableHeaderY + 5);
  doc.text('MRP (Rs)', c3, tableHeaderY + 5, { align: 'right' });
  doc.text('Disc (Rs)', c4, tableHeaderY + 5, { align: 'right' });
  doc.text('Rate (Rs)', c5, tableHeaderY + 5, { align: 'right' });
  doc.text('Qty', c6, tableHeaderY + 5, { align: 'center' });
  doc.text('Amount (Rs)', c7, tableHeaderY + 5, { align: 'right' });

  y += 8;

  invoice.items.forEach((item, idx) => {
    if (y > doc.internal.pageSize.getHeight() - 45) {
      doc.addPage();
      y = 15;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, pageWidth - 28, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('#', c1, y + 5);
      doc.text('Product Item Description', c2, y + 5);
      doc.text('MRP (Rs)', c3, y + 5, { align: 'right' });
      doc.text('Disc (Rs)', c4, y + 5, { align: 'right' });
      doc.text('Rate (Rs)', c5, y + 5, { align: 'right' });
      doc.text('Qty', c6, y + 5, { align: 'center' });
      doc.text('Amount (Rs)', c7, y + 5, { align: 'right' });
      y += 8;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    doc.text((idx + 1).toString(), c1, y + 3.5);
    const itemName = cleanAscii(item.product_name, `Cracker Item #${item.product_id}`);
    doc.text(fitText(doc, itemName, c3 - c2 - 4), c2, y + 3.5);

    const mrp = Number(item.mrp || item.selling_price);
    const rate = Number(item.selling_price);
    const disc = mrp > rate ? (mrp - rate).toFixed(0) : '0';
    const totalLine = rate * item.quantity;

    doc.setTextColor(100, 100, 100);
    doc.text(mrp.toLocaleString('en-IN'), c3, y + 3.5, { align: 'right' });

    doc.setTextColor(185, 28, 28);
    doc.text(disc !== '0' ? disc : '-', c4, y + 3.5, { align: 'right' });

    doc.setTextColor(30, 41, 59);
    doc.text(rate.toLocaleString('en-IN'), c5, y + 3.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(item.quantity.toString(), c6, y + 3.5, { align: 'center' });

    doc.text(totalLine.toLocaleString('en-IN'), c7, y + 3.5, { align: 'right' });

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(14, y + 5.5, pageWidth - 14, y + 5.5);

    y += 6.5;
  });

  // Table Bottom Divider
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);

  // Summary Totals Table
  y += 4;
  const sumBoxWidth = 78;
  const sumBoxX = pageWidth - 14 - sumBoxWidth;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal (Total MRP):', sumBoxX, y + 3);
  doc.text(`Rs. ${invoice.subtotal.toLocaleString('en-IN')}`, pageWidth - 16, y + 3, { align: 'right' });

  y += 5;
  doc.setTextColor(22, 101, 52);
  doc.text('Factory Discount Saved:', sumBoxX, y + 3);
  doc.text(`- Rs. ${invoice.discount.toLocaleString('en-IN')}`, pageWidth - 16, y + 3, { align: 'right' });

  y += 6;
  doc.setFillColor(185, 28, 28);
  doc.roundedRect(sumBoxX - 2, y - 1, sumBoxWidth + 2, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET AMOUNT PAID:', sumBoxX + 2, y + 4.5);
  doc.text(`Rs. ${invoice.grand_total.toLocaleString('en-IN')}`, pageWidth - 16, y + 4.5, { align: 'right' });

  // Notice & Signatures
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('SAFETY & HANDLING NOTICE:', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('1. Crackers should be burst only under direct adult supervision in open grounds away from inflammable articles.', 14, y + 4);
  doc.text('2. Always keep a bucket of water and sand nearby. Wear protective cotton clothing.', 14, y + 8);
  doc.text('3. Direct Sivakasi factory price certified with 100% genuine quality & safety guarantee.', 14, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('For DEVARAJ TRADERS', pageWidth - 18, y + 4, { align: 'right' });
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('(Computer Generated Bill)', pageWidth - 18, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  doc.text('* Note: E-Sign / Physical Signature Not Required *', pageWidth - 18, y + 13.5, { align: 'right' });

  // Prominent Thank You Visit Again Festive Banner at Bottom
  y += 20;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(14, y, pageWidth - 28, 10, 1.5, 1.5, 'F');
  doc.setDrawColor(252, 165, 165);
  doc.roundedRect(14, y, pageWidth - 28, 10, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(185, 28, 28);
  doc.text('THANK YOU! VISIT AGAIN!', pageWidth / 2, y + 6.5, { align: 'center' });

  // Bottom Footer Bar
  doc.setFillColor(185, 28, 28);
  doc.rect(0, doc.internal.pageSize.getHeight() - 4, pageWidth, 4, 'F');

  return doc;
}

export function downloadInvoicePDF(invoice: Invoice, shopDetails?: any) {
  const doc = generateInvoicePDF(invoice, shopDetails);
  doc.save(`Devaraj_Crackers_${invoice.invoice_number}.pdf`);
}

// -------------------------------------------------------------
// 2. ESTIMATE / QUOTATION PDF GENERATOR
// -------------------------------------------------------------
export function generateOrderEstimatePDF(cart: { product: any; quantity: number }[], shopDetails?: any): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = 'DEVARAJ CRACKERS';
  const proprietor = 'R.S. Gopinath';
  const address = 'No.27, Kilkathirpur New Bypass, Opp. Nayara Petrol Bunk';
  const city = 'Kanchipuram - 631502, Tamil Nadu';
  const contact = 'Ph: 98947 77176 / 94444 15380';
  const upiId = '8870929100@upi';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  const drawHeader = () => {
    doc.setFillColor(185, 28, 28);
    doc.rect(0, 0, pageWidth, 5, 'F');
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 5, pageWidth, 1.5, 'F');

    try {
      if (DEVARAJ_LOGO_BASE64) {
        const logoHeight = 21;
        const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(DEVARAJ_LOGO_BASE64, 'JPEG', logoX, 8, logoWidth, logoHeight);
      }
    } catch (e) {}

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(185, 28, 28);
    doc.text(shopName, pageWidth / 2, 33, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text(`Proprietor: ${proprietor} | ${contact}`, pageWidth / 2, 38, { align: 'center' });
    doc.text(`${address}, ${city}`, pageWidth / 2, 42.5, { align: 'center' });

    y = 46.5;
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);

    y += 5;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, y - 3.5, pageWidth - 28, 11, 1.5, 1.5, 'F');
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(14, y - 3.5, pageWidth - 28, 11, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(185, 28, 28);
    doc.text('FESTIVAL CRACKERS ORDER ESTIMATE / QUOTATION', 18, y + 3);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const dateStr = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    doc.text(`Date: ${dateStr}`, pageWidth - 18, y + 3, { align: 'right' });
    y += 12;
  };

  drawHeader();

  const tableTopY = y;
  doc.setFillColor(185, 28, 28);
  doc.rect(14, tableTopY, pageWidth - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  // Fixed, non-overlapping column layout (mm). Long text is truncated with
  // an ellipsis via fitText so it can never bleed into the next column.
  const estCol = {
    sno: 18,
    name: 30,
    nameWidth: 68, // 30 -> 98
    content: 100,
    contentWidth: 24, // 100 -> 124
    mrpRight: 140,
    rateRight: 158,
    qtyRight: 170,
    totalRight: pageWidth - 18,
  };

  doc.text('S.No', estCol.sno, tableTopY + 5.5);
  doc.text('Product Name & Code', estCol.name, tableTopY + 5.5);
  doc.text('Content', estCol.content, tableTopY + 5.5);
  doc.text('Actual MRP', estCol.mrpRight, tableTopY + 5.5, { align: 'right' });
  doc.text('Rate', estCol.rateRight, tableTopY + 5.5, { align: 'right' });
  doc.text('Qty', estCol.qtyRight, tableTopY + 5.5, { align: 'right' });
  doc.text('Total (Rs)', estCol.totalRight, tableTopY + 5.5, { align: 'right' });

  y = tableTopY + 9;
  let totalMrp = 0;
  let grandTotal = 0;
  let totalItemsCount = 0;

  cart.forEach((item, index) => {
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 14;
      drawHeader();
      doc.setFillColor(185, 28, 28);
      doc.rect(14, y, pageWidth - 28, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('S.No', estCol.sno, y + 5.5);
      doc.text('Product Name & Code', estCol.name, y + 5.5);
      doc.text('Content', estCol.content, y + 5.5);
      doc.text('Actual MRP', estCol.mrpRight, y + 5.5, { align: 'right' });
      doc.text('Rate', estCol.rateRight, y + 5.5, { align: 'right' });
      doc.text('Qty', estCol.qtyRight, y + 5.5, { align: 'right' });
      doc.text('Total (Rs)', estCol.totalRight, y + 5.5, { align: 'right' });
      y += 9;
    }

    const mrp = Number(item.product.mrp || 0);
    const rate = Number(item.product.selling_price || 0);
    const qty = Number(item.quantity || 0);
    const lineTotal = rate * qty;
    const lineMrpTotal = mrp * qty;

    totalMrp += lineMrpTotal;
    grandTotal += lineTotal;
    totalItemsCount += qty;

    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, y - 1, pageWidth - 28, 7.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);

    doc.text((index + 1).toString(), estCol.sno, y + 4);
    const nameStr = cleanAscii(item.product.name, `Item #${index + 1}`);
    doc.text(fitText(doc, nameStr, estCol.nameWidth - 2), estCol.name, y + 4);
    const contentStr = cleanAscii(item.product.content, '1 Box');
    doc.text(fitText(doc, contentStr, estCol.contentWidth - 2), estCol.content, y + 4);

    doc.setTextColor(100, 100, 100);
    doc.text(`Rs.${mrp}`, estCol.mrpRight, y + 4, { align: 'right' });

    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs.${rate}`, estCol.rateRight, y + 4, { align: 'right' });

    doc.setTextColor(30, 30, 30);
    doc.text(qty.toString(), estCol.qtyRight, y + 4, { align: 'right' });

    doc.text(`Rs.${lineTotal.toLocaleString('en-IN')}`, estCol.totalRight, y + 4, { align: 'right' });

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(14, y + 6.5, pageWidth - 14, y + 6.5);

    y += 7.5;
  });

  const totalDiscount = Math.max(0, totalMrp - grandTotal);

  y += 4;
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  const boxWidth = 85;
  const boxX = pageWidth - 14 - boxWidth;

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(boxX - 2, y, boxWidth + 2, 28, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Total Selected Items:', boxX + 4, y + 5);
  doc.text(`${totalItemsCount} Pcs / Boxes`, pageWidth - 18, y + 5, { align: 'right' });

  doc.text('Total MRP Value:', boxX + 4, y + 10);
  doc.text(`Rs. ${totalMrp.toLocaleString('en-IN')}`, pageWidth - 18, y + 10, { align: 'right' });

  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('Direct Factory Savings:', boxX + 4, y + 15);
  doc.text(`- Rs. ${totalDiscount.toLocaleString('en-IN')}`, pageWidth - 18, y + 15, { align: 'right' });

  doc.setFillColor(185, 28, 28);
  doc.roundedRect(boxX, y + 18, boxWidth - 2, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE:', boxX + 4, y + 23.5);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, pageWidth - 20, y + 23.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('HOW TO CONFIRM YOUR ORDER:', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text('1. Send this PDF or your Order List to WhatsApp: 98947 77176 / 94444 15380', 14, y + 11);
  doc.text(`2. Google Pay / PhonePe UPI ID: ${upiId} (98947 77176)`, 14, y + 15);
  doc.text('3. Fast delivery to Kanchipuram, Chennai, Chengalpattu and all Tamil Nadu districts.', 14, y + 19);
  doc.text('4. Direct Sivakasi factory prices with 100% genuine quality & safety guarantee.', 14, y + 23);

  doc.setFillColor(185, 28, 28);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  return doc;
}

export function downloadOrderEstimatePDF(cart: { product: any; quantity: number }[], shopDetails?: any) {
  const doc = generateOrderEstimatePDF(cart, shopDetails);
  doc.save(`Devaraj_Crackers_Estimate_${new Date().toISOString().split('T')[0]}.pdf`);
}

// -------------------------------------------------------------
// 3. COMPLETE WHOLESALE PRICE LIST PDF GENERATOR (Full Catalog)
// -------------------------------------------------------------
export function generatePriceListPDF(products: any[], categories: any[], shopDetails?: any): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const shopName = 'DEVARAJ CRACKERS';
  const proprietor = 'R.S. Gopinath';
  const address = 'No.27, Kilkathirpur New Bypass, Opp. Nayara Petrol Bunk';
  const city = 'Kanchipuram - 631502, Tamil Nadu';
  const contact = 'Ph: 98947 77176 / 94444 15380';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;

  const drawPageHeader = () => {
    doc.setFillColor(185, 28, 28);
    doc.rect(0, 0, pageWidth, 5, 'F');
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 5, pageWidth, 1.5, 'F');

    try {
      if (DEVARAJ_LOGO_BASE64) {
        const logoHeight = 18;
        const logoWidth = logoHeight * LOGO_ASPECT_RATIO;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(DEVARAJ_LOGO_BASE64, 'JPEG', logoX, 7.5, logoWidth, logoHeight);
      }
    } catch (e) {}

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(185, 28, 28);
    doc.text(shopName, pageWidth / 2, 30, { align: 'center' });

    // Split proprietor/contact and the full address onto two separate lines
    // (rather than one long pipe-joined string) so nothing runs past the
    // page margins or overlaps the next section, regardless of address length.
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Proprietor: ${proprietor}  |  ${contact}`, pageWidth / 2, 35, { align: 'center' });
    doc.text(`${address}, ${city}`, pageWidth / 2, 39.5, { align: 'center' });

    y = 43.5;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, pageWidth - 14, y);

    y += 5;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, y - 4, pageWidth - 28, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(185, 28, 28);
    doc.text('OFFICIAL FESTIVAL CRACKERS PRICE LIST 2026', 18, y + 2.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text('UP TO 90% DIRECT FACTORY DISCOUNT', pageWidth - 18, y + 2.5, { align: 'right' });
    y += 10;
  };

  drawPageHeader();

  categories.forEach((cat) => {
    const catProds = products.filter((p) => p.category_id === cat.id && p.is_active !== false);
    if (catProds.length === 0) return;

    if (y > pageHeight - 35) {
      doc.addPage();
      y = 14;
      drawPageHeader();
    }

    const isCombo = cat.slug === 'gift-boxes' || cat.slug === 'combo-packs' || cat.name.toLowerCase().includes('combo') || cat.name.toLowerCase().includes('gift');
    const catDiscountText = isCombo ? 'NET RATE PRODUCTS' : 'UP TO 90% DISCOUNT';
    const bannerTitle = `${cleanAscii(cat.name).toUpperCase()} (${catDiscountText})`;

    doc.setFillColor(243, 232, 255);
    doc.rect(14, y, pageWidth - 28, 7.5, 'F');
    doc.setDrawColor(216, 180, 254);
    doc.rect(14, y, pageWidth - 28, 7.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(107, 33, 168);
    doc.text(bannerTitle, pageWidth / 2, y + 5, { align: 'center' });
    y += 8.5;

    // Column layout (mm from left edge). Each column has a fixed, non-
    // overlapping width; long product names / content strings are truncated
    // with an ellipsis (via fitText) instead of running into the next column.
    const col = {
      sno: 18,
      name: 26,
      nameWidth: 58, // 26 -> 84
      content: 86,
      contentWidth: 30, // 86 -> 116
      actualPriceRight: 138,
      discountRight: 164,
      priceRight: pageWidth - 16,
    };

    const drawTableHeaderRow = () => {
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('S.No', col.sno, y + 4.5);
      doc.text('Product Name', col.name, y + 4.5);
      doc.text('Content', col.content, y + 4.5);
      doc.text('Actual Price', col.actualPriceRight, y + 4.5, { align: 'right' });
      doc.text('Discount', col.discountRight, y + 4.5, { align: 'right' });
      doc.text('Price (Rs)', col.priceRight, y + 4.5, { align: 'right' });
      y += 7.5;
    };

    drawTableHeaderRow();

    catProds.forEach((prod, pIdx) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 14;
        drawPageHeader();
        drawTableHeaderRow();
      }

      const mrp = Number(prod.mrp || 0);
      const price = Number(prod.selling_price || 0);
      const discountVal = mrp > price ? (mrp - price).toFixed(0) : '-';

      if (pIdx % 2 === 1) {
        doc.setFillColor(252, 252, 252);
        doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);

      doc.text((pIdx + 1).toString(), col.sno, y + 4);
      const safeName = cleanAscii(prod.name, `Item ${pIdx + 1}`);
      doc.text(fitText(doc, safeName, col.nameWidth - 2), col.name, y + 4);
      const safeContent = cleanAscii(prod.content, '1 Box');
      doc.text(fitText(doc, safeContent, col.contentWidth - 2), col.content, y + 4);

      doc.setTextColor(110, 110, 110);
      doc.text(`Rs.${mrp}`, col.actualPriceRight, y + 4, { align: 'right' });

      doc.setTextColor(185, 28, 28);
      doc.text(discountVal !== '-' ? `Rs.${discountVal}` : '-', col.discountRight, y + 4, { align: 'right' });

      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs.${price}`, col.priceRight, y + 4, { align: 'right' });

      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.2);
      doc.line(14, y + 5.5, pageWidth - 14, y + 5.5);

      y += 6.5;
    });

    y += 4;
  });

  doc.setFillColor(185, 28, 28);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  return doc;
}

export function downloadPriceListPDF(products: any[], categories: any[], shopDetails?: any) {
  const doc = generatePriceListPDF(products, categories, shopDetails);
  doc.save(`Devaraj_Crackers_Pricelist_2026.pdf`);
}
