
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
          scale: 3, 
          useCORS: true, 
          backgroundColor: "#ffffff" 
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
            <i className="fas fa-image mr-2"></i> Download Image
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
        <div ref={memoRef} className="bg-white p-8 border-2 border-black" style={{ width: '148mm', minHeight: '210mm' }}>
           <div className="flex flex-col h-full border-2 border-black p-4 font-bengali text-black">
              {/* Header */}
              <div className="text-center border-b-2 border-black pb-4 mb-4">
                 <h2 className="text-[12px] font-black uppercase tracking-[3px] border-2 border-black px-6 py-1 inline-block mb-3">Cash Memo / ক্যাশ মেমো</h2>
                 <h1 className="text-[26px] font-black tracking-tighter uppercase">MASTER COMPUTER & PRINTING PRESS</h1>
                 <div className="flex justify-between items-center mt-3 border-t-2 border-black pt-2 px-2 font-black text-[12px]">
                   <span>Proprietor: S.M. Shahjahan</span>
                   <span className="bg-black text-white px-3 py-0.5 rounded">01720-365191</span>
                 </div>
                 <div className="border border-black px-3 py-1 mt-2 mx-auto inline-block text-[10px] font-bold">Primary association Market, Sakhipur, Tangail</div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-[13px] border-b-2 border-gray-200 pb-3 px-1">
                 <div className="space-y-1.5">
                   <p className="flex"><span className="font-black w-14">Serial:</span> <span className="border-b border-black flex-1 font-black">#{invoice.invoice_no}</span></p>
                   <p className="flex"><span className="font-black w-14">Name:</span> <span className="border-b border-black flex-1 font-black">{invoice.client_name}</span></p>
                   <p className="flex"><span className="font-black w-14">Address:</span> <span className="border-b border-black flex-1 font-medium">{invoice.client_address || '...'}</span></p>
                 </div>
                 <div className="text-right space-y-1.5 pl-4">
                   <p className="flex justify-end"><span className="font-black mr-2">Date:</span> <span className="border-b border-black min-w-[100px] text-center font-black">{formatDisplayDate(invoice.memo_date)}</span></p>
                   <p className="flex justify-end"><span className="font-black mr-2">Mobile:</span> <span className="border-b border-black min-w-[100px] text-center font-black">{invoice.client_mobile || '...'}</span></p>
                 </div>
              </div>

              {/* Items Table */}
              <div className="flex-grow">
                <table className="w-full border-2 border-black text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-black border-b-2 border-black">
                      <th className="p-2 border-r-2 border-black w-10 text-center">SL</th>
                      <th className="p-2 border-r-2 border-black text-left pl-3">Work Description</th>
                      <th className="p-2 border-r-2 border-black w-24 text-center">Qty / Size</th>
                      <th className="p-2 border-r-2 border-black w-20 text-center">Rate</th>
                      <th className="p-2 text-right w-24 pr-3">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, i) => (
                      <tr key={i} className="border-b border-black h-9 font-black">
                        <td className="p-1 border-r-2 border-black text-center">{i+1}</td>
                        <td className="p-1 border-r-2 border-black pl-3">{item.details}</td>
                        <td className="p-1 border-r-2 border-black text-center font-sans text-[11px]">
                          {item.len && item.wid ? `${item.len}'x${item.wid}' (${item.qty})` : item.qty}
                        </td>
                        <td className="p-1 border-r-2 border-black text-center">{Number(item.rate).toFixed(0)}</td>
                        <td className="p-1 text-right pr-3">{Number(item.total).toFixed(0)}/-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Totals */}
              <div className="mt-4 flex justify-between items-start font-black">
                <div className="w-[60%] border-2 border-black p-3 bg-gray-50 rounded-sm">
                  <span className="text-[9px] uppercase text-gray-500 block mb-1">In Words / কথায়:</span>
                  <p className="italic text-sm">{invoice.in_word}</p>
                </div>
                <div className="w-44 space-y-0.5 border-l-2 border-black pl-4">
                  <div className="flex justify-between py-1 border-b border-black/10"><span>Total:</span><span>৳{Number(invoice.grand_total).toFixed(0)}/-</span></div>
                  <div className="flex justify-between py-1 border-b border-black/10 text-green-700"><span>Paid:</span><span>৳{Number(invoice.advance).toFixed(0)}/-</span></div>
                  <div className="flex justify-between pt-1 text-lg text-red-600 bg-gray-100 px-1 font-black"><span>DUE:</span><span>৳{Number(invoice.due).toFixed(0)}/-</span></div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-16 px-6 text-[10px] font-black uppercase tracking-wider">
                <div className="text-center w-28 border-t-2 border-black pt-1">Customer Sign</div>
                <div className="text-center w-36 border-t-2 border-black pt-1">
                  Authorized Sign
                  <p className="text-[7px] text-gray-500 mt-0.5 normal-case">Master Computer & Press</p>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
