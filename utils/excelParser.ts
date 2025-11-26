import * as XLSX from 'xlsx';
import { ParsedSheet, ProductData } from '../types';

export const parseExcelFile = (file: File): Promise<ParsedSheet[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("文件内容为空"));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        
        const result: ParsedSheet[] = [];

        // Iterate over all sheets
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<ProductData>(sheet, { defval: "" });
            
            if (rawData.length > 0) {
                // Extract headers from the first row keys
                const headers = Object.keys(rawData[0]);
                result.push({
                    name: sheetName,
                    headers,
                    data: rawData
                });
            }
        });

        if (result.length === 0) {
           // Fallback if no data found in any sheet
           resolve([]);
           return;
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

/**
 * Scans an Excel file for a row matching the provided identifiers.
 * Returns the values and formulas for that row.
 */
export const parseExcelAndFindRow = (
  file: File, 
  identifiers: string[]
): Promise<{
  found: boolean;
  sheetName?: string;
  rowData?: Record<string, any>;
  formulas?: Record<string, string>;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return resolve({ found: false });

        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Iterate through all sheets to find a match
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          // Get data as array of arrays (header: 1) to easily access by index
          const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          
          if (jsonData.length < 2) continue;

          // Assume first row is headers
          const headers = jsonData[0].map(h => String(h));
          
          // Search for the row
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const rowStr = row.join(' ').toLowerCase();
            
            // Loose matching: check if any identifier is contained in the row string
            const match = identifiers.some(id => id && rowStr.includes(id.toLowerCase()));
            
            if (match) {
              // Found match! Extract data and formulas
              const rowData: Record<string, any> = {};
              const formulas: Record<string, string> = {};

              headers.forEach((header, colIndex) => {
                const val = row[colIndex];
                rowData[header] = val;

                // Get formula from raw sheet cell object if available
                const cellRef = XLSX.utils.encode_cell({ r: i, c: colIndex });
                const cell = sheet[cellRef];
                if (cell && cell.f) {
                  formulas[header] = cell.f;
                }
              });

              resolve({
                found: true,
                sheetName,
                rowData,
                formulas
              });
              return;
            }
          }
        }
        
        resolve({ found: false });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * Heuristics to identify the "Title" column
 */
export const findTitleKey = (headers: string[]): string => {
  const candidates = [
    'name', 'title', 'product', 'brand', 'model', 'item', 'sku',
    '名称', '产品', '标题', '型号', '品名', '款式', '商品', '款号', '名字', '货号'
  ];
  // Prioritize exact matches or startsWith for better accuracy
  const found = headers.find(h => candidates.some(c => h.toLowerCase().includes(c)));
  return found || headers[0] || '';
};

/**
 * Heuristics to identify the "Brand" column
 */
export const findBrandKey = (headers: string[]): string | null => {
  const candidates = [
    'brand', 'vendor', 'manufacturer', 'make',
    '品牌', '厂商', '厂家', '商标', '牌子', '分类', '系列', 'category'
  ];
  
  // 1. Exact match priority
  const exact = headers.find(h => candidates.includes(h.toLowerCase().trim()));
  if (exact) return exact;

  // 2. Partial match
  const found = headers.find(h => candidates.some(c => h.toLowerCase().includes(c)));
  return found || null;
};

/**
 * Utility to extract the first valid image URL from a string.
 * Handles:
 * - Comma/Semicolon/Pipe separated lists
 * - Whitespace
 * - Mixed text (naive extraction)
 */
