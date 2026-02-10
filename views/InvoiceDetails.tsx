
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
      printRoot.appendChild(clone);
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const handleDownloadPNG = async () => {
    if (memoRef.current) {
      try {
        // High quality settings for image download
        // @ts-ignore
        const canvas = await html2canvas(memoRef.current, { 
          scale: 4, 
          useCORS: true, 
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true
        });
        const link = document.createElement('a');
        link.download = `MasterComputer_Invoice_${invoiceNo}.png`;
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
      } catch (e) {
        alert("Failed to download image. Error: " + e);
      }
    }
  };

  if (!invoice) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20 no-print">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4">
        <button 
          onClick={() => navigateTo(View.Invoices)}
          className="text-lightText hover:text-primary transition-colors flex items-center font-bold"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back to Invoices
        </button>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handlePrint}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-black flex items-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <i className="fas fa-print mr-2"></i> Print Invoice
          </button>
          <button 
            onClick={handleDownloadPNG}
            className="bg-[#2196F3] text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-blue-600 transition-colors"
          >
            <i className="fas fa-image mr-2"></i> Download A5 Image
          </button>
          <button 
            onClick={() => navigateTo(View.EditInvoice, { invoiceNo: invoice.invoice_no })}
            className="bg-warning text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-orange-600 transition-colors"
          >
            <i className="fas fa-edit mr-2"></i> Edit Invoice
          </button>
        </div>
      </div>

      <div className="flex justify-center bg-gray-200/50 p-4 md:p-10 rounded-2xl overflow-x-auto">
        {/* VIEWING AREA (SIMULATING A5) */}
        <div ref={memoRef} className="memo-container bg-white shadow-2xl" style={{ width: '148mm', height: '210mm', padding: '10mm', position: 'relative', overflow: 'hidden' }}>
           <div className="w-full h-full border-2 border-black p-4 flex flex-col box-border font-serif text-black">
              
              {/* Top Header Label */}
              <div className="flex justify-center mb-6">
                 <div className="border-2 border-black px-10 py-2 text-[14px] font-black uppercase tracking-[3px]">
                    CASH MEMO / ক্যাশ মেমো
                 </div>
              </div>

              {/* Company Header */}
              <div className="text-center mb-4">
                 <h1 className="text-[28px] font-black uppercase tracking-tight leading-none mb-4">
                    MASTER COMPUTER & PRINTING PRESS
                 </h1>
                 <div className="border-t-2 border-black mt-2 mb-2"></div>
                 <div className="flex justify-between items-center px-2 py-1 font-bold text-[14px]">
                    <span>Proprietor: S.M. Shahjahan</span>
                    <div className="bg-black text-white px-6 py-1 rounded-sm font-sans font-black tracking-widest">
                       01720-365191
                    </div>
                 </div>
                 <div className="flex justify-center mt-2">
                    <div className="border-2 border-black px-8 py-1 text-[11px] font-bold">
                       Primary association Market, Sakhipur, Tangail
                    </div>
                 </div>
                 <div className="border-t-2 border-black mt-4 mb-6"></div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-12 gap-y-4 mb-6 text-[15px] font-bold">
                 <div className="col-span-7 space-y-3">
                    <div className="flex items-end">
                       <span className="w-20">Serial:</span>
                       <span className="border-b border-black flex-1 pl-4 pb-0.5 font-black">#{invoice.invoice_no}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-20">Name:</span>
                       <span className="border-b border-black flex-1 pl-4 pb-0.5 font-black">{invoice.client_name}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-20">Address:</span>
                       <span className="border-b border-black flex-1 pl-4 pb-0.5">{invoice.client_address || '...'}</span>
                    </div>
                 </div>
                 <div className="col-span-5 space-y-3">
                    <div className="flex items-end justify-end">
                       <span className="mr-4">Date:</span>
                       <span className="border-b border-black flex-1 text-center pb-0.5 font-black">{formatDisplayDate(invoice.memo_date)}</span>
                    </div>
                    <div className="flex items-end justify-end font-sans">
                       <span className="mr-4">Mobile:</span>
                       <span className="border-b border-black flex-1 text-center pb-0.5 font-black">{invoice.client_mobile || '...'}</span>
                    </div>
                 </div>
              </div>

              {/* Table Area */}
              <div className="flex-grow">
                 <table className="w-full border-collapse border-2 border-black text-[15px]">
                    <thead>
                       <tr className="border-b-2 border-black h-12">
                          <th className="border-r-2 border-black w-12 text-center">SL</th>
                          <th className="border-r-2 border-black text-center">Work Description</th>
                          <th className="border-r-2 border-black w-32 text-center">Qty / Size</th>
                          <th className="border-r-2 border-black w-24 text-center">Rate</th>
                          <th className="w-28 text-center">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {invoice.items.map((item, i) => (
                          <tr key={item.id} className="border-b-2 border-black h-11 align-middle">
                             <td className="border-r-2 border-black text-center">{i+1}</td>
                             <td className="border-r-2 border-black pl-4 font-bengali">{item.details}</td>
                             <td className="border-r-2 border-black text-center font-sans">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : item.qty}
                             </td>
                             <td className="border-r-2 border-black text-center">{item.rate}</td>
                             <td className="text-right pr-4">৳{item.total}/-</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              {/* Financial Summary */}
              <div className="mt-8">
                 <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-7">
                       <div className="border-2 border-black p-4 h-24 flex flex-col justify-between">
                          <div className="text-[10px] uppercase font-black text-gray-500 mb-2">IN WORDS / কথায়:</div>
                          <div className="italic text-[16px] font-black font-bengali leading-snug">
                             {invoice.in_word}
                          </div>
                       </div>
                    </div>
                    <div className="col-span-5">
                       <div className="border-l-4 border-black pl-6 space-y-2">
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 font-bold text-[16px]">
                             <span>Total:</span>
                             <span className="font-black text-[18px]">৳{invoice.grand_total}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 font-bold text-[16px] text-green-700">
                             <span>Paid:</span>
                             <span className="font-black text-[18px]">৳{invoice.advance}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 bg-gray-50 font-black text-[22px] text-red-600 mt-2">
                             <span>DUE:</span>
                             <span>৳{invoice.due}/-</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Signatures at Bottom */}
                 <div className="mt-16 flex justify-between items-end px-4 text-[13px] font-black uppercase tracking-[1px]">
                    <div className="text-center w-48 border-t-2 border-black pt-2">
                       CUSTOMER SIGN
                    </div>
                    <div className="text-center w-56 relative">
                       <div className="text-[18px] font-black italic tracking-tighter mb-1 text-primary" style={{ fontFamily: 'Georgia, serif' }}>
                          MASTER COMPUTER
                       </div>
                       <div className="border-t-2 border-black pt-2">
                          AUTHORIZED SIGN
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
