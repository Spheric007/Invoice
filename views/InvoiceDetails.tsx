
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
        <button onClick={() => navigateTo(View.Invoices)} className="text-lightText hover:text-black transition-colors flex items-center font-bold">
          <i className="fas fa-arrow-left mr-2"></i> Back to List
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrint} className="bg-black text-white px-6 py-2.5 rounded-xl font-black flex items-center shadow-lg hover:scale-105 transition-transform"><i className="fas fa-print mr-2"></i> Print</button>
          <button onClick={handleDownloadPNG} className="bg-gray-200 text-black px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-gray-300 transition-colors"><i className="fas fa-image mr-2"></i> Download Image</button>
          <button onClick={() => navigateTo(View.EditInvoice, { invoiceNo: invoice.invoice_no })} className="bg-white border-2 border-black text-black px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md hover:bg-black hover:text-white transition-all"><i className="fas fa-edit mr-2"></i> Edit</button>
        </div>
      </div>

      <div className="flex justify-center bg-gray-200/50 p-6 rounded-2xl overflow-x-auto">
        <div ref={memoRef} className="memo-container bg-white shadow-2xl" style={{ width: '148mm', height: '210mm', padding: '5mm', position: 'relative', overflow: 'hidden' }}>
           <div className="w-full h-full border-2 border-black p-3 flex flex-col box-border font-serif text-black">
              
              <div className="flex justify-center -mt-1 mb-3">
                 <div className="border-2 border-black px-8 py-1.5 text-[14px] font-black uppercase tracking-[3px]">
                    CASH MEMO / ক্যাশ মেমো
                 </div>
              </div>

              <div className="text-center">
                 <h1 className="text-[21px] font-black uppercase tracking-tight leading-none mb-2">
                    MASTER COMPUTER & PRINTING PRESS
                 </h1>
                 <div className="border-t-2 border-black mt-1 mb-1"></div>
                 <div className="flex justify-between items-center px-1 py-0.5 font-bold text-[14px]">
                    <span>Proprietor: S.M. Shahjahan</span>
                    <div className="bg-black text-white px-5 py-0.5 rounded-sm font-sans font-black tracking-widest text-[14px]">
                       01720-365191
                    </div>
                 </div>
                 <div className="flex justify-center mt-1">
                    <div className="border-2 border-black px-6 py-0.5 text-[12px] font-bold">
                       Primary association Market, Sakhipur, Tangail
                    </div>
                 </div>
                 <div className="border-t-2 border-black mt-2 mb-4"></div>
              </div>

              <div className="grid grid-cols-12 gap-y-2 mb-4 text-[14px] font-bold">
                 <div className="col-span-7 space-y-1">
                    <div className="flex items-end">
                       <span className="w-16">Serial:</span>
                       <span className="border-b border-black flex-1 pl-2 pb-0 font-black">#{invoice.invoice_no}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-16">Name:</span>
                       <span className="border-b border-black flex-1 pl-2 pb-0 font-black">{invoice.client_name}</span>
                    </div>
                    <div className="flex items-end font-bengali">
                       <span className="w-16">Address:</span>
                       <span className="border-b border-black flex-1 pl-2 pb-0 font-medium">{invoice.client_address || '...'}</span>
                    </div>
                 </div>
                 <div className="col-span-5 space-y-1">
                    <div className="flex items-end justify-end">
                       <span className="mr-3">Date:</span>
                       <span className="border-b border-black flex-1 text-center pb-0 font-black">{formatDisplayDate(invoice.memo_date)}</span>
                    </div>
                    <div className="flex items-end justify-end font-sans">
                       <span className="mr-3">Mobile:</span>
                       <span className="border-b border-black flex-1 text-center pb-0 font-black">{invoice.client_mobile || '...'}</span>
                    </div>
                 </div>
              </div>

              <div className="flex-grow">
                 <table className="w-full border-collapse border-2 border-black text-[14px]">
                    <thead>
                       <tr className="border-b-2 border-black h-8 bg-white">
                          <th className="border-r-2 border-black w-10 text-center">SL</th>
                          <th className="border-r-2 border-black text-center">Work Description</th>
                          <th className="border-r-2 border-black w-24 text-center">Qty / Size</th>
                          <th className="border-r-2 border-black w-24 text-center">Rate</th>
                          <th className="w-24 text-center">Total (৳)</th>
                       </tr>
                    </thead>
                    <tbody className="font-black">
                       {invoice.items.map((item, i) => (
                          <tr key={i} className="border-b border-black h-8 align-middle">
                             <td className="border-r-2 border-black text-center">{i+1}</td>
                             <td className="border-r-2 border-black pl-3 font-bengali leading-none">{item.details}</td>
                             <td className="border-r-2 border-black text-center font-sans">
                                {item.len && item.wid ? `${item.len}x${item.wid}` : (item.qty || '')}
                             </td>
                             <td className="border-r-2 border-black text-center">{item.rate || ''}</td>
                             <td className="text-right pr-3 font-sans">৳{item.total}/-</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="mt-4">
                 <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-7">
                       <div className="border-2 border-black p-2 h-16 flex flex-col justify-between">
                          <div className="text-[10px] uppercase font-black text-gray-500 mb-1">IN WORDS:</div>
                          <div className="italic text-[14px] font-black font-bengali leading-tight truncate">
                             {invoice.in_word}
                          </div>
                       </div>
                    </div>
                    <div className="col-span-5">
                       <div className="border-l-4 border-black pl-4 space-y-0.5 text-[14px]">
                          <div className="flex justify-between items-center py-0.5 border-b border-black font-bold">
                             <span>Total:</span>
                             <span className="font-black">৳{invoice.grand_total}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-0.5 border-b border-black font-bold">
                             <span>Paid:</span>
                             <span className="font-black">৳{invoice.advance}/-</span>
                          </div>
                          <div className="flex justify-between items-center py-1 px-2 bg-white border border-black font-black text-[16px] mt-1">
                             <span>DUE:</span>
                             <span>৳{invoice.due}/-</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="mt-10 flex justify-between items-end px-4 text-[13px] font-black uppercase tracking-wider">
                    <div className="text-center w-40 border-t-2 border-black pt-1">
                       Customer Sign
                    </div>
                    <div className="text-center w-48 relative">
                       <div className="text-[14px] font-black italic tracking-tighter mb-0.5 text-black">Authority</div>
                       <div className="border-t-2 border-black pt-1">
                          Authorized Sign
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
