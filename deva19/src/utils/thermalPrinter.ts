import { Invoice, StoreSettings } from '../types';

export function printThermalReceipt(invoice: Invoice, settings?: StoreSettings | null) {
  const shopName = settings?.shop_name || 'தேவராஜ் பட்டாசு கடை // DEVARAJ TRADERS';
  const address = settings?.address || 'நெ.27, கீழ்கதிர்பூர் புதிய பைபாஸ், நயாரா பெட்ரோல் பங்க் எதிரில்';
  const city = `${settings?.city || 'காஞ்சிபுரம்'} - ${settings?.pincode || '631502'}`;
  const phone = settings?.contact_number || '+91 98947 77176 / 94444 15380';
  const gst = settings?.gst_number || '33AAACD9981E1Z5';

  const dateStr = new Date(invoice.created_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const itemsHtml = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="text-align:left; padding: 4px 0; font-size: 11px; word-break: break-word;">${item.product_name}</td>
        <td style="text-align:center; padding: 4px 0; font-size: 11px;">${item.quantity}</td>
        <td style="text-align:right; padding: 4px 0; font-size: 11px;">₹${item.selling_price}</td>
        <td style="text-align:right; padding: 4px 0; font-size: 11px; font-weight: bold;">₹${item.item_total}</td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${invoice.invoice_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace;
            font-size: 11px;
            color: #000;
            margin: 0;
            padding: 8px 12px;
            width: 72mm;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .title { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          th { border-bottom: 1px dashed #000; font-size: 10px; padding: 4px 0; text-transform: uppercase; }
          .footer-note { font-size: 10px; text-align: center; margin-top: 10px; line-height: 1.4; }
          @media print {
            body { width: 100%; padding: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">${shopName}</div>
          <div style="font-size: 10px; font-weight: bold;">உரிமை : R.S.கோபிநாத்</div>
          <div>${address}</div>
          <div>${city}</div>
          <div>Phone: ${phone}</div>
          <div>GSTIN: ${gst}</div>
        </div>

        <div class="double-divider"></div>

        <div>
          <div><span class="bold">Bill No:</span> ${invoice.invoice_number}</div>
          <div><span class="bold">Date:</span> ${dateStr}</div>
          <div><span class="bold">Cashier:</span> ${invoice.worker_name || 'Counter Staff'}</div>
          <div><span class="bold">Customer:</span> ${invoice.customer_name}</div>
          <div><span class="bold">Mobile:</span> ${invoice.customer_mobile || '-'}</div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left;">Item</th>
              <th style="text-align:center; width: 30px;">Qty</th>
              <th style="text-align:right; width: 45px;">Rate</th>
              <th style="text-align:right; width: 50px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <div style="font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Subtotal (MRP):</span>
            <span>₹${invoice.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Factory Discount:</span>
            <span>- ₹${invoice.discount.toLocaleString('en-IN')}</span>
          </div>
          <div class="double-divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin: 4px 0;">
            <span>GRAND TOTAL:</span>
            <span>₹${invoice.grand_total.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
            <span>Payment Mode:</span>
            <span class="bold">${invoice.payment_mode} (PAID)</span>
          </div>
        </div>

        <div class="double-divider"></div>

        <div class="footer-note">
          *** THANK YOU! VISIT AGAIN ***<br/>
          Direct Factory Fresh Sivakasi Crackers<br/>
          Burst safely with adult supervision.<br/>
          ✨ WISH YOU A HAPPY DIWALI! ✨
        </div>
      </body>
    </html>
  `;

  // Hidden Iframe printing method: Bypasses browser popup blocking and works in iframes!
  let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print fallback to window.print():', e);
        window.print();
      }
    }, 250);
  }
}

