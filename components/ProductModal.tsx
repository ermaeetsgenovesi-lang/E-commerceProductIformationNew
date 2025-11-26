import React, { useMemo, useEffect, useState } from 'react';
import { ProductData } from '../types';
import { findTitleKey, findImageKey, extractFirstImageUrl, findLocalImageMatch, parseCurrency, parseWeightToGrams } from '../utils/excelParser';
import { X, Copy, Check, Image as ImageIcon, ExternalLink, FolderHeart, Box, Layers, FileText, Calculator, Bot, Sparkles, TrendingUp } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

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

  // --- Calculator State ---
  const [calcPrice, setCalcPrice] = useState<number>(0);
  const [calcCost, setCalcCost] = useState<number>(0); // D列: 商品成本
  const [calcWeight, setCalcWeight] = useState<number>(0); // E列: 重量 (g)
  
  // Costs & Rates
  const [boxCost, setBoxCost] = useState<number>(0.45); // F列: 纸箱成本
  const [opFee, setOpFee] = useState<number>(0.7); // G列: 操作费
  const [otherCost, setOtherCost] = useState<number>(0); // K列: 盈利/其他成本 (Formula input)
  
  const [returnRate, setReturnRate] = useState<number>(10); // P列: 退货率 (%)
  const [taxRate, setTaxRate] = useState<number>(5); // J列: 税点 (%)
  const [platformRate, setPlatformRate] = useState<number>(5); // I列: 平台扣点 (%)
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initialize Data when modal opens
  useEffect(() => {
    if (isOpen && data) {
        setImgError(false);
        setActiveTab('CORE');
        setAiAnalysis("");

        // Auto-extract initial values from data
        const priceKey = headers.find(h => h.includes('价') || h.toLowerCase().includes('price') || h.includes('金额'));
        const costKey = headers.find(h => h.includes('成本') || h.toLowerCase().includes('cost') || h.includes('进货'));
        const weightKey = headers.find(h => h.includes('重量') || h.toLowerCase().includes('weight') || h.includes('重'));

        setCalcPrice(parseCurrency(data[priceKey || ''] || 0));
        setCalcCost(parseCurrency(data[costKey || ''] || 0));
        setCalcWeight(parseWeightToGrams(data[weightKey || ''] || 0));
    }
  }, [data, isOpen, headers]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  // --- Core Parsers ---
  const titleKey = useMemo(() => headers.length ? findTitleKey(headers) : '', [headers]);
  const imageKey = useMemo(() => (data && headers.length) ? findImageKey(headers, data) : null, [headers, data]);
  
  const nameKey = useMemo(() => {
     const candidates = ['名称', 'name', 'title', '品名', '名字', '标题', 'product'];
     return headers.find(h => h !== titleKey && candidates.some(c => h.toLowerCase().includes(c)));
  }, [headers, titleKey]);

  const { coreHeaders, otherHeaders } = useMemo(() => {
      const coreKeywords = [
          '产品简称', '国际批准文号', '商品成本', '商品重量', '1瓶控价', '2瓶控价', '3瓶控价', '价格', 'price', '售价', 'cost', 'sku'
      ];
      const core: string[] = [];
      const others: string[] = [];

      headers.forEach(h => {
          if (h === titleKey || h === nameKey || h === imageKey) return;
          const isCore = coreKeywords.some(k => h.toLowerCase().includes(k.toLowerCase()));
          if (isCore) core.push(h);
          else others.push(h);
      });

      return { coreHeaders: core, otherHeaders: others };
  }, [headers, titleKey, nameKey, imageKey]);

  if (!isOpen || !data) return null;

  const displayTitle = (() => {
      const mainVal = String(data[titleKey] || '未命名产品');
      const subVal = nameKey ? String(data[nameKey] || '') : '';
      if (subVal && subVal !== mainVal) return `${mainVal} - ${subVal}`;
      return mainVal;
  })();

  const localImage = localImageMap ? findLocalImageMatch(data, localImageMap) : null;
  const remoteUrl = imageKey ? extractFirstImageUrl(data[imageKey]) : null;
  const finalImageUrl = localImage || remoteUrl;

  // --- Calculator Logic (Strictly based on User Prompt) ---
  const calculateMetrics = () => {
      // H列: 快递成本
      let shippingFee = 0;
      if (calcWeight <= 500) shippingFee = 1.8;
      else if (calcWeight <= 1000) shippingFee = 2.2;
      else if (calcWeight <= 1500) shippingFee = 2.6;
      else if (calcWeight <= 2000) shippingFee = 2.9;
      else shippingFee = 3.6;

      // I列: 平台杂费 = Price * 5%
      const platformFee = calcPrice * (platformRate / 100);

      // J列: 税点 = Price * 5%
      const taxFee = calcPrice * (taxRate / 100);

      // L列: 综合成本 = D(Cost) + F(Box) + G(Op) + H(Ship) + I(Plat) + K(Other) + J(Tax)
      const comprehensiveCost = calcCost + boxCost + opFee + shippingFee + platformFee + otherCost + taxFee;

      // N列: 利润 = Price - Comprehensive Cost
      const profit = calcPrice - comprehensiveCost;

      // O列: 未减退款毛利率 = Profit / Price
      const marginPreReturn = calcPrice > 0 ? (profit / calcPrice) : 0;

      // Q列: 减退款毛利率 = MarginPre * (1 - ReturnRate)
      const marginPostReturn = marginPreReturn * (1 - (returnRate / 100));

      // R列: 除售后盈利投产 = 1 / MarginPostReturn
      const investmentEfficiency = marginPostReturn > 0 ? (1 / marginPostReturn) : 0;

      // Standard ROI for display (Profit / Cost)
      const roi = (comprehensiveCost > 0) ? (profit / comprehensiveCost) : 0;

      return {
          shippingFee,
          platformFee,
          taxFee,
          comprehensiveCost,
          profit,
          marginPreReturn,
          marginPostReturn,
          investmentEfficiency,
          roi
      };
  };

  const metrics = calculateMetrics();

  // --- AI Analysis ---
  const handleGenerateAnalysis = async () => {
    if (!process.env.API_KEY) {
        alert("系统未配置 API Key，无法使用 AI 分析功能。");
        return;
    }

    setIsAnalyzing(true);
    setAiAnalysis("");

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Use the specific prompt structure requested by the user
        const prompt = `
        请分析这款产品（${displayTitle}）在当前SKU配置下的投资回报效率，重点关注'除售后盈利投产'指标。
        
        【当前SKU数据】
        - 售价: ¥${calcPrice.toFixed(2)}
        - 综合成本: ¥${metrics.comprehensiveCost.toFixed(2)} (含产品、快递¥${metrics.shippingFee}、平台费、税费等)
        - 单单利润: ¥${metrics.profit.toFixed(2)}
        - 设定售后率: ${returnRate}%
        - 未减退款毛利率: ${(metrics.marginPreReturn * 100).toFixed(2)}%
        - 减退款毛利率: ${(metrics.marginPostReturn * 100).toFixed(2)}%
        - **除售后盈利投产 (1/减退款毛利率)**: ${metrics.investmentEfficiency.toFixed(2)}

        请严格按照以下结构输出分析报告：

        1. **解释投产比的计算逻辑**
           - 详细解释 "1/减退款毛利率" 的含义。即：该指标反映了在考虑 ${returnRate}% 售后率的情况下，每赚取1元净利润需要多少销售额支撑（或每投入1元综合成本带来的回报效率，请根据电商通用定义修正解释）。
           
        2. **分析当前SKU的投产比数值**
           - 当前值为 **${metrics.investmentEfficiency.toFixed(2)}**。
           - 请评价该数值是否优秀（通常越低意味着盈利能力越强，即只需要较少的销售额就能赚到1元利润；或者反之，请给出专业定义）。
           - (如果适用) 假设这是洗发水产品，对比常见的行业标准。

        3. **说明投产比与盈利能力的关系**
           - 阐述该指标如何反映产品的抗风险能力和资金周转效率。

        4. **提供优化建议**
           - 如何通过调整定价（当前 ¥${calcPrice}）、成本控制（当前 ¥${metrics.comprehensiveCost.toFixed(2)}）或降低售后率（当前 ${returnRate}%）来改善该投产比。
           - 给出3条具体策略。

        5. **投资效率与销售策略推荐**
           - 基于 ${metrics.investmentEfficiency.toFixed(2)} 的投产效率，推荐该产品适合 "跑量" 还是 "做高利润"？
           - 给出最优销售策略建议。

        请使用 Markdown 格式，保持专业分析师的口吻。
        `;

        const result = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
        for await (const chunk of result) {
            setAiAnalysis(prev => prev + (chunk.text || ""));
        }

    } catch (error) {
        console.error("AI Error:", error);
        setAiAnalysis("**分析生成失败，请稍后重试。**");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderGrid = (fields: string[]) => {
      if (fields.length === 0) return <div className="p-8 text-center text-slate-400">暂无信息</div>;
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {fields.map((key) => {
                const value = data[key];
                if (!value) return null;
                return (
                    <div key={key} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <dt className="text-xs font-bold text-red-600 mb-1 uppercase">{key}</dt>
                        <dd className="text-slate-800 font-medium text-sm whitespace-pre-wrap">{String(value)}</dd>
                    </div>
                );
            })}
        </div>
      );
  };

  const renderCalculator = () => {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
            {/* Inputs & Logic Display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> 基础参数配置
                    </h3>
                    
                    {/* Primary Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-red-600">售卖价 (M列)</label>
                            <input type="number" value={calcPrice} onChange={e => setCalcPrice(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-red-600">商品成本 (D列)</label>
                            <input 
                                type="number" 
                                value={calcCost} 
                                readOnly
                                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-500 bg-slate-100 cursor-not-allowed outline-none" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-red-600">商品重量 (g)</label>
                            <input 
                                type="number" 
                                value={calcWeight} 
                                onChange={e => setCalcWeight(Number(e.target.value))}
                                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-red-600">预计售后率 (%)</label>
                            <input type="number" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {/* Secondary Costs */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                         <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-red-600">纸箱成本 (F)</label>
                                <input 
                                    type="number" 
                                    value={boxCost} 
                                    readOnly
                                    className="w-full p-1.5 text-sm border border-slate-200 rounded font-mono text-slate-500 bg-slate-100 cursor-not-allowed outline-none" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-red-600">操作费 (G)</label>
                                <input 
                                    type="number" 
                                    value={opFee} 
                                    readOnly
                                    className="w-full p-1.5 text-sm border border-slate-200 rounded font-mono text-slate-500 bg-slate-100 cursor-not-allowed outline-none" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-red-600" title="K列/Target Profit">盈利</label>
                                <input type="number" value={otherCost} onChange={e => setOtherCost(Number(e.target.value))} className="w-full p-1.5 text-sm border border-slate-200 rounded font-mono text-slate-600" />
                            </div>
                         </div>
                         <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-red-600 font-bold text-xs">快递成本 (H) <span className="text-xs opacity-70">≤{calcWeight}g</span></span>
                                <span className="font-mono text-slate-700">¥{metrics.shippingFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-600 font-bold text-xs">平台杂费 (I) <span className="text-xs opacity-70">{platformRate}%</span></span>
                                <span className="font-mono text-slate-700">¥{metrics.platformFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-600 font-bold text-xs">税点 (J) <span className="text-xs opacity-70">{taxRate}%</span></span>
                                <span className="font-mono text-slate-700">¥{metrics.taxFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                                <span className="text-red-600 text-sm">综合成本 (L)</span>
                                <span className="text-red-600">¥{metrics.comprehensiveCost.toFixed(2)}</span>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" /> 利润分析 (按公式)
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="text-xs text-red-600 mb-1 font-bold">利润</div>
                            <div className={`text-2xl font-black ${metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ¥{metrics.profit.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">售卖价 - 综合成本</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="text-xs text-red-600 mb-1 font-bold">未减退款毛利率</div>
                            <div className="text-2xl font-black text-blue-600">
                                {(metrics.marginPreReturn * 100).toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">利润 ÷ 售卖价</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                        <div className="relative z-10 grid grid-cols-2 gap-6">
                             <div>
                                <div className="text-xs text-red-400 mb-1 uppercase tracking-wider font-bold">减退款毛利率</div>
                                <div className="text-3xl font-black text-white">{(metrics.marginPostReturn * 100).toFixed(2)}%</div>
                                <div className="text-[10px] text-slate-500 mt-1 opacity-70">O列 × (1 - 售后率)</div>
                             </div>

                             <div>
                                <div className="text-xs text-red-400 mb-1 uppercase tracking-wider font-bold">除售后盈利投产</div>
                                <div className="text-3xl font-black text-amber-400">{metrics.investmentEfficiency.toFixed(2)}</div>
                                <div className="text-[10px] text-amber-200/50 mt-1">1 ÷ Q列</div>
                             </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateAnalysis}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? (
                            <>
                                <Sparkles className="w-5 h-5 animate-spin" />
                                正在进行投资效率分析...
                            </>
                        ) : (
                            <>
                                <Bot className="w-5 h-5" />
                                生成 AI 投产比分析报告
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* AI Output */}
            {aiAnalysis && (
                <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        智能分析报告
                    </h4>
                    <div className="prose prose-sm prose-slate max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                            {aiAnalysis}
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  };

  const handleCopy = () => {
    const textData = headers.map(h => `${h}: ${data[h]}`).join('\n');
    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl h-full md:h-[90vh] bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/20">
        
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
          
          <div className="px-8 pt-10 pb-4 flex-shrink-0 bg-white z-10">
             {brandName && (
                 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-wide mb-5 uppercase border border-blue-100">
                    <Box className="w-3 h-3" />
                    {brandName}
                 </div>
             )}

             <div className="flex justify-between items-start gap-6">
                 <div>
                     <h1 className="text-base md:text-lg font-extrabold text-slate-900 leading-tight tracking-tight">
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
          </div>

          <div className="px-8 flex items-center gap-6 border-b border-slate-100 sticky top-0 bg-white z-20">
              <button onClick={() => setActiveTab('CORE')} className={`relative py-4 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'CORE' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Layers className="w-4 h-4" /> 基础信息
                  {activeTab === 'CORE' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />}
              </button>

              <button onClick={() => setActiveTab('OTHERS')} className={`relative py-4 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'OTHERS' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <FileText className="w-4 h-4" /> 详细参数
                  {activeTab === 'OTHERS' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />}
              </button>

              <button onClick={() => setActiveTab('CALC')} className={`relative py-4 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'CALC' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Calculator className="w-4 h-4" /> 利润测算
                  {activeTab === 'CALC' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
              </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-white relative">
             {activeTab === 'CORE' && renderGrid(coreHeaders)}
             {activeTab === 'OTHERS' && renderGrid(otherHeaders)}
             {activeTab === 'CALC' && renderCalculator()}
          </div>
          
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