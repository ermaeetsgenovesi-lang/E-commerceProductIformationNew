import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProductGallery } from './components/ProductGallery';
import { ParsedSheet } from './types';

const App: React.FC = () => {
  const [sheetData, setSheetData] = useState<ParsedSheet | null>(null);

  const handleDataLoaded = (data: ParsedSheet) => {
    setSheetData(data);
  };

  const handleReset = () => {
    if (window.confirm("确定要重新上传文件吗？当前展示数据将被清除。")) {
        setSheetData(null);
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
      {/* We conditionally render based on whether we have data or not */}
      {!sheetData ? (
        <FileUpload onDataLoaded={handleDataLoaded} />
      ) : (
        <ProductGallery 
            sheetData={sheetData} 
            onReset={handleReset} 
        />
      )}
    </div>
  );
};

export default App;
