import React, { useMemo } from 'react';
import { ProductData } from '../types';
import { findTitleKey, findImageKey } from '../utils/excelParser';
import { ImageOff, Eye } from 'lucide-react';

interface ProductCardProps {
  data: ProductData;
  headers: string[];
  onClick: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ data, headers, onClick }) => {
  const titleKey = useMemo(() => findTitleKey(headers), [headers]);
  const imageKey = useMemo(() => findImageKey(headers, data), [headers, data]);

  const title = String(data[titleKey] || '未命名产品');
  const imageUrl = imageKey ? String(data[imageKey]) : null;

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
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback / Placeholder */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-400 ${imageUrl ? 'hidden' : ''}`}>
           <ImageOff className="w-10 h-10 mb-2 opacity-50" />
           <span className="text-xs text-center line-clamp-2">{title}</span>
        </div>

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
          {title}
        </h3>
        
        {price && (
            <div className="mt-2 text-lg font-bold text-blue-600">
                {String(price)}
            </div>
        )}
        
        {/* Render a few tags/meta if available (excluding title, image, price) */}
        <div className="mt-3 flex flex-wrap gap-1">
            {headers
                .filter(k => k !== titleKey && k !== imageKey && k !== priceKey)
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
