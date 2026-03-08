import { format } from "date-fns";
import { useRef } from "react";

interface InvoiceData {
  sale: {
    id: string;
    quantity: number;
    unit_price_bdt: number;
    received_now_bdt: number;
    due: number;
    expected_profit: number;
    created_at: string;
  };
  itemName: string;
  customerName: string;
  business: {
    name: string;
    phone?: string | null;
    address?: string | null;
  };
}

interface InvoiceModalProps {
  data: InvoiceData | null;
  onClose: () => void;
}

const InvoiceModal = ({ data, onClose }: InvoiceModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const { sale, itemName, customerName, business } = data;
  const total = sale.quantity * sale.unit_price_bdt;
  const invoiceNo = `INV-${sale.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${invoiceNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
            .invoice { max-width: 700px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #111; }
            .brand h1 { font-size: 22px; font-weight: 900; }
            .brand p { font-size: 12px; color: #666; margin-top: 4px; }
            .invoice-meta { text-align: right; }
            .invoice-meta h2 { font-size: 14px; color: #666; letter-spacing: 2px; }
            .invoice-meta p { font-size: 13px; margin-top: 4px; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 28px; }
            .parties div { }
            .parties label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; font-weight: 700; }
            .parties p { font-size: 14px; font-weight: 600; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; padding: 10px 12px; border-bottom: 2px solid #ddd; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 12px; font-size: 14px; border-bottom: 1px solid #eee; }
            .totals { margin-left: auto; width: 260px; }
            .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .totals .row.bold { font-weight: 700; font-size: 16px; border-top: 2px solid #111; padding-top: 10px; margin-top: 6px; }
            .totals .row.due { color: #dc2626; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Invoice Preview</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[18px]">print</span> Print
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={printRef} className="p-6 lg:p-8">
          <div className="invoice">
            {/* Header */}
            <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 16, borderBottom: "3px solid currentColor" }}>
              <div className="brand">
                <h1 style={{ fontSize: 22, fontWeight: 900 }}>{business.name}</h1>
                {business.phone && <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{business.phone}</p>}
                {business.address && <p style={{ fontSize: 12, color: "#666" }}>{business.address}</p>}
              </div>
              <div className="invoice-meta" style={{ textAlign: "right" }}>
                <h2 style={{ fontSize: 13, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>Invoice</h2>
                <p style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{invoiceNo}</p>
                <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{format(new Date(sale.created_at), "dd MMM yyyy, hh:mm a")}</p>
              </div>
            </div>

            {/* Customer */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#999", fontWeight: 700 }}>Bill To</label>
              <p style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{customerName}</p>
            </div>

            {/* Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Item</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Qty</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Price</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "12px", fontSize: 14, borderBottom: "1px solid #eee" }}>{itemName}</td>
                  <td style={{ padding: "12px", fontSize: 14, borderBottom: "1px solid #eee", textAlign: "right" }}>{sale.quantity}</td>
                  <td style={{ padding: "12px", fontSize: 14, borderBottom: "1px solid #eee", textAlign: "right" }}>৳{sale.unit_price_bdt.toLocaleString()}</td>
                  <td style={{ padding: "12px", fontSize: 14, borderBottom: "1px solid #eee", textAlign: "right", fontWeight: 600 }}>৳{total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ marginLeft: "auto", width: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>Subtotal</span>
                <span>৳{total.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>Paid</span>
                <span style={{ color: "#16a34a" }}>৳{sale.received_now_bdt.toLocaleString()}</span>
              </div>
              {sale.due > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#dc2626" }}>
                  <span>Due</span>
                  <span style={{ fontWeight: 700 }}>৳{sale.due.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 6px", fontSize: 16, fontWeight: 700, borderTop: "2px solid #111", marginTop: 6 }}>
                <span>Total</span>
                <span>৳{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #eee", textAlign: "center", fontSize: 11, color: "#999" }}>
              Thank you for your business!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
