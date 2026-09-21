import { QuickBooksInventoryItem } from './api';

/**
 * Standard 19 column headers used by Shopify Inventory CSV export/import with bin locations.
 * Matches inventory_bin_new_on_hand_template.csv exactly.
 */
export const SHOPIFY_INVENTORY_CSV_HEADERS = [
  'Handle',
  'Title',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'SKU',
  'HS Code',
  'COO',
  'Location',
  'Bin name',
  'Incoming (not editable)',
  'Unavailable (not editable)',
  'Committed (not editable)',
  'Available (not editable)',
  'On hand (current)',
  'On hand (new)',
] as const;

export type ShopifyInventoryHeader = (typeof SHOPIFY_INVENTORY_CSV_HEADERS)[number];

export const DEFAULT_SHOPIFY_LOCATION = '123 William Street';
export const SHOPIFY_LOCATION_STORAGE_KEY = 'walcano_shopify_inventory_location';

export interface ShopifyExportOptions {
  location?: string;
  fillOnHandNew?: boolean; // true = populate "On hand (new)" with on-hand stock for direct Shopify import (default)
  customFilename?: string;
  defaultBinName?: string;
  includeBom?: boolean;
}

/**
 * Normalizes product name into a standard Shopify-compatible URL handle (slug).
 * e.g. "Stoneage Darkgrey 30x60 Feature Tile" -> "stoneage-darkgrey-30x60-feature-tile"
 */
export function generateShopifyHandle(text: string): string {
  if (!text) return 'product';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // collapse multiple hyphens
}

/**
 * Extracts tile dimensions (e.g. 30x60, 60x120, 600x1200) from text or SKU.
 */
export function extractSizeOption(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(\d{2,4})\s*[xX*]\s*(\d{2,4})/);
  if (match) {
    let d1 = parseInt(match[1], 10);
    let d2 = parseInt(match[2], 10);
    // Convert mm (e.g. 600x1200) to cm if >= 250 and multiple of 10
    if (d1 >= 250 && d1 % 10 === 0) d1 /= 10;
    if (d2 >= 250 && d2 % 10 === 0) d2 /= 10;
    const minD = Math.min(d1, d2);
    const maxD = Math.max(d1, d2);
    return `${minD}x${maxD} cm`;
  }

  // Check SKU patterns like WAL-STN-3060 or WAL-SAT-60120
  const skuMatch = text.match(/-(\d{2})(\d{2,3})(?:$|[^\d])/);
  if (skuMatch) {
    const d1 = parseInt(skuMatch[1], 10);
    const d2 = parseInt(skuMatch[2], 10);
    const minD = Math.min(d1, d2);
    const maxD = Math.max(d1, d2);
    return `${minD}x${maxD} cm`;
  }

  return null;
}

/**
 * Extracts tile finish descriptors from text.
 */
export function extractFinishOption(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('high gloss') || t.includes('glossy')) return 'Gloss';
  if (t.includes('polished')) return 'Polished';
  if (t.includes('matt') || t.includes('matte')) return 'Matt';
  if (t.includes('carving')) return 'Carving';
  if (t.includes('outdoor') || t.includes('paver') || t.includes('2cm')) return 'Outdoor';
  if (t.includes('feature')) return 'Feature';
  if (t.includes('glass')) return 'Glass';
  if (t.includes('satin')) return 'Satin';
  return null;
}

/**
 * Formats inventory quantity numbers cleanly without trailing zero decimals (e.g. 140 instead of 140.0).
 */
export function formatQtyCell(val: any): string {
  if (val === null || val === undefined || val === '') {
    return '';
  }
  const num = Number(val);
  if (isNaN(num)) {
    return String(val);
  }
  return Number.isInteger(num) ? num.toString() : num.toString();
}

/**
 * Escapes a cell value according to RFC 4180, matching Shopify's exact CSV export format.
 * - Empty string or null values produce empty cell (,,).
 * - Plain strings and numbers without delimiters remain unquoted.
 * - Values containing commas, double quotes, or newlines are quoted and have double quotes escaped ("").
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (stringValue === '') {
    return '';
  }
  if (
    stringValue.includes('"') ||
    stringValue.includes(',') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export interface ShopifyInventoryRowData {
  handle: string;
  title: string;
  option1Name: string;
  option1Value: string;
  option2Name: string;
  option2Value: string;
  option3Name: string;
  option3Value: string;
  sku: string;
  hsCode: string;
  coo: string;
  location: string;
  binName: string;
  incoming: string;
  unavailable: string;
  committed: string;
  available: string;
  onHandCurrent: string;
  onHandNew: string;
}

/**
 * Converts a QuickBooksInventoryItem into a structured Shopify Inventory row.
 */
