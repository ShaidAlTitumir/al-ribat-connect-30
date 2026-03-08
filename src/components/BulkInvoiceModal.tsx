import { format } from "date-fns";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface SaleItem {
  id: string;
  quantity: number;
  unit_price_bdt: number;
  received_now_bdt: number;
  due: number;
  created_at: string;
  inventory_items?: { name: string } | null;
}

interface BulkInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  business: { name: string; phone?: string | null; address?: string | null };
  sales: SaleItem[];
}

const BulkInvoiceModal = ({ open, onClose, customerName, business, sales }: BulkInvoiceModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(sales.map(s => s.id)));

  if (!open || sales.length === 0) return null;

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sales.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sales.map(s => s.id)));
  };

  const selectedSales = sales.filter(s => selectedIds.has(s.id));
  const grandTotal = selectedSales.reduce((s, sale) => s + sale.quantity * sale.unit_price_bdt, 0);
  const totalPaid = selectedSales.reduce((s, sale) => s + sale.received_now_bdt, 0);
  const totalDue = selectedSales.reduce((s, sale) => s + sale.due, 0);
  const invoiceNo = `BINV-${Date.now().toString(36).toUpperCase()}`;

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
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; padding: 10px 12px; border-bottom: 2px solid #ddd; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
            .totals { margin-left: auto; width: 260px; }
            .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .totals .row.bold { font-weight: 700; font-size: 16px; border-top: 2px solid #111; padding-top: 10px; margin-top: 6px; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">Bulk Invoice</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={selectedSales.length === 0}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">print</span> Print ({selectedSales.length})
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Selection controls */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-3 bg-muted/30">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input type="checkbox" checked={selectedIds.size === sales.length} onChange={toggleAll}
              className="rounded border-border" />
            Select All ({sales.length})
          </label>
          <span className="text-xs text-muted-foreground">
            {selectedSales.length} selected · Total: ৳{grandTotal.toLocaleString()}
          </span>
        </div>

        {/* Selectable list */}
        <div className="max-h-[200px] overflow-y-auto divide-y divide-border border-b border-border">
          {sales.map((sale) => (
            <label key={sale.id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer text-xs">
              <input type="checkbox" checked={selectedIds.has(sale.id)} onChange={() => toggleItem(sale.id)}
                className="rounded border-border" />
              <span className="flex-1 font-medium">{sale.inventory_items?.name || "Item"}</span>
              <span className="text-muted-foreground">{sale.quantity} × ৳{sale.unit_price_bdt}</span>
              <span className="font-bold">৳{(sale.quantity * sale.unit_price_bdt).toLocaleString()}</span>
              <span className="text-muted-foreground">{format(new Date(sale.created_at), "MMM d")}</span>
            </label>
          ))}
        </div>

        {/* Invoice Preview */}
        <div ref={printRef} className="p-6 lg:p-8">
          <div className="invoice">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 16, borderBottom: "3px solid currentColor" }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900 }}>{business.name}</h1>
                {business.phone && <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{business.phone}</p>}
                {business.address && <p style={{ fontSize: 12, color: "#666" }}>{business.address}</p>}
              </div>
              <div style={{ textAlign: "right" }}>
                <h2 style={{ fontSize: 13, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>Invoice</h2>
                <p style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{invoiceNo}</p>
                <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{format(new Date(), "dd MMM yyyy")}</p>
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
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>#</th>
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Item</th>
                  <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Date</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Qty</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Price</th>
                  <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#666", padding: "10px 12px", borderBottom: "2px solid #ddd" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedSales.map((sale, i) => (
                  <tr key={sale.id}>
                    <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #eee" }}>{i + 1}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #eee" }}>{sale.inventory_items?.name || "Item"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #eee" }}>{format(new Date(sale.created_at), "dd MMM")}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #eee", textAlign: "right" }}>{sale.quantity}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #eee", textAlign: "right" }}>৳{sale.unit_price_bdt.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #eee", textAlign: "right", fontWeight: 600 }}>৳{(sale.quantity * sale.unit_price_bdt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ marginLeft: "auto", width: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>Subtotal</span>
                <span>৳{grandTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>Paid</span>
                <span style={{ color: "#16a34a" }}>৳{totalPaid.toLocaleString()}</span>
              </div>
              {totalDue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#dc2626" }}>
                  <span>Due</span>
                  <span style={{ fontWeight: 700 }}>৳{totalDue.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 6px", fontSize: 16, fontWeight: 700, borderTop: "2px solid #111", marginTop: 6 }}>
                <span>Grand Total</span>
                <span>৳{grandTotal.toLocaleString()}</span>
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

export default BulkInvoiceModal;
