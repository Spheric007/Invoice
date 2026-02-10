
import React from 'react';

const Backup: React.FC = () => {
  const handleExport = async () => {
    alert("Data is securely stored in Supabase cloud! Your manual backup feature is currently being optimized for direct cloud-to-file export. Stay tuned!");
  };

  const handleImport = () => {
    alert("Cloud Sync is active. Importing data manually is disabled to prevent conflicts. All your data is automatically synced to your Supabase project.");
  };

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#333]">Data Backup & Restore</h1>
        <p className="text-lightText mt-1">আপনার সমস্ত ইনভয়েস এবং কাস্টমার ডাটা বর্তমানে সুপারবেজ ক্লাউডে সুরক্ষিত আছে।</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-border text-center shadow-sm">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            <i className="fas fa-cloud-download-alt"></i>
          </div>
          <h2 className="text-2xl font-bold mb-3">Cloud Backup Active</h2>
          <p className="text-lightText mb-8">
            সুপারবেজ ডাটাবেজ ব্যবহার করার ফলে আপনার ডাটা হারানো ভয় নেই। এটি রিয়েল-টাইম ক্লাউডে সেভ হচ্ছে।
          </p>
          <button 
            onClick={handleExport}
            className="bg-success text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-success/20 hover:opacity-90 transition-all"
          >
            <i className="fas fa-download mr-2"></i> Export Offline Backup
          </button>
        </div>

        <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-border text-center shadow-sm">
          <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            <i className="fas fa-cloud-upload-alt"></i>
          </div>
          <h2 className="text-2xl font-bold mb-3">Restore & Sync</h2>
          <p className="text-lightText mb-8">
            ডাটা অটোমেটিকলি সিংক্রোনাইজ হয়। ম্যানুয়াল রিস্টোর করার কোনো প্রয়োজন নেই। 
          </p>
          <div className="opacity-50 grayscale pointer-events-none">
             <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 mb-4"/>
             <button className="bg-warning text-white px-8 py-3 rounded-xl font-bold">
               <i className="fas fa-sync-alt mr-2"></i> Manual Restore
             </button>
          </div>
        </div>
      </div>

      <div className="mt-10 p-6 bg-[#fff8e1] border border-[#ffe082] rounded-2xl">
         <h4 className="font-bold text-[#f57f17] flex items-center mb-2">
           <i className="fas fa-info-circle mr-2"></i> Professional Note:
         </h4>
         <p className="text-sm text-[#795548] font-medium leading-relaxed">
           The application is now fully integrated with Supabase. Local storage backup files are no longer necessary for cross-device usage as the database is hosted globally. You can access the same data from any device by using this web app.
         </p>
      </div>
    </div>
  );
};

export default Backup;
