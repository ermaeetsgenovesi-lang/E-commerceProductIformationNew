import React, { useMemo, useEffect, useState } from 'react';
import { ProductData } from '../types';
import { findTitleKey, findImageKey, extractFirstImageUrl, findLocalImageMatch, parseCurrency, parseWeightToGrams } from '../utils/excelParser';
import { X, Copy, Check, Image as ImageIcon, ExternalLink, FolderHeart, Box, Layers, FileText, Calculator, TrendingUp, DollarSign } from 'lucide-react';

interface ProductModalProps {
  data: ProductData | null;
  headers: string[];
  brandName?: string;
  isOpen: boolean;
  onClose: () => void;
  localImageMap?: Map<string, string>;
}

type TabType = 'CORE' | 'OTHERS' | 'CALC';

export const ProductModal: React.FC<ProductModalProps> = ({ data, headers, brandName, isOpen, onClose, localImageMap }) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('CORE');

  // Calculator State
  const [inputPrice, setInputPrice] = useState<string>('0');
  const [inputCost, setInputCost] = useState<string>('0');
  const [inputWeight, setInputWeight] = useState<string>('0'); // In Grams

  // Reset states and initialize calculator when data changes
  useEffect(() => {
    setImgError(false);
    setActiveTab('CORE');
    
    if (data) {
        // Initialize Calculator Inputs
        // 1. Price
        const priceK = headers.find(h => h.includes('1瓶控价') || h.includes('价格') || h.toLowerCase().includes('price') || h.includes('零售价'));
        if (priceK) setInputPrice(String(parseCurrency(data[priceK])));

        // 2. Cost
        const costK = headers.find(h => h.includes('商品成本') || h.includes('成本') || h.toLowerCase().includes('cost'));
        if (costK) setInputCost(String(parseCurrency(data[costK])));

        // 3. Weight
        const weightK = headers.find(h => h.includes('商品重量') || h.includes('重量') || h.toLowerCase().includes('weight'));
        if (weightK) setInputWeight(String(parseWeightToGrams(data[weightK])));
    }
  }, [data, headers]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  // Keys calculation
  const titleKey = useMemo(() => headers.length ? findTitleKey(headers) : '', [headers]);
  const imageKey = useMemo(() => (data && headers.length) ? findImageKey(headers, data) : null, [headers, data]);
  
  // Secondary Name Key for composite title
  const nameKey = useMemo(() => {
     const candidates = ['名称', 'name', 'title', '品名', '名字', '标题', 'product'];
     return headers.find(h => h !== titleKey && candidates.some(c => h.toLowerCase().includes(c)));
  }, [headers, titleKey]);

  // Price Key (Used for display in top header for visual impact)
  const priceKey = useMemo(() => {
      // Priority to standard price, then tiered prices
      const candidates = ['商品价格', '价格', 'price', '零售价', '1瓶控价'];
      for (const c of candidates) {
          const found = headers.find(h => h.toLowerCase().includes(c));
          if (found) return found;
      }
      return headers.find(h => h.includes('价') || h.includes('金额'));
  }, [headers]);

  // Grouping Logic based on specific user request
  const { coreHeaders, otherHeaders } = useMemo(() => {
      // Exact order and keywords requested
      const coreKeywords = [
          '产品简称', 
          '国际批准文号', 
          '商品成本', 
          '商品重量', 
          '1瓶控价', 
          '2瓶控价', 
          '3瓶控价'
      ];

      const core: string[] = [];
      const others: string[] = [];

      headers.forEach(h => {
          // Skip system keys like Title, Image Key (if used purely for image), Name Key (if used in title)
          if (h === titleKey || h === nameKey || h === imageKey) return;

          // Check if the header matches any of the target keywords
          const isCore = coreKeywords.some(k => h.includes(k));
          
          if (isCore) {
              core.push(h);
          } else {
              others.push(h);
          }
      });

      // Sort core headers to match the specific order in the definition list
      core.sort((a, b) => {
          const indexA = coreKeywords.findIndex(k => a.includes(k));
          const indexB = coreKeywords.findIndex(k => b.includes(k));
          
          const safeIndexA = indexA === -1 ? 999 : indexA;
          const safeIndexB = indexB === -1 ? 999 : indexB;
          
          return safeIndexA - safeIndexB;
      });

      return { coreHeaders: core, otherHeaders: others };
  }, [headers, titleKey, nameKey, imageKey]);

  if (!isOpen || !data) return null;

  // Composite Title Logic
  const displayTitle = (() => {
      const mainVal = String(data[titleKey] || '未命名产品');
      const subVal = nameKey ? String(data[nameKey] || '') : '';
      // Use hyphen separator
      if (subVal && subVal !== mainVal) {
          return `${mainVal} - ${subVal}`;
      }
      return mainVal;
  })();

  const price = priceKey ? data[priceKey] : null;

  // Image Logic
  const localImage = localImageMap ? findLocalImageMatch(data, localImageMap) : null;
  const remoteUrl = imageKey ? extractFirstImageUrl(data[imageKey]) : null;
  const finalImageUrl = localImage || remoteUrl;

  const handleCopy = () => {
    const textData = headers.map(h => `${h}: ${data[h]}`).join('\n');
    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Calculator Logic ---
  const calculateProfit = () => {
      const p = parseFloat(inputPrice) || 0;
      const c = parseFloat(inputCost) || 0;
      const w = parseFloat(inputWeight) || 0; // grams

      // 1. Shipping Fee Logic
      let shippingFee = 0;
      if (w > 0) {
          if (w < 500) shippingFee = 1.8;
          else if (w <= 1000) shippingFee = 2.2;
          else shippingFee = 2.6;
      }

      // 2. Fixed Fees
      const opFee = 0.7;
      const boxFee = 0.45;

      // 3. Variable Fees
      const platformFee = p * 0.05;
      const taxFee = p * 0.08;

      const totalFee = platformFee + taxFee + opFee + boxFee + shippingFee;
      const totalCost = c + totalFee;

      // --- Gross Results (Before Return) ---
      const grossProfit = p - totalCost;
      const grossMargin = p > 0 ? (grossProfit / p) * 100 : 0;
      const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

      // --- Net Results (After 10% Return) ---
      // Logic: 
      // Success (90%): Profit = Price - TotalCost
      // Return (10%): Loss = Shipping + Box + Op. (Assuming Product recovered, Fees refunded)
      // Expected Profit per unit = 0.9 * (Price - TotalCost) - 0.1 * (Shipping + Box + Op)
      // Actually, let's look at it as Revenue vs Cost over 100 units.
      // Revenue = 90 * P
      // Cost = 100 * (Product + Ship + Box + Op) + 90 * (Platform + Tax) - 10 * (Product) [Recovered]
      //      = 90 * Product + 100 * (Ship + Box + Op) + 90 * (Plat + Tax)
      // Profit = Revenue - Cost
      
      const returnRate = 0.10;
      const successRate = 1 - returnRate;

      // Per unit weighted calc
      const weightedRevenue = p * successRate;
      
      // Cost components
      // Sunk costs (paid regardless of return): Shipping, Box, Op
      const sunkCosts = shippingFee + boxFee + opFee;
      // Success-only costs: Platform, Tax (Assuming refunded on return)
      const successCosts = platformFee + taxFee;
      // Product Cost: Paid, but recovered on return? 
      // Prompt says "calculate... subtracting return rate".
      // Let's assume standard model: product is safe, but logistics lost.
      const weightedCost = (c * successRate) + (sunkCosts * 1.0) + (successCosts * successRate); 
      // Note: If product is recovered, we only "spend" it when sold (success). 
      // If product is lost on return, it would be c * 1.0. Let's assume recovered (c * successRate).

      const netProfit = weightedRevenue - weightedCost;
      const netMargin = weightedRevenue > 0 ? (netProfit / weightedRevenue) * 100 : 0;

      return {
          shippingFee,
          platformFee,
          taxFee,
          opFee,
          boxFee,
          totalCost,
          grossProfit,
          grossMargin,
          roi,
          netProfit,
          netMargin
      };
  };

  const calcResult = calculateProfit();

  // --- Renderers ---

  const renderGrid = (fields: string[]) => {
      if (fields.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Box className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">暂无此类信息</p>
              </div>
          );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {fields.map((key) => {
                const value = data[key];
                if (value === "" || value === undefined || value === null) return null;
                
                const strVal = String(value);
                const isLong = strVal.length > 30 || strVal.includes('\n');

                return (
                    <div key={key} className={`${isLong ? 'col-span-1 md:col-span-2' : ''}`}>
                        <div className="bg-slate-50 hover:bg-white border border-slate-100 hover:border-red-200 rounded-xl p-4 transition-all duration-200 flex flex-col h-full hover:shadow-md group">
                            <dt className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wide opacity-80 group-hover:opacity-100 transition-opacity">
                                {key}
                            </dt>
                            <dd className="text-slate-800 font-medium text-sm leading-relaxed whitespace-pre-wrap select-text">
                                {strVal}
                            </dd>
                        </div>
                    </div>
                );
            })}
        </div>
      );
  };

  const renderCalculator = () => {
      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
              {/* Left: Inputs */}
              <div className="space-y-6">
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                          <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                          参数设置
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">销售价格 (元)</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                                  <input 
                                    type="number" 
                                    value={inputPrice} 
                                    onChange={(e) => setInputPrice(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-800"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">商品成本 (元)</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                                  <input 
                                    type="number" 
                                    value={inputCost} 
                                    onChange={(e) => setInputCost(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-800"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">商品重量 (克)</label>
                              <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">g</span>
                                  <input 
                                    type="number" 
                                    value={inputWeight} 
                                    onChange={(e) => setInputWeight(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-800"
                                  />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                  * 运费标准: &lt;500g: 1.8元 | 500-1000g: 2.2元 | &gt;1000g: 2.6元
                              </p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase">成本明细 (单单)</h3>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                              <span className="text-slate-500">商品成本</span>
                              <span className="font-mono font-medium">¥{Number(inputCost).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">快递运费</span>
                              <span className="font-mono font-medium">¥{calcResult.shippingFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">平台杂费 (5%)</span>
                              <span className="font-mono font-medium">¥{calcResult.platformFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">税费 (8%)</span>
                              <span className="font-mono font-medium">¥{calcResult.taxFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">操作费 (固定)</span>
                              <span className="font-mono font-medium">¥{calcResult.opFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">纸箱成本 (固定)</span>
                              <span className="font-mono font-medium">¥{calcResult.boxFee.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-slate-100 my-2 pt-2 flex justify-between font-bold text-red-600">
                              <span>总成本 (未退货)</span>
                              <span>¥{calcResult.totalCost.toFixed(2)}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Right: Results */}
              <div className="space-y-6">
                  {/* Big ROI Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-xl">
                      <div className="flex items-start justify-between mb-2">
                          <div>
                              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">投入产出比 (ROI)</p>
                              <h2 className="text-5xl font-extrabold mt-2 tracking-tight">
                                  {calcResult.roi.toFixed(1)}<span className="text-2xl opacity-60">%</span>
                              </h2>
                          </div>
                          <div className="bg-white/10 p-3 rounded-full">
                              <TrendingUp className="w-8 h-8 text-green-400" />
                          </div>
                      </div>
                      <p className="text-slate-400 text-xs">基于手动输入价格与总成本计算</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Gross Margin (No Returns) */}
                      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-2 mb-3">
                               <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                   <DollarSign className="w-4 h-4" />
                               </div>
                               <h4 className="font-bold text-slate-700 text-sm">未减退货率毛利率</h4>
                           </div>
                           <div className="flex items-baseline gap-2">
                               <span className="text-3xl font-extrabold text-slate-900">{calcResult.grossMargin.toFixed(1)}%</span>
                           </div>
                           <div className="mt-2 text-xs text-slate-500 flex justify-between">
                               <span>单单毛利:</span>
                               <span className="font-bold text-green-600">¥{calcResult.grossProfit.toFixed(2)}</span>
                           </div>
                      </div>

                      {/* Net Margin (With 10% Returns) */}
                      <div className="bg-white border border-red-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                           <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                               10% 退货率
                           </div>
                           <div className="flex items-center gap-2 mb-3">
                               <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                   <Layers className="w-4 h-4" />
                               </div>
                               <h4 className="font-bold text-slate-700 text-sm">减去退货率毛利率</h4>
                           </div>
                           <div className="flex items-baseline gap-2">
                               <span className="text-3xl font-extrabold text-red-600">{calcResult.netMargin.toFixed(1)}%</span>
                           </div>
                           <div className="mt-2 text-xs text-slate-500 flex justify-between">
                               <span>综合净利:</span>
                               <span className="font-bold text-red-600">¥{calcResult.netProfit.toFixed(2)}</span>
                           </div>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-500 leading-relaxed border border-slate-100">
                      <strong>计算说明：</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>投入产出比 = (销售价 - 总成本) / 总成本</li>
                          <li>综合净利已扣除10%退货率产生的物流损耗(运费+操作+纸箱)。</li>
                          <li>假设退货商品本身可二次销售，仅损失物流与包装费用。</li>
                      </ul>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-full md:h-[90vh] bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/20">
        
        {/* Mobile Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-white/90 text-slate-500 rounded-full hover:bg-slate-100 hover:text-red-500 transition-colors shadow-lg lg:hidden"
        >
            <X className="w-6 h-6" />
        </button>

        {/* Left: Image Section */}
        <div className="w-full lg:w-[45%] bg-slate-50/50 relative flex items-center justify-center p-8 overflow-hidden flex-shrink-0 min-h-[35vh] lg:min-h-auto border-r border-slate-100">
           <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100"></div>

           {finalImageUrl && !imgError ? (
               <div className="relative w-full h-full flex items-center justify-center group">
                    <img 
                        src={finalImageUrl} 
                        alt={displayTitle} 
                        onError={() => setImgError(true)}
                        className="relative max-w-full max-h-full object-contain drop-shadow-xl transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <a href={finalImageUrl} target="_blank" rel="noopener noreferrer" className="bg-white/90 backdrop-blur text-slate-700 px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-white flex items-center">
                            <ExternalLink className="w-3 h-3 mr-2" /> 查看原图
                         </a>
                    </div>
               </div>
           ) : (
               <div className="flex flex-col items-center justify-center text-slate-300">
                   <ImageIcon className="w-24 h-24 mb-4 stroke-1" />
                   <p className="font-light text-slate-400">暂无预览图片</p>
               </div>
           )}

            {localImage && !imgError && (
                <div className="absolute top-6 left-6 bg-white/80 backdrop-blur text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center shadow-sm border border-green-100">
                    <FolderHeart className="w-3 h-3 mr-1.5" /> 本地图库
                </div>
            )}
        </div>

        {/* Right: Info Section */}
        <div className="w-full lg:w-[55%] flex flex-col h-full bg-white relative">
          
          {/* Header Area */}
          <div className="px-8 pt-10 pb-4 flex-shrink-0 bg-white z-10">
             {brandName && (
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wide mb-5 uppercase border border-blue-100">
                    <Box className="w-3 h-3" />
                    {brandName}
                 </div>
             )}

             <div className="flex justify-between items-start gap-6">
                 <div>
                     <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                        {displayTitle}
                     </h1>
                 </div>
                 
                 <button 
                    onClick={onClose}
                    className="hidden lg:flex p-2 text-slate-300 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-all"
                 >
                    <X className="w-6 h-6" />
                 </button>
             </div>

             {/* Big Price Display (Top Header - using heuristic for 'main' price) */}
             {price && (
                 <div className="mt-6 flex items-end">
                     <span className="text-4xl font-extrabold text-red-600 tracking-tight leading-none">{String(price)}</span>
                     {priceKey && !priceKey.includes('价') && <span className="ml-3 text-xs text-slate-400 uppercase font-bold mb-1.5">{priceKey}</span>}
                 </div>
             )}
          </div>

          {/* Tabs Navigation */}
          <div className="px-8 flex items-center gap-6 border-b border-slate-100 sticky top-0 bg-white z-20">
              <button
                  onClick={() => setActiveTab('CORE')}
                  className={`
                    relative py-4 text-sm font-bold transition-colors flex items-center gap-2
                    ${activeTab === 'CORE' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}
                  `}
              >
                  <Layers className="w-4 h-4" />
                  基础信息
                  {activeTab === 'CORE' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                  )}
              </button>

              <button
                  onClick={() => setActiveTab('OTHERS')}
                  className={`
                    relative py-4 text-sm font-bold transition-colors flex items-center gap-2
                    ${activeTab === 'OTHERS' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}
                  `}
              >
                  <FileText className="w-4 h-4" />
                  详细参数
                  {activeTab === 'OTHERS' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                  )}
              </button>

              <button
                  onClick={() => setActiveTab('CALC')}
                  className={`
                    relative py-4 text-sm font-bold transition-colors flex items-center gap-2
                    ${activeTab === 'CALC' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}
                  `}
              >
                  <Calculator className="w-4 h-4" />
                  利润计算
                  {activeTab === 'CALC' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                  )}
              </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-white relative">
             {activeTab === 'CORE' && renderGrid(coreHeaders)}
             {activeTab === 'OTHERS' && renderGrid(otherHeaders)}
             {activeTab === 'CALC' && renderCalculator()}
          </div>
          
          {/* Footer Actions */}
          <div className="px-8 py-6 border-t border-slate-100 bg-white/95 backdrop-blur z-10 sticky bottom-0 flex items-center justify-between">
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all bg-slate-900 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 active:scale-95"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制产品信息'}
            </button>

            <button
                onClick={onClose}
                className="hidden md:block text-slate-400 hover:text-slate-600 text-sm font-semibold px-4"
            >
                关闭 (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};