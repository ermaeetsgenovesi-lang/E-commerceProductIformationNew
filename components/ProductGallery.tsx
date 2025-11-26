import React, { useState, useRef, useMemo } from 'react';
import { ParsedSheet, ProductData } from '../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { Search, RefreshCw, FolderInput, ImagePlus, Layers, Box } from 'lucide-react';

interface ProductGalleryProps {
  sheets: ParsedSheet[];
  onReset: () => void;
}

// Helper interface to keep track of item origin
interface GalleryItem {
  data: ProductData;
  headers: string[];
  sourceSheetName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ sheets, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  
  // Stores selected product, its headers, and the brand name for the modal
  const [selectedItem, setSelectedItem] = useState<{data: ProductData, headers: string[], brand: string} | null>(null);
  
  // Map of filename (without extension) -> Blob URL
  const [localImageMap, setLocalImageMap] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Prepare Brand List (from Sheet Names)
  const brands = useMemo(() => sheets.map(s => s.name), [sheets]);

  // 2. Prepare Display Data based on Active Tab
  const displayItems: GalleryItem[] = useMemo(() => {
    let items: GalleryItem[] = [];

    if (activeTab === 'ALL') {
        // Flatten all sheets
        items = sheets.flatMap(sheet => 
            sheet.data.map(row => ({
                data: row,
                headers: sheet.headers,
                sourceSheetName: sheet.name
            }))
        );
    } else {
        const targetSheet = sheets.find(s => s.name === activeTab);
        if (targetSheet) {
            items = targetSheet.data.map(row => ({
                data: row,
                headers: targetSheet.headers,
                sourceSheetName: targetSheet.name
            }));
        }
    }

    return items;
  }, [sheets, activeTab]);

  // 3. Filter Logic
  const filteredItems = useMemo(() => {
    if (!searchTerm) return displayItems;
    
    const term = searchTerm.toLowerCase();
    return displayItems.filter(item => 
        Object.values(item.data).some(val => 
            String(val).toLowerCase().includes(term)
        )
    );
  }, [displayItems, searchTerm]);

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newMap = new Map<string, string>(localImageMap);
      let count = 0;

      Array.from(files).forEach((file: File) => {
          if (file.type.startsWith('image/')) {
              const url = URL.createObjectURL(file);
              const keyWithoutExt = file.name.replace(/\.[^/.]+$/, "");
              newMap.set(keyWithoutExt, url);
              newMap.set(file.name, url);
              count++;
          }
      });

      setLocalImageMap(newMap);
      alert(`成功加载 ${count} 张本地图片！现在系统会自动将它们匹配到产品数据中。`);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

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
                      placeholder={`在 ${activeTab === 'ALL' ? '所有品牌' : activeTab} 中搜索...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>

              <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderUpload}
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors border border-blue-200"
                    title="上传包含产品图片的文件夹，系统会自动按名称匹配"
                >
                    <FolderInput className="w-4 h-4" />
                    <span className="hidden sm:inline">匹配本地图库</span>
                </button>

                <button 
                    onClick={onReset}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">重置</span>
                </button>
              </div>
          </div>
       </div>

       {/* Main Content */}
       <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            
            {/* Brand Filter Tabs (Sheets) */}
            <div className="mb-8 overflow-x-auto pb-2 custom-scrollbar">
                <div className="flex items-center gap-2 min-w-max">
                    <button
                        onClick={() => setActiveTab('ALL')}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm
                            ${activeTab === 'ALL' 
                                ? 'bg-slate-800 text-white shadow-slate-300 scale-105' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}
                        `}
                    >
                        <Layers className="w-4 h-4" />
                        所有品牌
                    </button>
                    
                    <div className="w-px h-6 bg-slate-300 mx-2" />
                    
                    {brands.map(brand => (
                        <button
                            key={brand}
                            onClick={() => setActiveTab(brand)}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shadow-sm
                                ${activeTab === brand 
                                    ? 'bg-blue-600 text-white shadow-blue-200 scale-105' 
                                    : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'}
                            `}
                        >
                            <Box className="w-3 h-3 opacity-70" />
                            {brand}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {activeTab === 'ALL' ? '全部产品' : activeTab} 
                        <span className="text-slate-400 text-lg font-normal">({filteredItems.length})</span>
                    </h2>
                    {localImageMap.size > 0 && (
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                            <ImagePlus className="w-3 h-3 mr-1" />
                            已加载 {localImageMap.size} 张本地图片
                        </p>
                    )}
                </div>
                
                {localImageMap.size === 0 && (
                    <div className="text-sm bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-200 flex items-center">
                        <span className="mr-2">💡</span>
                        提示：可使用“匹配本地图库”批量上传图片文件夹
                    </div>
                )}
            </div>
            
            {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                    {filteredItems.map((item, index) => (
                        <div key={`${item.sourceSheetName}-${index}`} className="relative">
                            {/* If viewing ALL, show a small badge for the brand */}
                            {activeTab === 'ALL' && (
                                <div className="absolute -top-2 left-2 z-10 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md shadow-md opacity-90 pointer-events-none">
                                    {item.sourceSheetName}
                                </div>
                            )}
                            <ProductCard 
                                data={item.data} 
                                headers={item.headers}
                                onClick={() => setSelectedItem({ 
                                    data: item.data, 
                                    headers: item.headers,
                                    brand: item.sourceSheetName 
                                })}
                                localImageMap={localImageMap}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <Search className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">未找到符合条件的产品</p>
                    <p className="text-sm mt-2 opacity-60">请尝试切换品牌或清除搜索关键词</p>
                    <button 
                        onClick={() => {
                            setSearchTerm('');
                            setActiveTab('ALL');
                        }}
                        className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-medium transition-colors"
                    >
                        清除所有筛选
                    </button>
                </div>
            )}
       </main>

       <ProductModal 
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          data={selectedItem?.data || null}
          headers={selectedItem?.headers || []}
          brandName={selectedItem?.brand}
          localImageMap={localImageMap}
       />
    </div>
  );
};