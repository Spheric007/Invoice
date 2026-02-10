
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
        <div ref={memoRef} className="memo-container bg-white" style={{ width: '148mm', height: '210mm' }}>
           <div className="memo-inner flex flex-col h-full border-none p-4 font-serif text-black">
              {/* Header Section */}
              <div className="text-center mb-1">
                <p className="text-[11px] font-bold uppercase tracking-[1px] mb-0.5">Cash Memo</p>
                <h1 className="text-[20px] font-bold leading-none mb-1">MASTER COMPUTER & PRINTING PRESS</h1>
                
                <div className="flex justify-between items-center py-1 px-1 text-[11px] font-bold">
                    <span className="border-b border-black">Proprietor: S.M. Shahjahan</span>
                    <span className="font-sans border-b border-black">01720-365191</span>
                </div>
                
                <p className="text-[9px] font-medium italic mt-2 leading-tight">All types of composing, graphic design, and printing work are done here.</p>
                <p className="text-[9px] font-bold leading-tight">Primary Teachers Association Market, Sakhipur, Tangail.</p>
                <div className="mt-2 mb-4 border-b border-black"></div>
             </div>

             {/* Client Info Section */}
             <div className="grid grid-cols-2 gap-x-12 mb-6 text-[12px] px-1">
                <div className="space-y-2">
                  <p className="flex items-center"><span className="font-bold w-18">Serial No:</span> <span className="border-b border-dotted border-black flex-1 font-bold pl-1">#{invoice.invoice_no}</span></p>
                  <p className="flex items-center font-bengali"><span className="font-bold w-18">Name:</span> <span className="border-b border-dotted border-black flex-1 font-bold pl-1">{invoice.client_name}</span></p>
                  <p className="flex items-center font-bengali"><span className="font-bold w-18">Address:</span> <span className="border-b border-dotted border-black flex-1 pl-1 text-[11px]">{invoice.client_address || 'Sakhipur, Tangail'}</span></p>
                </div>
                <div className="space-y-2">
                  <p className="flex items-center justify-end"><span className="font-bold mr-2">Date:</span> <span className="border-b border-dotted border-black min-w-[120px] text-center font-bold pl-1">{new Date(invoice.memo_date || '').toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'})}</span></p>
                  <p className="flex items-center justify-end"><span className="font-bold mr-2">Mobile:</span> <span className="border-b border-dotted border-black min-w-[120px] text-center font-bold pl-1 font-sans">{invoice.client_mobile || '01xxx-xxxxxx'}</span></p>
                </div>
             </div>

             {/* Table Section */}
             <div className="flex-grow">
               <table className="w-full text-[11px]">
                 <thead>
                   <tr className="border-b-2 border-black">
                     <th className="p-2 w-8 text-center uppercase">SL</th>
                     <th className="p-2 text-left uppercase pl-4">Description of Details</th>
                     <th className="p-2 w-16 text-center uppercase">Qty.</th>
                     <th className="p-2 w-20 text-center uppercase">Rate</th>
                     <th className="p-2 w-24 text-right uppercase pr-4">Total (৳)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-300">
                   {invoice.items.map((item, i) => (
                     <tr key={i} className="h-10 align-middle">
                       <td className="p-2 text-center">{i+1}</td>
                       <td className="p-2 font-bengali pl-4 font-bold">{item.details} {item.len && item.wid ? `(${item.len}x${item.wid} ft)` : ''}</td>
                       <td className="p-2 text-center">{item.qty}</td>
                       <td className="p-2 text-center">{Number(item.rate).toLocaleString()}</td>
                       <td className="p-2 text-right pr-4 font-bold">{Number(item.total).toLocaleString()}/-</td>
                     </tr>
                   ))}
                 </tbody>
                 <tfoot className="border-t-2 border-black">
                    <tr>
                        <td colSpan={3}></td>
                        <td className="p-2 font-bold text-[10px] text-right">Total:</td>
                        <td className="p-2 text-right font-black pr-4">৳{Number(invoice.grand_total).toLocaleString()}/-</td>
                    </tr>
                    <tr>
                        <td colSpan={3}></td>
                        <td className="p-2 font-bold text-[10px] text-right">Paid:</td>
                        <td className="p-2 text-right font-black pr-4 text-green-700">৳{Number(invoice.advance).toLocaleString()}/-</td>
                    </tr>
                    <tr className="bg-gray-100">
                        <td colSpan={3}></td>
                        <td className="p-2 font-black text-[11px] text-right uppercase">Due:</td>
                        <td className="p-2 text-right font-black pr-4 text-red-600">৳{Number(invoice.due).toLocaleString()}/-</td>
                    </tr>
                 </tfoot>
               </table>
             </div>

             {/* Footer Words and Signature */}
             <div className="mt-8 flex justify-between items-end px-1 pb-10">
                <div className="text-[11px] font-bold">
                    <span className="italic mr-2">In Words:</span>
                    <span className="border-b border-black pb-0.5">{invoice.in_word}</span>
                </div>
                <div className="text-center">
                    <div className="w-32 border-t border-black pt-1 text-[10px] font-bold">
                        <p>Authorized Signature</p>
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
