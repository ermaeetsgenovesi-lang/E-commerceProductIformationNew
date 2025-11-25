import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { ParsedSheet } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: ParsedSheet) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedData = await parseExcelFile(file);
      onDataLoaded(parsedData);
    } catch (err) {
      setError("解析文件失败，请确保文件是有效的 Excel (.xlsx, .csv) 格式。");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      // Reset value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const loadDemoData = () => {
    setIsLoading(true);
    // Simulate async loading
    setTimeout(() => {
        const demoData: ParsedSheet = {
            headers: ["品牌", "产品名称", "价格", "库存", "图片链接", "描述", "详细参数"],
            data: Array.from({ length: 12 }).map((_, i) => ({
                "品牌": ["Nike", "Adidas", "Apple", "Sony", "Dyson", "Tesla"][i % 6],
                "产品名称": `旗舰产品系列 No.${i + 1}`,
                "价格": `¥${(Math.random() * 5000 + 100).toFixed(2)}`,
                "库存": Math.floor(Math.random() * 100),
                "图片链接": `https://picsum.photos/800/800?random=${i}`,
                "描述": "这是一款采用了最新技术的高性能产品，设计优雅，功能强大，能够满足您的各种日常需求。",
                "详细参数": "材质: 环保复合材料\n产地: 中国\n保修期: 2年\n适用人群: 通用"
            }))
        };
        onDataLoaded(demoData);
        setIsLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">产品可视化展厅</h1>
        <p className="text-slate-500 text-lg">上传您的 Excel 数据表格，一键生成精美产品画廊</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative w-full max-w-2xl p-12 rounded-3xl border-4 border-dashed transition-all duration-300 ease-out
          flex flex-col items-center justify-center text-center cursor-pointer group
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-xl' 
            : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-lg'
          }
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {isLoading ? (
            <div className="flex flex-col items-center animate-pulse">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">正在解析数据，请稍候...</p>
            </div>
        ) : (
            <>
                <div className={`
                    w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6
                    group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-300
                `}>
                    <Upload className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    点击或拖拽文件到此处
                </h3>
                <p className="text-slate-500 mb-6 max-w-md">
                    支持 .xlsx, .xls, .csv 格式。系统将自动识别包含"图片"、"image"或链接的列进行展示。
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>最大支持 10MB 文件</span>
                </div>
            </>
        )}
      </div>
      
      {error && (
        <div className="mt-6 flex items-center text-red-500 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8">
        <button 
            onClick={loadDemoData}
            className="text-slate-500 hover:text-blue-600 underline text-sm transition-colors"
        >
            没有文件？加载演示数据看看效果
        </button>
      </div>
    </div>
  );
};