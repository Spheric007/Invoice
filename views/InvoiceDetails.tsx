
// Fix: Corrected broken import statement and removed accidental interface paste
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
      db.getInvoiceByNo(invoiceNo).then(inv => {
        setInvoice(inv);
      }).catch(console.error);
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
          scale: 4, 
          useCORS: true, 
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true
        });
        const link = document.createElement('a');
        link.download = `Invoice_${invoiceNo}.png`;
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
        <div ref={memoRef} className="memo-container bg-white text-black font-serif" style={{ width: '148mm', height: '210mm', padding: '10mm', position: 'relative', margin: '0' }}>
           <div className="w-full h-full border-[3px] border-black p-4 flex flex-col box-border bg-white font-serif">
              
              <div className="flex justify-center mb-3">
                 <div className="border-[2px] border-black px-12 py-1 text-[16px] font-black uppercase tracking-[2px]">
                    CASH MEMO / ক্যাশ মেমো
                 </div>
              </div>

              <div className="text-center">
                 <h1 className="text-[26px] font-black uppercase tracking-tight leading-none mb-1">
                    MASTER COMPUTER & PRINTING PRESS
                 </h1>
                 <div className="w-full h-[2.5px] bg-black mb-1"></div>
                 
                 <div className="flex justify-between items-center px-1 mb-1">
                    <span className="text-[15px] font-black">Proprietor: S.M. Shahjahan</span>
                    <div className="bg-black text-white px-6 py-0.5 font-sans font-black tracking-widest text-[16px]">
                       01720-365191
                    </div>
                 </div>

                 <div className="flex justify-center mb-2">
                    <div className="border-[2px] border-black px-6 py-0.5 text-[12px] font-black">
                       Primary association Market, Sakhipur, Tangail
                    </div>
                 </div>
                 <div className="w-full h-[2px] bg-black mb-2"></div>
              </div>

              <div className="space-y-1 mb-2 text-[15px] font-black">
                <div className="flex justify-between items-end">
                   <div className="flex flex-1 items-end">
                      <span className="mr-2 whitespace-nowrap">Serial:</span>
                      <div className="flex-1 border-b-[2px] border-black pb-0 px-2 min-h-[20px]">#{invoice.invoice_no}</div>
                   </div>
                   <div className="flex flex-1 items-end pl-10">
                      <span className="mr-2 whitespace-nowrap">Date:</span>
                      <div className="flex-1 border-b-[2px] border-black text-center pb-0 px-2 min-h-[20px]">{formatDisplayDate(invoice.memo_date)}</div>
                   </div>
                </div>

                <div className="flex items-end">
                   <span className="mr-2 whitespace-nowrap">Name:</span>
                   <div className="flex-1 border-b-[2px] border-black pb-0 px-2 font-bengali text-[17px] leading-tight min-h-[24px]">{invoice.client_name}</div>
                   <div className="flex items-end pl-4 w-[45%]">
                      <span className="mr-2 whitespace-nowrap">Mobile:</span>
                      <div className="flex-1 border-b-[2px] border-black text-center pb-0 px-2 min-h-[20px] font-sans">{invoice.client_mobile || '...'}</div>
                   </div>
                </div>

                <div className="flex items-end">
                   <span className="mr-2 whitespace-nowrap">Address:</span>
                   <div className="flex-1 border-b-[2px] border-black pb-0 px-2 font-bengali min-h-[22px] leading-tight">{invoice.client_address || '...'}</div>
                </div>
              </div>
              <div className="w-full h-[2px] bg-black mb-2"></div>

              <div className="flex-grow overflow-hidden">
                 <table className="w-full border-collapse border-[2.5px] border-black text-[15px]">
                    <thead>
                       <tr className="border-b-[2.5px] border-black h-8">
                          <th className="border-r-[2.5px] border-black w-12 text-center font-black">SL</th>
                          <th className="border-r-[2.5px] border-black text-center font-black">Work Description</th>
                          <th className="border-r-[2.5px] border-black w-28 text-center font-black">Qty / Size</th>
                          <th className="border-r-[2.5px] border-black w-20 text-center font-black">Rate</th>
                          <th className="w-28 text-center font-black">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {invoice.items.map((item, i) => (
                          <tr key={i} className="border-b-[1.5px] border-black h-8 align-middle">
                             <td className="border-r-[2.5px] border-black text-center">{i+1}</td>
                             <td className="border-r-[2.5px] border-black pl-3 font-bengali text-[15px] leading-none py-0.5">{item.details}</td>
                             <td className="border-r-[2.5px] border-black text-center">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}
                             </td>
                             <td className="border-r-[2.5px] border-black text-center">{item.rate || ''}</td>
                             <td className="text-right pr-2">৳{item.total}/-</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="mt-auto pt-2">
                 <div className="flex justify-between items-end gap-3">
                    <div className="flex-1 border-[2.5px] border-black p-2 min-h-[65px] flex flex-col justify-start">
                       <span className="text-[9px] font-black text-gray-500 mb-0.5 uppercase">In Words / কথায়:</span>
                       <span className="font-bengali font-black text-[13px] italic leading-tight">{convertToWords(Number(invoice.grand_total))}</span>
                    </div>

                    <div className="w-52 flex flex-col gap-0.5 text-[14px] font-black">
                       <div className="flex justify-between border-b-[1.5px] border-black pb-0.5">
                          <span>Total:</span>
                          <span>৳{Number(invoice.grand_total).toFixed(0)}/-</span>
                       </div>
                       <div className="flex justify-between border-b-[1.5px] border-black pb-0.5">
                          <span>Paid:</span>
                          <span>৳{Number(invoice.advance).toFixed(0)}/-</span>
                       </div>
                       <div className="flex justify-between items-center bg-white border-[2.5px] border-black px-3 py-1 mt-0.5 font-black text-[18px]">
                          <span>DUE:</span>
                          <span>৳{Number(invoice.due).toFixed(0)}/-</span>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 flex justify-between px-4">
                    <div className="text-center w-44 pt-1 border-t-[2px] border-black font-black uppercase text-[10px] font-bengali tracking-wider">CUSTOMER SIGN</div>
                    <div className="text-center w-52 flex flex-col items-center">
                       <span className="font-black italic text-[14px] mb-0.5">AUTHORITY</span>
                       <div className="w-full pt-1 border-t-[2px] border-black font-black uppercase text-[10px] font-bengali tracking-wider">AUTHORIZED SIGN</div>
                    </div>
                 </div>
                 <div className="mt-4 flex flex-col items-center">
                    <p className="text-[8px] font-bold text-gray-600 italic">This is an electronically generated invoice.</p>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;