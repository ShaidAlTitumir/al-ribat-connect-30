export interface BusinessInfo {
  name?: string;
  phone?: string;
  address?: string;
}

export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  businessInfo?: BusinessInfo
) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const rows: string[] = [];

  // Add business info header rows if provided
  if (businessInfo) {
    if (businessInfo.name) rows.push(`"Business Name","${businessInfo.name.replace(/"/g, '""')}"`);
    if (businessInfo.phone) rows.push(`"Phone","${businessInfo.phone.replace(/"/g, '""')}"`);
    if (businessInfo.address) rows.push(`"Address","${businessInfo.address.replace(/"/g, '""')}"`);
    rows.push(`"Generated","${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}"`);
    rows.push(""); // blank separator row
  }

  rows.push(headers.join(","));
  data.forEach(row => {
    rows.push(
      headers.map(h => {
        const val = row[h] ?? "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    );
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
