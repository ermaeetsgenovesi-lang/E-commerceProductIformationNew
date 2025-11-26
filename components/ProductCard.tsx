import React, { useMemo, useState, useEffect } from 'react';
import { ProductData } from '../types';
import { findTitleKey, findImageKey, extractFirstImageUrl, findLocalImageMatch } from '../utils/excelParser';
import { ImageOff, Eye, FolderHeart, Image as ImageIcon, Sparkles, Box, X, Copy, Loader2, Check } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ProductCardProps {
  data: ProductData;
  headers: string[];
  onClick: () => void;
  localImageMap?: Map<string, string>;
}

export const ProductCard: React.FC<ProductCardProps> = ({ data, headers, onClick, localImageMap }) => {
  const titleKey = useMemo(() => findTitleKey(headers), [headers]);
  
  // Try to find a specific "Name" key if it's different from the primary titleKey
  const nameKey = useMemo(() => {
     const candidates = ['名称', 'name', 'title', '品名', '名字', '标题', 'product'];
     return headers.find(h => h !== titleKey && candidates.some(c => h.toLowerCase().includes(c)));
  }, [headers, titleKey]);

  // Construct the composite display title
  const displayTitle = useMemo(() => {
      const mainVal = String(data[titleKey] || '未命名产品');
      const subVal = nameKey ? String(data[nameKey] || '') : '';
      if (subVal && subVal !== mainVal) {
          return `${mainVal} - ${subVal}`;
      }
      return mainVal;
  }, [data, titleKey, nameKey]);

  const imageKey = useMemo(() => findImageKey(headers, data), [headers, data]);
  const localImage = localImageMap ? findLocalImageMatch(data, localImageMap) : null;
  const remoteUrl = imageKey ? extractFirstImageUrl(data[imageKey]) : null;
  const finalImageUrl = localImage || remoteUrl;

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [finalImageUrl]);

  const priceKey = headers.find(h => h.includes('价') || h.toLowerCase().includes('price') || h.includes('金额'));
  const price = priceKey ? data[priceKey] : null;

  const displayPrice = useMemo(() => {
      if (!price) return null;
      const str = String(price).trim();
      if (/^[¥￥$]/.test(str)) {
          return str;
      }
      return `￥${str}`;
  }, [price]);

  // --- AI Logic State ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAIAction = async (e: React.MouseEvent, type: 'TITLE' | 'SKU') => {
      e.stopPropagation(); // Prevent opening the detail modal
      
      if (!process.env.API_KEY) {
          alert("请配置 API Key 以使用 AI 功能");
          return;
      }

      setIsGenerating(true);
      setAiResult("");
      setResultTitle(type === 'TITLE' ? "推荐拼多多标题" : "推荐 SKU 方案");

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Construct context from data
        const productContext = headers.slice(0, 10).map(k => `${k}: ${data[k]}`).join(', ');
        
        let prompt = "";
        if (type === 'TITLE') {
            prompt = `
            你是一名拼多多电商运营专家。请根据以下产品数据，生成 5 个高点击率的拼多多商品标题。
            
            产品数据: ${productContext}
            
            严格要求：
            1. 标题结构必须为：【品牌名】+【产品名称简称(去除规格参数)】+【产品功效/核心卖点】。
            2. 每个标题长度严格控制在 30 个中文字符左右。
            3. 输出格式：仅列出 5 个标题，每行一个，不要带有序号、引号或其他废话。
            `;
        } else {
            prompt = `
            你是一名电商运营专家。请根据以下产品数据，分析并生成一套合理的 SKU (库存量单位) 规格列表。
            
            产品数据: ${productContext}
            
            要求：
            1. 提取颜色、尺寸、规格等属性。
            2. 如果数据中没有明确规格，请根据产品类型推断常见的电商规格。
            3. 输出格式：Markdown 列表。
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        setAiResult(response.text || "生成失败，请重试。");

      } catch (error) {
          console.error(error);
          setAiResult("AI 服务请求失败，请检查网络。");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (aiResult) {
          navigator.clipboard.writeText(aiResult);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const closeOverlay = (e: React.MouseEvent) => {
      e.stopPropagation();
      setAiResult(null);
  };

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full relative"
    >
      {/* Image Area */}
      <div className="relative w-full pt-[100%] bg-slate-50 overflow-hidden group-hover:bg-slate-100 transition-colors">
        {finalImageUrl && !imgError ? (
          <img 
            src={finalImageUrl} 
            alt={displayTitle}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-400">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-3 border border-slate-100">
                   {imgError ? (
                       <ImageOff className="w-5 h-5 text-red-300" />
                   ) : (
                       <ImageIcon className="w-5 h-5 text-slate-300" />
                   )}
               </div>
               <span className="text-xs font-medium text-center text-slate-500 line-clamp-2 px-1">
                   {displayTitle}
               </span>
               <span className="text-[10px] text-slate-400 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                   {imgError ? "图片加载失败" : "暂无图片"}
               </span>
           </div>
        )}

        {localImage && !imgError && (
            <div className="absolute top-2 right-2 bg-green-500/90 text-white p-1.5 rounded-full shadow-sm z-10" title="使用本地图库">
                <FolderHeart className="w-3 h-3" />
            </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium text-slate-800 shadow-lg flex items-center transform scale-95 group-hover:scale-100 transition-transform">
                <Eye className="w-3 h-3 mr-1" /> 查看详情
            </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-slate-800 mb-1 line-clamp-2 text-sm flex-grow">
          {displayTitle}
        </h3>
        
        {displayPrice && (
            <div className="mt-2 text-lg font-bold text-red-600">
                {displayPrice}
            </div>
        )}
        
        {/* Action Buttons Area */}
        <div className="mt-3 grid grid-cols-2 gap-2">
            <button 
                onClick={(e) => handleAIAction(e, 'TITLE')}
                disabled={isGenerating}
                className="flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-[10px] font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
                {isGenerating && resultTitle === "推荐拼多多标题" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                生成拼多多标题
            </button>
            <button 
                onClick={(e) => handleAIAction(e, 'SKU')}
                disabled={isGenerating}
                className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-[10px] font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
                {isGenerating && resultTitle === "推荐 SKU 方案" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Box className="w-3 h-3" />}
                生成SKU标题
            </button>
        </div>
      </div>

      {/* AI Result Overlay */}
      {aiResult !== null && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-200">
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      {resultTitle}
                  </h4>
                  <div className="flex gap-2">
                      <button onClick={handleCopy} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600" title="复制">
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={closeOverlay} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-500" title="关闭">
                          <X className="w-4 h-4" />
                      </button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  {isGenerating ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                          <span className="text-xs">AI 正在思考中...</span>
                      </div>
                  ) : (
                      <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {aiResult}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};