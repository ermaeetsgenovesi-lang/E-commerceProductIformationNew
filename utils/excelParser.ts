import * as XLSX from 'xlsx';
import { ParsedSheet, ProductData } from '../types';

export const parseExcelFile = (file: File): Promise<ParsedSheet> => {
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
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse to JSON
        const rawData = XLSX.utils.sheet_to_json<ProductData>(sheet, { defval: "" });
        
        if (rawData.length === 0) {
          resolve({ headers: [], data: [] });
          return;
        }

        // Extract headers from the first row keys
        const headers = Object.keys(rawData[0]);

        resolve({
          headers,
          data: rawData
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

/**
 * Heuristics to identify the "Title" column
 */
export const findTitleKey = (headers: string[]): string => {
  const candidates = [
    'name', 'title', 'product', 'brand', 'model', 'item',
    '名称', '产品', '标题', '品牌', '型号', '品名', '款式', '商品', '款号', '名字'
  ];
  // Prioritize exact matches or startsWith for better accuracy
  const found = headers.find(h => candidates.some(c => h.toLowerCase().includes(c)));
  return found || headers[0] || '';
};

/**
 * Advanced Heuristics to identify the "Image" column using a scoring system
 */
export const findImageKey = (headers: string[], rowData: ProductData): string | null => {
  if (!headers.length) return null;

  const candidates = headers.map(key => {
    let score = 0;
    const lowerKey = key.toLowerCase();
    const val = String(rowData[key] || '').trim();

    // 1. Header Analysis (High Priority)
    // Strong keywords (English & Chinese)
    if (['image', 'img', 'pic', 'photo', 'picture', 'thumbnail', '图', '相片', '封面', '展示', '照片', '外观', '预览'].some(k => lowerKey.includes(k))) score += 20;
    // Specific Chinese exact-ish matches for main images
    if (['主图', '产品图', '商品图片', '图片链接', '图片地址'].some(k => lowerKey === k || lowerKey.includes(k))) score += 30;

    // Weak keywords (might be just a link)
    if (['url', 'link', '链接', '地址', 'src', 'href'].some(k => lowerKey.includes(k))) score += 5;

    // 2. Content Analysis (Critical)
    // Check for image extensions
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|ico)(\?.*)?$/i.test(val)) score += 40;
    
    // Check for URL structure
    if (val.startsWith('http') || val.startsWith('https') || val.startsWith('data:image')) score += 15;
    
    // Check for common image path keywords in content
    if (val.includes('/images/') || val.includes('/img/') || val.includes('photos') || val.includes('uploads')) score += 10;

    // 3. Negative signals
    // If text is very long, likely description. 
    // However, some signed URLs are long, so we only penalize if it contains spaces or newlines which URLs shouldn't have (mostly).
    if (val.length > 500 && !val.startsWith('data:image') && !val.startsWith('http')) score -= 50;
    
    // If it contains newlines, it's definitely text/description
    if (val.includes('\n') || val.includes('\r')) score -= 100;

    // If it looks like a price
    if (/^[¥$￥€£]/.test(val)) score -= 50;
    
    // If the value is empty, we can't be sure it's an image based on content, but header might still suggest it.
    // We don't penalize empty values heavily if the header is strong, allowing placeholders to work.

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
  const fallback = candidates.find(c => (c.val.startsWith('http') || c.val.startsWith('/')) && c.score > 0);
  if (fallback) return fallback.key;

  return null;
};