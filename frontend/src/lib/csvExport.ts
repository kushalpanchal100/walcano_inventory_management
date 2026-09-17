import { QuickBooksInventoryItem } from './api';

/**
 * Escapes a cell value for RFC 4180 compliant CSV.
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  if (
    stringValue.includes('"') ||
    stringValue.includes(',') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

/**
 * Exports an array of QuickBooksInventoryItem records to a downloadable CSV file.
 * Automatically adds UTF-8 BOM (\uFEFF) for full Microsoft Excel / Google Sheets compatibility.
 */
export function downloadInventoryCsv(
  items: QuickBooksInventoryItem[],
  customFilename?: string
): boolean {
  if (!items || items.length === 0) {
    return false;
  }

  const headers = [
    'Walcano Product Name',
    'Surfaces Product Name',
    'Mapping Status',
    'SKU',
    'Quantity on Hand',
    'Stock Status',
    'Category',
    'Type',
    'QuickBooks ID',
  ];

  const rows = items.map((item) => {
    let status = 'In Stock';
    if (item.qty_on_hand <= 0) {
      status = 'Out of Stock';
    } else if (item.qty_on_hand <= 10) {
      status = 'Low Stock';
    }

    const isMapped = Boolean(item.is_mapped);
    const surfacesName = item.surfaces_name || 'No Mapping Available';
    const mappingStatus = isMapped ? 'Mapped' : 'No Mapping Available';
    const walcanoName = item.walcano_name || item.name || '';

    return [
      escapeCsvCell(walcanoName),
      escapeCsvCell(surfacesName),
      escapeCsvCell(mappingStatus),
      escapeCsvCell(item.sku || ''),
      escapeCsvCell(item.qty_on_hand ?? 0),
      escapeCsvCell(status),
      escapeCsvCell(item.category || 'General'),
      escapeCsvCell(item.type || 'Inventory'),
      escapeCsvCell(item.id || ''),
    ].join(',');
  });

  const csvBody = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

  // Prepend UTF-8 BOM so spreadsheet viewers render special characters cleanly
  const blob = new Blob(['\uFEFF' + csvBody], {
    type: 'text/csv;charset=utf-8;',
  });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = customFilename || `quickbooks_inventory_${dateStr}_${timeStr}.csv`;

  // Trigger browser file download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
