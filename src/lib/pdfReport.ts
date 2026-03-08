import { supabase } from "@/integrations/supabase/client";

interface PDFReportData {
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  dateFrom: string;
  dateTo: string;
  totalRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
  expenseBreakdown: { category: string; amount: number }[];
  totalDues: number;
  partnerShares: { name: string; role: string; pct: number; profitShare: number; totalCap: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

export async function fetchReportData(
  businessId: string,
  exchangeRate: number,
  from: Date,
  to: Date
): Promise<PDFReportData> {
  const start = from.toISOString();
  const end = to.toISOString();

  const [bizRes, salesRes, expRes, custRes, partnersRes, capsRes] = await Promise.all([
    supabase.from("businesses").select("name, phone, address").eq("id", businessId).single(),
    supabase.from("sales").select("unit_price_bdt, quantity, expected_profit, due, item_id, inventory_items(name)")
      .eq("business_id", businessId).gte("created_at", start).lte("created_at", end),
    supabase.from("expenses").select("amount, currency, category")
      .eq("business_id", businessId).gte("created_at", start).lte("created_at", end),
    supabase.from("customers").select("total_due").eq("business_id", businessId),
    supabase.from("partners").select("id, name, role, status").eq("business_id", businessId).eq("status", "accepted"),
    supabase.from("capital_contributions").select("partner_id, amount, currency").eq("business_id", businessId),
  ]);

  const biz = bizRes.data || { name: "Business", phone: "", address: "" };
  const sales = salesRes.data || [];
  const expenses = expRes.data || [];

  const totalRevenue = sales.reduce((s, r) => s + r.unit_price_bdt * r.quantity, 0);
  const totalProfit = sales.reduce((s, r) => s + r.expected_profit, 0);
  const costOfGoods = totalRevenue - totalProfit;
  const totalDues = (custRes.data || []).reduce((s, c) => s + c.total_due, 0);

  const totalExpenses = expenses.reduce((s, e) => s + (e.currency === "BDT" ? e.amount : e.amount * exchangeRate), 0);
  const catMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + (e.currency === "BDT" ? e.amount : e.amount * exchangeRate);
  });
  const expenseBreakdown = Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

  const netProfit = totalRevenue - costOfGoods;
  const grossProfit = totalRevenue - costOfGoods;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Top items
  const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  sales.forEach((s: any) => {
    const name = s.inventory_items?.name || "Unknown";
    if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
    itemMap[name].quantity += s.quantity;
    itemMap[name].revenue += s.unit_price_bdt * s.quantity;
  });
  const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Partner shares
  const partners = partnersRes.data || [];
  const caps = capsRes.data || [];
  const pShares = partners.map((p) => {
    const pCaps = caps.filter((c) => c.partner_id === p.id);
    const totalCap = pCaps.reduce((s, c) => s + (c.currency === "RMB" ? c.amount * exchangeRate : c.amount), 0);
    return { ...p, totalCap };
  });
  const grandTotal = pShares.reduce((s, p) => s + p.totalCap, 0);
  const partnerShares = pShares.map((p) => ({
    name: p.name,
    role: p.role,
    pct: grandTotal > 0 ? (p.totalCap / grandTotal * 100) : 0,
    profitShare: grandTotal > 0 ? (p.totalCap / grandTotal * netProfit) : 0,
    totalCap: p.totalCap,
  }));

  return {
    businessName: biz.name,
    businessPhone: biz.phone || undefined,
    businessAddress: biz.address || undefined,
    dateFrom: from.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    dateTo: to.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    totalRevenue, costOfGoods, grossProfit, totalExpenses, netProfit, margin,
    expenseBreakdown, totalDues, partnerShares, topItems,
  };
}

