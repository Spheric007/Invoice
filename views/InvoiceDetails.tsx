
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
        // @ts-ignore
        const canvas = await html2canvas(memoRef.current, { 
          scale: 4, 
          useCORS: true, 
          backgroundColor: "#ffffff",
          windowWidth: 148 * 3.78, 
          windowHeight: 210 * 3.78 
        });
        const link = document.createElement('a');
        link.download = `Invoice_${invoiceNo}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (e) {
        alert("Failed to download image.");
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
        <div ref={memoRef} className="memo-container bg-white shadow-2xl" style={{ width: '148.5mm', height: '210mm' }}>
           <div className="w-full h-full p-0.5 border border-black">
              <div className="w-full h-full p-4 border-2 border-black flex flex-col font-serif text-black relative">
                 {/* Top Label */}
                 <div className="flex justify-center mb-5">
                    <div className="border-2 border-black px-6 py-1 text-[13px] font-black uppercase tracking-[2px]">
                       Cash Memo / ক্যাশ মেমো
                    </div>
                 </div>

                 {/* Header */}
                 <div className="text-center mb-4">
                    <h1 className="text-[24px] font-black uppercase tracking-tight leading-none mb-3">
                        MASTER COMPUTER & PRINTING PRESS
                    </h1>
                    <div className="flex justify-between items-center px-4 py-1 border-t border-b border-black text-[12px] font-bold">
                       <span>Proprietor: S.M. Shahjahan</span>
                       <div className="bg-black text-white px-3 py-0.5 rounded-sm font-sans">01720-365191</div>
                    </div>
                    <div className="flex justify-center mt-2">
                       <div className="border border-black px-4 py-0.5 text-[9px] font-bold">
                          Primary association Market, Sakhipur, Tangail
                       </div>
                    </div>
                    <div className="border-b border-black mt-3"></div>
                 </div>

                 {/* Client Info */}
                 <div className="grid grid-cols-12 gap-x-6 mb-5 text-[13px] font-bold">
                    <div className="col-span-7 space-y-2">
                       <div className="flex items-end">
                          <span className="w-16">Serial:</span>
                          <span className="border-b border-black flex-1 pl-2 pb-0.5 font-black">#{invoice.invoice_no}</span>
                       </div>
                       <div className="flex items-end font-bengali">
                          <span className="w-16">Name:</span>
                          <span className="border-b border-black flex-1 pl-2 pb-0.5 font-black">{invoice.client_name}</span>
                       </div>
                       <div className="flex items-end font-bengali">
                          <span className="w-16">Address:</span>
                          <span className="border-b border-black flex-1 pl-2 pb-0.5">{invoice.client_address || '...'}</span>
                       </div>
                    </div>
                    <div className="col-span-5 space-y-2">
                       <div className="flex items-end justify-end">
                          <span className="mr-2">Date:</span>
                          <span className="border-b border-black flex-1 text-center pb-0.5">{formatDisplayDate(invoice.memo_date)}</span>
                       </div>
                       <div className="flex items-end justify-end font-sans">
                          <span className="mr-2">Mobile:</span>
                          <span className="border-b border-black flex-1 text-center pb-0.5">{invoice.client_mobile || '...'}</span>
                       </div>
                    </div>
                 </div>

                 {/* Table - Dynamic items only */}
                 <div className="flex-grow">
                    <table className="w-full border-collapse border-2 border-black text-[13px]">
                       <thead>
                          <tr className="border-b-2 border-black h-9 bg-gray-50">
                             <th className="border-r border-black w-10 text-center">SL</th>
                             <th className="border-r border-black text-center pl-2">Work Description</th>
                             <th className="border-r border-black w-24 text-center">Qty / Size</th>
                             <th className="border-r border-black w-20 text-center">Rate</th>
                             <th className="w-24 text-center">Total (৳)</th>
                          </tr>
                       </thead>
                       <tbody className="font-black">
                          {invoice.items.map((item, i) => (
                             <tr key={i} className="border-b border-black h-9 align-middle">
                                <td className="border-r border-black text-center">{i+1}</td>
                                <td className="border-r border-black pl-3 font-bengali">{item.details}</td>
                                <td className="border-r border-black text-center font-sans text-[11px]">
                                   {item.len && item.wid ? `${item.len}x${item.wid}` : item.qty}
                                </td>
                                <td className="border-r border-black text-center">{item.rate}</td>
                                <td className="text-right pr-3">{item.total}/-</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 {/* Footer Summary */}
                 <div className="mt-5 grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-7">
                       <div className="border border-black p-3 h-20 flex flex-col justify-between bg-white">
                          <div className="text-[9px] uppercase font-black text-gray-500 mb-1">IN WORDS / কথায়:</div>
                          <div className="italic text-[14px] font-black font-bengali leading-snug">
                             {invoice.in_word}
                          </div>
                       </div>
                    </div>
                    <div className="col-span-5">
                       <div className="border-l-2 border-black pl-3 space-y-0.5">
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 font-bold text-[13px]">
                             <span>Total:</span>
                             <span className="font-black">৳{invoice.grand_total}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 font-bold text-[13px] text-green-700">
                             <span>Paid:</span>
                             <span className="font-black">৳{invoice.advance}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-2 bg-gray-100 font-black text-[15px] text-red-600 mt-1">
                             <span>DUE:</span>
                             <span>৳{invoice.due}/-</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Bottom Signature Section */}
                 <div className="mt-auto flex justify-between items-end px-6 pb-2 text-[11px] font-bold uppercase tracking-wider">
                    <div className="text-center w-32 border-t border-black pt-1">
                      Customer Sign
                    </div>
                    <div className="text-center w-48 relative">
                       <div className="text-[14px] font-black italic tracking-tighter mb-0.5 text-primary">Master Computer</div>
                       <div className="border-t border-black pt-1">Authorized Sign</div>
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