export const extractFirstImageUrl = (value: any): string | null => {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;

    // Common separators in CSV exports: comma, semicolon, pipe, newline, space
    // Split by these chars to find potential URLs
    const parts = str.split(/[,;| \n\r\t]+/);

    for (const part of parts) {
        const p = part.trim();
        // Check for common image extensions or http protocol
        // We are lenient here to catch signed URLs which might not end in .jpg
        if (p.match(/^https?:\/\/.+/) || p.match(/^data:image\/.+/)) {
            // Remove any surrounding quotes or query params if they look broken (basic cleanup)
            return p.replace(/['"]/g, '');
        }
        if (p.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
             // If it looks like a relative path or filename, we return it. 
             // Note: Browser can't render local paths like C:\, but can render relative if hosted properly.
             return p;
        }
    }
    return null;
};

/**
 * Advanced Heuristics to identify the "Image" column using a scoring system
 */
export const findImageKey = (headers: string[], rowData: ProductData): string | null => {
  if (!headers.length) return null;

  const candidates = headers.map(key => {
    let score = 0;
    const lowerKey = key.toLowerCase();
    const rawVal = rowData[key];
    const val = String(rawVal || '').trim();

    // 1. Header Analysis (High Priority)
    // Strong keywords (English & Chinese)
    if (['image', 'img', 'pic', 'photo', 'picture', 'thumbnail', 'asset', 'gallery', '图', '相片', '封面', '展示', '照片', '外观', '预览'].some(k => lowerKey.includes(k))) score += 20;
    // Specific Chinese exact-ish matches for main images
    if (['主图', '产品图', '商品图片', '图片链接', '图片地址', '宝贝图片', '款式图'].some(k => lowerKey === k || lowerKey.includes(k))) score += 30;

    // Weak keywords (might be just a link)
    if (['url', 'link', '链接', '地址', 'src', 'href'].some(k => lowerKey.includes(k))) score += 5;

    // 2. Content Analysis (Critical)
    // Check if we can extract a URL using our helper
    const extractedUrl = extractFirstImageUrl(val);
    
    if (extractedUrl) {
        score += 20; // Valid URL found
        if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|ico)(\?.*)?$/i.test(extractedUrl)) {
            score += 30; // Explicit image extension
        }
        if (extractedUrl.includes('data:image')) {
            score += 40; // Base64 image
        }
    }
    
    // Check for common image path keywords in content even if URL regex failed (e.g. relative paths)
    if (val.includes('/images/') || val.includes('/img/') || val.includes('photos') || val.includes('uploads')) score += 10;

    // 3. Negative signals
    // If it contains newlines but NO http links, it's likely description text
    if ((val.includes('\n') || val.includes('\r')) && !extractedUrl) score -= 100;

    // If it looks like a price
    if (/^[¥$￥€£]/.test(val)) score -= 50;

    // If text is extremely short (like "0", "1", "true") and not an extension, likely boolean or ID
    if (val.length < 5 && !val.includes('.')) score -= 10;

    return { key, score, val };
  });

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Return the best candidate if it has a positive score significant enough
  const best = candidates[0];
  
  // Threshold to decide if we found a valid image column
  if (best && best.score > 10) {
      return best.key;
  }
  
  // Fallback: If no strong signal but we have a "link" column with http value, take it
  const fallback = candidates.find(c => extractFirstImageUrl(c.val));
  if (fallback) return fallback.key;

  return null;
};

/**
 * Attempts to find a matching local image for a given product row.
 * It checks values in the row against the keys in the localImageMap.
 */
export const findLocalImageMatch = (data: ProductData, localImageMap: Map<string, string>): string | null => {
    if (localImageMap.size === 0) return null;

    const values = Object.values(data);
    
    for (const val of values) {
        if (!val) continue;
        const strVal = String(val).trim();
        
        // 1. Try exact filename match (assuming cell contains "photo.jpg")
        // We strip extension from cell value just in case, but usually key in map is without extension
        const cleanVal = strVal.replace(/\.[^/.]+$/, ""); 
        
        // Check case-insensitive
        const match = Array.from(localImageMap.entries()).find(([key]) => key.toLowerCase() === cleanVal.toLowerCase());
        if (match) return match[1];

        // 2. Try strict match if the cell is exactly the key (e.g. SKU "A123" matches "A123.jpg")
        if (localImageMap.has(strVal)) return localImageMap.get(strVal)!;
        if (localImageMap.has(cleanVal)) return localImageMap.get(cleanVal)!;
    }

    return null;
};

/**
 * Helper to parse price strings like "¥100", "100元", "1,200.00" to number
 */
export const parseCurrency = (value: any): number => {
    if (!value) return 0;
    const str = String(value);
    // Remove all non-numeric chars except dot
    const clean = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

/**
 * Helper to parse weight strings to Grams (g)
 * Supports: "500", "500g", "0.5kg", "1斤"
 */
export const parseWeightToGrams = (value: any): number => {
    if (!value) return 0;
    const str = String(value).toLowerCase().trim();
    
    // Extract number
    const numMatch = str.match(/[0-9.]+/);
    if (!numMatch) return 0;
    const num = parseFloat(numMatch[0]);

    if (str.includes('kg') || str.includes('公斤')) {
        return num * 1000;
    }
    if (str.includes('斤')) {
        return num * 500;
    }
    // Default assumes 'g' or raw number is grams if not specified usually in shipping context
    if (!str.includes('g') && !str.includes('斤')) {
        if (num < 10) return num * 1000;
        return num;
    }

    return num;
};