export function generatePDFHTML(data: PDFReportData): string {
  const fmt = (n: number) => "৳" + Math.round(n).toLocaleString("en-IN");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${data.businessName} - Business Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; color: #2563eb; margin-bottom: 4px; }
  .header p { color: #64748b; font-size: 13px; }
  .period { background: #f1f5f9; border-radius: 8px; padding: 12px 20px; text-align: center; margin-bottom: 24px; font-size: 14px; font-weight: 600; color: #334155; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 16px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
  .metric .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
  .metric .value { font-size: 22px; font-weight: 800; margin-top: 4px; color: #1e293b; }
  .metric .value.green { color: #059669; }
  .metric .value.red { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 12px; background: #f1f5f9; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .total-row { background: #f0fdf4; font-weight: 700; }
  .total-row.loss { background: #fef2f2; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 11px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="header">
  <h1>${data.businessName}</h1>
  ${data.businessPhone ? `<p>📞 ${data.businessPhone}</p>` : ""}
  ${data.businessAddress ? `<p>📍 ${data.businessAddress}</p>` : ""}
</div>
<div class="period">Business Summary: ${data.dateFrom} — ${data.dateTo}</div>

<div class="metrics">
  <div class="metric"><div class="label">Revenue</div><div class="value">${fmt(data.totalRevenue)}</div></div>
  <div class="metric"><div class="label">Expenses</div><div class="value red">${fmt(data.totalExpenses)}</div></div>
  <div class="metric"><div class="label">Net Profit</div><div class="value ${data.netProfit >= 0 ? "green" : "red"}">${fmt(data.netProfit)}</div></div>
  <div class="metric"><div class="label">Margin</div><div class="value">${data.margin.toFixed(1)}%</div></div>
</div>

<div class="section">
  <div class="section-title">Profit & Loss Statement</div>
  <table>
    <tr><td>Total Revenue</td><td class="text-right font-bold">${fmt(data.totalRevenue)}</td></tr>
    <tr><td style="padding-left:24px;color:#64748b">− Cost of Goods Sold</td><td class="text-right" style="color:#dc2626">${fmt(data.costOfGoods)}</td></tr>
    <tr style="background:#f8fafc"><td class="font-bold">Gross Profit</td><td class="text-right font-bold" style="color:${data.grossProfit >= 0 ? "#059669" : "#dc2626"}">${fmt(data.grossProfit)}</td></tr>
    <tr><td class="font-bold">Operating Expenses</td><td class="text-right font-bold" style="color:#dc2626">${fmt(data.totalExpenses)}</td></tr>
    ${data.expenseBreakdown.map(e => `<tr><td style="padding-left:24px;color:#64748b">${e.category}</td><td class="text-right" style="color:#64748b">${fmt(e.amount)}</td></tr>`).join("")}
    <tr class="total-row ${data.netProfit < 0 ? "loss" : ""}"><td class="font-bold">Net Profit (Margin: ${data.margin.toFixed(1)}%)</td><td class="text-right font-bold" style="color:${data.netProfit >= 0 ? "#059669" : "#dc2626"}">${fmt(data.netProfit)}</td></tr>
  </table>
</div>

${data.topItems.length > 0 ? `
<div class="section">
  <div class="section-title">Top Selling Items</div>
  <table>
    <thead><tr><th>Item</th><th class="text-right">Qty Sold</th><th class="text-right">Revenue</th></tr></thead>
    <tbody>
      ${data.topItems.map(i => `<tr><td>${i.name}</td><td class="text-right">${i.quantity}</td><td class="text-right font-bold">${fmt(i.revenue)}</td></tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

${data.partnerShares.length > 0 ? `
<div class="section">
  <div class="section-title">Partner Profit Distribution</div>
  <table>
    <thead><tr><th>Partner</th><th>Role</th><th class="text-right">Equity</th><th class="text-right">Capital</th><th class="text-right">Profit Share</th></tr></thead>
    <tbody>
      ${data.partnerShares.map(p => `<tr><td class="font-bold">${p.name}</td><td style="text-transform:capitalize">${p.role}</td><td class="text-right">${p.pct.toFixed(1)}%</td><td class="text-right">${fmt(p.totalCap)}</td><td class="text-right font-bold" style="color:${p.profitShare >= 0 ? "#059669" : "#dc2626"}">${fmt(p.profitShare)}</td></tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<div class="section">
  <div class="section-title">Outstanding Receivables</div>
  <p style="font-size:14px">Total customer dues: <strong style="color:${data.totalDues > 0 ? "#dc2626" : "#059669"}">${fmt(data.totalDues)}</strong></p>
</div>

<div class="footer">
  Generated on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · ${data.businessName}
</div>
</body></html>`;
}

export function downloadPDF(html: string, filename: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
}
