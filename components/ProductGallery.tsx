import React, { useState } from 'react';
import { ParsedSheet, ProductData } from '../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { Search, Grid, List, RefreshCw } from 'lucide-react';

interface ProductGalleryProps {
  sheetData: ParsedSheet;
  onReset: () => void;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ sheetData, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);

  const filteredData = sheetData.data.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Top Navigation Bar */}
       <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={onReset}
              >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-200 shadow-lg group-hover:scale-105 transition-transform">
                      P
                  </div>
                  <span className="font-bold text-slate-800 hidden sm:block">ProductVis</span>
              </div>

              <div className="flex-1 max-w-md relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-full leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                      placeholder="搜索品牌、名称或任何属性..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>

              <button 
                onClick={onReset}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">重置文件</span>
              </button>
          </div>
       </div>

       {/* Main Content */}
       <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                    产品展示 ({filteredData.length})
                </h2>
                <div className="flex items-center gap-2 text-slate-400 bg-white p-1 rounded-lg border border-slate-200">
                    <button className="p-1.5 rounded hover:bg-slate-100 text-blue-600 bg-blue-50"><Grid className="w-4 h-4" /></button>
                </div>
            </div>
            
            {filteredData.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                    {filteredData.map((item, index) => (
                        <ProductCard 
                            key={index} 
                            data={item} 
                            headers={sheetData.headers}
                            onClick={() => setSelectedProduct(item)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Search className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">未找到匹配的产品</p>
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        清除搜索
                    </button>
                </div>
            )}
       </main>

       <ProductModal 
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          data={selectedProduct}
          headers={sheetData.headers}
       />
    </div>
  );
};