export function itemToShopifyInventoryRow(
  item: QuickBooksInventoryItem,
  options?: ShopifyExportOptions
): ShopifyInventoryRowData {
  const targetLocation = (
    options?.location ||
    item.location ||
    DEFAULT_SHOPIFY_LOCATION
  ).trim();

  const fillOnHandNew = options?.fillOnHandNew !== false; // defaults to true
  const title = (item.walcano_name || item.name || item.title || '').trim();
  const handle = (item.handle || generateShopifyHandle(title)).trim();
  const sku = (item.sku || '').trim();

  // Determine options
  let opt1Name = item.option1_name || '';
  let opt1Val = item.option1_value || '';
  let opt2Name = item.option2_name || '';
  let opt2Val = item.option2_value || '';
  const opt3Name = item.option3_name || '';
  const opt3Val = item.option3_value || '';

  if (!opt1Name && !opt1Val) {
    const combinedText = `${title} ${sku} ${item.category || ''}`;
    const detectedSize = extractSizeOption(combinedText);
    const detectedFinish = extractFinishOption(combinedText);

    if (detectedSize) {
      opt1Name = 'Size';
      opt1Val = detectedSize;

      if (detectedFinish) {
        opt2Name = 'Finish';
        opt2Val = detectedFinish;
      }
    } else {
      // Standard Shopify non-variant fallback
      opt1Name = 'Title';
      opt1Val = 'Default Title';
    }
  }

  const hsCode = item.hs_code || '';
  const coo = item.coo || '';
  const binName = item.bin_name || options?.defaultBinName || '';

  const incoming = formatQtyCell(item.incoming ?? 0);
  const unavailable = formatQtyCell(item.unavailable ?? 0);
  const committed = formatQtyCell(item.committed ?? 0);

  const rawQty = item.qty_on_hand ?? 0;
  const committedNum = Number(item.committed ?? 0);
  const availableVal = item.available !== undefined ? item.available : Math.max(0, rawQty - committedNum);

  const available = formatQtyCell(availableVal);
  const onHandCurrent = formatQtyCell(item.on_hand_current !== undefined ? item.on_hand_current : rawQty);
  
  // "On hand (new)": When true, populated with current stock count so Shopify updates immediately on import
  const onHandNew = fillOnHandNew
    ? formatQtyCell(item.on_hand_new !== undefined ? item.on_hand_new : rawQty)
    : '';

  return {
    handle,
    title,
    option1Name: opt1Name,
    option1Value: opt1Val,
    option2Name: opt2Name,
    option2Value: opt2Val,
    option3Name: opt3Name,
    option3Value: opt3Val,
    sku,
    hsCode,
    coo,
    location: targetLocation,
    binName,
    incoming,
    unavailable,
    committed,
    available,
    onHandCurrent,
    onHandNew,
  };
}

/**
 * Converts row data into an array of escaped cell values matching the 19 Shopify CSV columns.
 */
export function rowDataToCells(row: ShopifyInventoryRowData): string[] {
  return [
    escapeCsvCell(row.handle),
    escapeCsvCell(row.title),
    escapeCsvCell(row.option1Name),
    escapeCsvCell(row.option1Value),
    escapeCsvCell(row.option2Name),
    escapeCsvCell(row.option2Value),
    escapeCsvCell(row.option3Name),
    escapeCsvCell(row.option3Value),
    escapeCsvCell(row.sku),
    escapeCsvCell(row.hsCode),
    escapeCsvCell(row.coo),
    escapeCsvCell(row.location),
    escapeCsvCell(row.binName),
    escapeCsvCell(row.incoming),
    escapeCsvCell(row.unavailable),
    escapeCsvCell(row.committed),
    escapeCsvCell(row.available),
    escapeCsvCell(row.onHandCurrent),
    escapeCsvCell(row.onHandNew),
  ];
}

/**
 * Generates the full CSV content string adhering to Shopify's exact format and RFC 4180.
 */
export function generateShopifyInventoryCsvString(
  items: QuickBooksInventoryItem[],
  options?: ShopifyExportOptions
): string {
  const headerLine = SHOPIFY_INVENTORY_CSV_HEADERS.join(',');
  const rowLines = items.map((item) => {
    const rowData = itemToShopifyInventoryRow(item, options);
    return rowDataToCells(rowData).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Exports an array of QuickBooksInventoryItem records to a downloadable Shopify Inventory CSV file.
 * Structure, column headers, and data format match inventory_bin_new_on_hand_template.csv exactly.
 */
export function downloadInventoryCsv(
  items: QuickBooksInventoryItem[],
  customFilenameOrOptions?: string | ShopifyExportOptions
): boolean {
  if (!items || items.length === 0) {
    return false;
  }

  const options: ShopifyExportOptions =
    typeof customFilenameOrOptions === 'string'
      ? { customFilename: customFilenameOrOptions }
      : customFilenameOrOptions || {};

  const csvBody = generateShopifyInventoryCsvString(items, options);

  // Prepend UTF-8 BOM (\uFEFF) for complete compatibility across Excel, Google Sheets, and Shopify
  const includeBom = options.includeBom !== false;
  const fileContent = includeBom ? '\uFEFF' + csvBody : csvBody;

  const blob = new Blob([fileContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = options.customFilename || `shopify_inventory_${dateStr}_${timeStr}.csv`;

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
