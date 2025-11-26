import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { ParsedSheet } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: ParsedSheet[]) => void;
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
      if (parsedData.length === 0) {
        setError("未能在文件中解析出任何有效的数据表格。");
      } else {
        onDataLoaded(parsedData);
      }
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      // Reset value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const loadDemoData = () => {
    setIsLoading(true);
    // Simulate async loading of multiple sheets
    setTimeout(() => {
        const generateData = (brandName: string, count: number, startId: number) => ({
            name: brandName,
            headers: ["型号", "名称", "价格", "库存", "图片链接", "详细参数"],
            data: Array.from({ length: count }).map((_, i) => ({
                "型号": `${brandName.toUpperCase().substring(0, 3)}-${startId + i}`,
                "名称": `${brandName} 经典系列 No.${i + 1}`,
                "价格": `¥${(Math.random() * 2000 + 500).toFixed(2)}`,
                "库存": Math.floor(Math.random() * 50),
                "图片链接": `https://picsum.photos/800/800?random=${startId + i}`,
                "详细参数": "材质: 高级面料\n适用季节: 四季\n风格: 运动休闲"
            }))
        });

        const demoSheets: ParsedSheet[] = [
            generateData("Nike", 8, 100),
            generateData("Adidas", 6, 200),
            generateData("Puma", 4, 300),
            generateData("New Balance", 5, 400)
        ];
        
        onDataLoaded(demoSheets);
        setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-xl text-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          产品可视化展厅
        </h1>
        <p className="text-lg text-slate-600">
          将您的 Excel 库存表瞬间转化为精美的产品展示画廊。
          <br/>
          <span className="text-sm opacity-75">支持多 Sheet 品牌分页 · 自动识别图片 · 拖拽操作</span>
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          w-full max-w-xl p-12 rounded-3xl border-4 border-dashed transition-all duration-300 ease-in-out cursor-pointer
          flex flex-col items-center justify-center bg-white shadow-xl
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-blue-200' 
            : 'border-slate-200 hover:border-blue-400 hover:shadow-2xl'
          }
        `}
      >
        {isLoading ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-slate-700">正在解析数据表格...</p>
            <p className="text-sm text-slate-400 mt-2">大型文件可能需要几秒钟</p>
          </div>
        ) : (
          <>
            <div className={`p-6 rounded-full bg-blue-50 mb-6 ${isDragging ? 'bg-blue-100' : ''}`}>
               <FileSpreadsheet className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {isDragging ? '释放以上传文件' : '点击或拖拽上传 Excel 文件'}
            </h3>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
              支持 .xlsx 或 .csv 格式。每个 Sheet 将被识别为一个独立的品牌分类。
            </p>

            <label className="relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <span className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                选择文件
              </span>
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center max-w-xl w-full border border-red-100 animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && (
          <button 
            onClick={loadDemoData}
            className="mt-8 text-slate-400 hover:text-blue-600 text-sm font-medium transition-colors border-b border-transparent hover:border-blue-600 pb-0.5"
          >
            没有文件？加载演示数据看看
          </button>
      )}
    </div>
  );
};