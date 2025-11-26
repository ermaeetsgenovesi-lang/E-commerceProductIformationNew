import React, { useMemo } from 'react';
import { ProductData } from '../types';
import { findTitleKey, findImageKey, extractFirstImageUrl, findLocalImageMatch } from '../utils/excelParser';
import { ImageOff, Eye, FolderHeart } from 'lucide-react';

interface ProductCardProps {
  data: ProductData;
  headers: string[];
  onClick: () => void;
  localImageMap?: Map<string, string>;
}

export const ProductCard: React.FC<ProductCardProps> = ({ data, headers, onClick, localImageMap }) => {
  const titleKey = useMemo(() => findTitleKey(headers), [headers]);
  
  // Try to find a specific "Name" key if it's different from the primary titleKey (which often detects Model/SKU)
  const nameKey = useMemo(() => {
     const candidates = ['名称', 'name', 'title', '品名', '名字', '标题', 'product'];
     return headers.find(h => h !== titleKey && candidates.some(c => h.toLowerCase().includes(c)));
  }, [headers, titleKey]);

  // Construct the composite display title: "Code - Name"
  const displayTitle = useMemo(() => {
      const mainVal = String(data[titleKey] || '未命名产品');
      const subVal = nameKey ? String(data[nameKey] || '') : '';
      
      // If the name exists and is different from the code, append it with a hyphen
      if (subVal && subVal !== mainVal) {
          return `${mainVal} - ${subVal}`;
      }
      return mainVal;
  }, [data, titleKey, nameKey]);

  const imageKey = useMemo(() => findImageKey(headers, data), [headers, data]);

  // 1. Try to find a local image match first
  const localImage = localImageMap ? findLocalImageMatch(data, localImageMap) : null;

  // 2. Fallback to Excel URL extraction
  const remoteUrl = imageKey ? extractFirstImageUrl(data[imageKey]) : null;

  // Final image source
  const finalImageUrl = localImage || remoteUrl;

  // Attempt to find a price field
  const priceKey = headers.find(h => h.includes('价') || h.toLowerCase().includes('price') || h.includes('金额'));
  const price = priceKey ? data[priceKey] : null;

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Image Area */}
      <div className="relative w-full pt-[100%] bg-slate-100 overflow-hidden">
        {finalImageUrl ? (
          <img 
            src={finalImageUrl} 
            alt={displayTitle}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback / Placeholder */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-400 ${finalImageUrl ? 'hidden' : ''}`}>
           <ImageOff className="w-10 h-10 mb-2 opacity-50" />
           <span className="text-xs text-center line-clamp-2">{displayTitle}</span>
        </div>

        {/* Local indicator badge */}
        {localImage && (
            <div className="absolute top-2 right-2 bg-green-500/90 text-white p-1.5 rounded-full shadow-sm z-10" title="使用本地图库">
                <FolderHeart className="w-3 h-3" />
            </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium text-slate-800 shadow-lg flex items-center">
                <Eye className="w-3 h-3 mr-1" /> 查看详情
            </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 text-sm flex-grow">
          {displayTitle}
        </h3>
        
        {price && (
            <div className="mt-2 text-lg font-bold text-red-600">
                {String(price)}
            </div>
        )}
        
        {/* Render a few tags/meta if available (excluding title, image, price, and the secondary name key) */}
        <div className="mt-3 flex flex-wrap gap-1">
            {headers
                .filter(k => k !== titleKey && k !== imageKey && k !== priceKey && k !== nameKey)
                .slice(0, 2) // Just show first 2 other properties as tags
                .map(key => {
                    const val = data[key];
                    if(!val) return null;
                    return (
                        <span key={key} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md line-clamp-1 max-w-[100px]">
                            {key}: {String(val)}
                        </span>
                    )
                })
            }
        </div>
      </div>
    </div>
  );
};