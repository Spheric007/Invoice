import React, { useEffect, useState, useRef } from 'react';
import { View, Invoice } from '../types';
import { db } from '../services/db';
import { formatDisplayDate, convertToWords } from '../utils/helpers';

interface InvoiceDetailsProps {
  invoiceNo: string | null;
  navigateTo: (view: View, params?: any) => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoiceNo, navigateTo }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const memoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoiceNo) {
      db.getInvoiceByNo(invoiceNo).then(setInvoice).catch(console.error);
    }
  }, [invoiceNo]);

  const handlePrint = () => {
    const printRoot = document.getElementById('print-root');
    const memoContent = memoRef.current;
    
    if (printRoot && memoContent) {
      printRoot.innerHTML = '';
      const clone = memoContent.cloneNode(true) as HTMLElement;
      clone.style.margin = '0'; 
      clone.style.boxShadow = 'none';
      printRoot.appendChild(clone);

      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const handleDownloadPNG = async () => {
    if (memoRef.current) {
      try {
        // @ts-ignore
        const canvas = await html2canvas(memoRef.current, { 
          scale: 3, 
          useCORS: true, 
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
          // Fixing rendering offset issues
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.offsetWidth,
          windowHeight: document.documentElement.offsetHeight
        });
        const link = document.createElement('a');
        link.download = `MasterComputer_Invoice_${invoiceNo}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
      } catch (e) {
        alert("Download failed.");
      }
    }
  };

  if (!invoice) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4">
        <button onClick={() => navigateTo(View.Invoices)} className="text-lightText hover:text-black transition-colors flex items-center font-bold font-bengali">
          <i className="fas fa-arrow-left mr-2"></i> ইনভয়েস লিস্টে ফিরে যান
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrint} className="bg-black text-white px-6 py-2.5 rounded-xl font-black flex items-center shadow-lg hover:scale-105 transition-transform font-bengali"><i className="fas fa-print mr-2"></i> প্রিন্ট মেমো</button>
          <button onClick={handleDownloadPNG} className="bg-gray-200 text-black px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-gray-300 transition-colors font-bengali"><i className="fas fa-image mr-2"></i> ছবি ডাউনলোড</button>
          <button onClick={() => navigateTo(View.EditInvoice, { invoiceNo: invoice.invoice_no })} className="bg-white border-2 border-black text-black px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-black hover:text-white transition-all font-bengali"><i className="fas fa-edit mr-2"></i> এডিট করুন</button>
        </div>
      </div>

      <div className="flex justify-center bg-gray-200/50 p-6 rounded-2xl overflow-x-auto">
        <div ref={memoRef} className="memo-container bg-white shadow-2xl" style={{ width: '148mm', height: '210mm', padding: '5mm', position: 'relative', overflow: 'hidden', marginLeft: 'auto', marginRight: 'auto' }}>
           <div className="w-full h-full border-2 border-black p-4 flex flex-col box-border font-serif text-black bg-white">
              
              <div className="flex justify-center -mt-1 mb-3">
                 <div className="border-2 border-black px-8 py-1.5 text-[14px] font-black uppercase tracking-[2px]">
                    CASH MEMO / ক্যাশ মেমো
                 </div>
              </div>

              <div className="text-center">
                 <h1 className="text-[22px] font-black uppercase tracking-tight leading-none mb-2">
                    MASTER COMPUTER & PRINTING PRESS
                 </h1>
                 <div className="border-t-2 border-black mt-1 mb-1"></div>
                 <div className="flex justify-between items-center px-1 py-0.5 font-bold text-[14px]">
                    <span>Proprietor: S.M. Shahjahan</span>
                    <div className="bg-black text-white px-6 py-0.5 rounded-sm font-sans font-black tracking-widest text-[15px]">
                       01720-365191
                    </div>
                 </div>
                 <div className="flex justify-center mt-2">
                    <div className="border-2 border-black px-6 py-1 text-[13px] font-bold">
                       Primary association Market, Sakhipur, Tangail
                    </div>
                 </div>
                 <div className="border-t-2 border-black mt-3 mb-6"></div>
              </div>

              {/* Header Info Section with padding fix for html2canvas */}
              <div className="grid grid-cols-12 gap-y-3 mb-6 text-[14px] font-bold">
                 <div className="col-span-7 space-y-2">
                    <div className="flex items-center">
                       <span className="w-16">Serial:</span>
                       <span className="border-b-2 border-black flex-1 pl-2 pb-0.5 font-black text-[15px]">#{invoice.invoice_no}</span>
                    </div>
                    <div className="flex items-center font-bengali">
                       <span className="w-16">Name:</span>
                       <span className="border-b-2 border-black flex-1 pl-2 pb-0.5 font-black text-[16px] leading-tight">{invoice.client_name}</span>
                    </div>
                    <div className="flex items-center font-bengali">
                       <span className="w-16">Address:</span>
                       <span className="border-b-2 border-black flex-1 pl-2 pb-0.5 font-medium text-[14px] leading-tight">{invoice.client_address || '...'}</span>
                    </div>
                 </div>
                 <div className="col-span-5 space-y-2 pl-4">
                    <div className="flex items-center justify-end">
                       <span className="mr-3">Date:</span>
                       <span className="border-b-2 border-black flex-1 text-center pb-0.5 font-black text-[15px]">{formatDisplayDate(invoice.memo_date)}</span>
                    </div>
                    <div className="flex items-center justify-end font-sans">
                       <span className="mr-3">Mobile:</span>
                       <span className="border-b-2 border-black flex-1 text-center pb-0.5 font-black text-[15px]">{invoice.client_mobile || '...'}</span>
                    </div>
                 </div>
              </div>

              {/* Items Table */}
              <div className="flex-grow">
                 <table className="w-full border-collapse border-2 border-black text-[14px]">
                    <thead>
                       <tr className="border-b-2 border-black h-9 bg-gray-50/50">
                          <th className="border-r-2 border-black w-10 text-center font-bold">SL</th>
                          <th className="border-r-2 border-black text-center font-bold">Work Description</th>
                          <th className="border-r-2 border-black w-24 text-center font-bold">Qty / Size</th>
                          <th className="border-r-2 border-black w-24 text-center font-bold">Rate</th>
                          <th className="w-24 text-center font-bold">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {invoice.items.map((item, i) => (
                          <tr key={i} className="border-b border-black h-9 align-middle">
                             <td className="border-r-2 border-black text-center">{i+1}</td>
                             <td className="border-r-2 border-black pl-3 font-bengali leading-snug py-1">{item.details}</td>
                             <td className="border-r-2 border-black text-center font-sans">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}
                             </td>
                             <td className="border-r-2 border-black text-center">{item.rate || ''}</td>
                             <td className="text-right pr-3 font-sans font-black">৳{item.total}/-</td>
                          </tr>
                       ))}
                       {/* Empty rows to maintain layout if few items */}
                       {invoice.items.length < 5 && Array.from({ length: 5 - invoice.items.length }).map((_, idx) => (
                         <tr key={`empty-${idx}`} className="border-b border-black h-9">
                           <td className="border-r-2 border-black"></td>
                           <td className="border-r-2 border-black"></td>
                           <td className="border-r-2 border-black"></td>
                           <td className="border-r-2 border-black"></td>
                           <td></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Footer Section with padding fix */}
              <div className="mt-6">
                 <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-7">
                       <div className="border-2 border-black p-3 h-20 flex flex-col justify-between">
                          <div className="text-[10px] uppercase font-black text-gray-400 mb-1">IN WORDS / কথায়:</div>
                          <div className="italic text-[15px] font-black font-bengali leading-tight">
                             {invoice.in_word}
                          </div>
                       </div>
                    </div>
                    <div className="col-span-5">
                       <div className="border-l-4 border-black pl-5 space-y-1 text-[15px]">
                          <div className="flex justify-between items-center py-1 border-b-2 border-black font-bold">
                             <span>Total:</span>
                             <span className="font-black text-[16px]">৳{invoice.grand_total}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b-2 border-black font-bold">
                             <span>Paid:</span>
                             <span className="font-black text-[16px]">৳{invoice.advance}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1.5 px-3 bg-white border-2 border-black font-black text-[18px] mt-2">
                             <span>DUE:</span>
                             <span>৳{invoice.due}/-</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Signature Section */}
                 <div className="mt-12 flex justify-between items-end px-6 text-[13px] font-black uppercase tracking-wider">
                    <div className="text-center w-44 border-t-2 border-black pt-1 font-bengali">
                       Customer Sign / গ্রাহকের স্বাক্ষর
                    </div>
                    <div className="text-center w-52 relative">
                       <div className="text-[15px] font-black italic tracking-tighter mb-1 text-black">AUTHORITY</div>
                       <div className="border-t-2 border-black pt-1 font-bengali">
                          Authorized Sign / ক্যাশিয়ার
                       </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;