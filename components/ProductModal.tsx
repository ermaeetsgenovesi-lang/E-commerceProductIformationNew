import React, { useMemo, useEffect, useState } from 'react';
import { ProductData } from '../types';
import { findTitleKey, findImageKey } from '../utils/excelParser';
import { X, Copy, Check, Image as ImageIcon, ExternalLink, Info } from 'lucide-react';

interface ProductModalProps {
  data: ProductData | null;
  headers: string[];
  isOpen: boolean;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ data, headers, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset error state when data changes
  useEffect(() => {
    setImgError(false);
  }, [data]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  const titleKey = useMemo(() => findTitleKey(headers), [headers]);
  const imageKey = useMemo(() => data ? findImageKey(headers, data) : null, [headers, data]);

  if (!isOpen || !data) return null;

  const title = String(data[titleKey] || '产品详情');
  const imageUrl = imageKey ? String(data[imageKey]) : null;

  const handleCopy = () => {
    const textData = headers.map(h => `${h}: ${data[h]}`).join('\n');
    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-7xl bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row h-full md:h-[90vh] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Mobile Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 lg:hidden p-2 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Left Side: Visual Focus (First Visual) */}
        <div className="w-full lg:w-3/5 bg-slate-950 relative flex items-center justify-center p-4 lg:p-12 overflow-hidden flex-shrink-0 min-h-[40vh] lg:min-h-auto">
           {/* Decorative background elements */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 to-transparent pointer-events-none" />
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
           
           {imageUrl && !imgError ? (
               <img 
                 src={imageUrl} 
                 alt={title} 
                 onError={handleImageError}
                 className="relative w-full h-full object-contain drop-shadow-2xl shadow-black/50 transition-transform duration-300"
               />
           ) : (
               <div className="flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 p-12 rounded-2xl border border-slate-800">
                   <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
                        <ImageIcon className="w-12 h-12 text-slate-600" />
                   </div>
                   <p className="font-medium text-slate-400 text-lg">暂无图片预览</p>
                   <p className="text-sm text-slate-600 mt-2">无法加载图片资源</p>
               </div>
           )}

           {/* Image Caption/Source if available */}
           {imageUrl && (
             <div className="absolute bottom-4 left-4 right-4 text-center opacity-0 hover:opacity-100 transition-opacity">
               <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-slate-400 hover:text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                 <ExternalLink className="w-3 h-3 mr-1" /> 查看原图
               </a>
             </div>
           )}
        </div>

        {/* Right Side: Information Details */}
        <div className="w-full lg:w-2/5 flex flex-col h-full bg-white relative shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
          
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-slate-100 bg-white z-10 sticky top-0">
             <div className="flex justify-between items-start gap-4">
                 <div className="flex-1">
                     <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 tracking-wide uppercase">
                            <Info className="w-3 h-3 mr-1" /> 产品详情
                        </span>
                     </div>
                     <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight line-clamp-3">
                        {title}
                     </h2>
                 </div>
                 
                 {/* Desktop Tools */}
                 <div className="hidden lg:flex items-center gap-2">
                    <button 
                        onClick={handleCopy}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                        title="复制详情"
                    >
                        {copied ? <Check className="w-6 h-6 text-green-600" /> : <Copy className="w-6 h-6" />}
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                    >
                        <X className="w-6 h-6" />
                    </button>
                 </div>
             </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-slate-50/50">
             <div className="grid grid-cols-1 gap-6">
                {headers.map((key) => {
                    // Skip the image URL in the text list if it's the main visual, unless it failed to load
                    if (key === imageKey && !imgError) return null;
                    
                    const value = data[key];
                    if (value === "" || value === undefined || value === null) return null;
                    
                    const isLongText = String(value).length > 50;

                    return (
                        <div key={key} className={`group bg-white p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all ${isLongText ? 'col-span-1' : ''}`}>
                            <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                {key}
                            </dt>
                            <dd className="text-sm md:text-base text-slate-700 font-medium whitespace-pre-wrap break-words leading-relaxed">
                                {String(value)}
                            </dd>
                        </div>
                    );
                })}
             </div>
          </div>
          
          {/* Mobile Copy Button */}
          <div className="p-4 border-t border-slate-100 lg:hidden bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] sticky bottom-0 z-20">
            <button 
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all ${
                    copied ? 'bg-green-500 text-white shadow-green-200' : 'bg-slate-900 text-white shadow-slate-300'
                } shadow-lg active:scale-95`}
            >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? '已复制' : '复制所有信息'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};