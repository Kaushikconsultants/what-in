"use client";

import React, { useState, useEffect } from "react";
import { X, Printer, FileText, Package, Check, MapPin, Phone, Mail, Building, Truck } from "lucide-react";
import { UnifiedOrder } from "@/app/actions/whatsAppOrderActions";

interface StoreDetails {
  name: string;
  tradeName: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface OrderInvoiceModalProps {
  order: UnifiedOrder | null;
  storeDetails: StoreDetails;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "invoice" | "packingslip";
}

function numberToWordsINR(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const rounded = Math.round(num);
  return `${inWords(rounded)} Rupees Only`;
}

export default function OrderInvoiceModal({
  order,
  storeDetails,
  isOpen,
  onClose,
  initialTab = "invoice"
}: OrderInvoiceModalProps) {
  const [tab, setTab] = useState<"invoice" | "packingslip">(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  if (!isOpen || !order) return null;

  const invoiceNumber = `INV-${order.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}`;
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* PRINT-SPECIFIC CSS RULES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide all app chrome, sidebars, modals, buttons */
          body * {
            visibility: hidden;
          }
          /* Only display the printable document */
          #printable-order-document,
          #printable-order-document * {
            visibility: visible !important;
          }
          #printable-order-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #111827 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* MODAL WRAPPER (HIDDEN DURING PRINT) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto no-print">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
          
          {/* Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Printer size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  Print Order Document
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {order.orderNumber}
                  </span>
                </h3>
              </div>
            </div>

            {/* Document Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTab("invoice")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  tab === "invoice"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileText size={13} />
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setTab("packingslip")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  tab === "packingslip"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Package size={13} />
                Packing Slip
              </button>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer size={13} />
                Print Now
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Preview Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex justify-center">
            
            {/* THE PRINTABLE DOCUMENT CANVAS */}
            <div
              id="printable-order-document"
              className="bg-white text-slate-900 w-full max-w-[210mm] p-6 sm:p-8 rounded-xl shadow-md border border-slate-200"
            >
              {tab === "invoice" ? (
                /* ========================================================= */
                /* TAX INVOICE TEMPLATE                                      */
                /* ========================================================= */
                <div className="flex flex-col gap-6 text-[12px] font-sans">
                  
                  {/* Store Header & Invoice Title */}
                  <div className="flex justify-between items-start border-b border-slate-300 pb-5">
                    <div className="flex flex-col gap-1 max-w-sm">
                      <h1 className="text-xl font-black text-slate-900 tracking-tight m-0 uppercase">
                        {storeDetails.tradeName || storeDetails.name}
                      </h1>
                      <p className="text-slate-600 text-[11px] m-0 leading-tight">
                        {storeDetails.address}, {storeDetails.city}, {storeDetails.state} - {storeDetails.pincode}
                      </p>
                      <div className="text-[10.5px] text-slate-500 flex flex-wrap gap-x-3 mt-1 font-mono">
                        <span>GSTIN: <strong>{storeDetails.gstin}</strong></span>
                        {storeDetails.pan && <span>PAN: <strong>{storeDetails.pan}</strong></span>}
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex gap-x-3 mt-0.5">
                        <span>Phone: {storeDetails.phone}</span>
                        <span>Email: {storeDetails.email}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-black tracking-widest uppercase px-3 py-1 bg-slate-900 text-white rounded">
                        TAX INVOICE
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                        Original for Recipient
                      </span>
                      <div className="mt-2.5 text-right font-mono text-[11px]">
                        <div><span className="text-slate-500">Invoice No:</span> <strong>{invoiceNumber}</strong></div>
                        <div><span className="text-slate-500">Invoice Date:</span> {orderDate}</div>
                        <div><span className="text-slate-500">Order ID:</span> <strong>{order.orderNumber}</strong></div>
                        <div>
                          <span className="text-slate-500">Payment:</span>{" "}
                          <span className="font-bold text-slate-900">
                            {order.financials.paymentMode === "PREPAID"
                              ? "PREPAID ONLINE"
                              : order.financials.paymentMode === "PARTIAL_COD"
                              ? "PARTIAL COD"
                              : "CASH ON DELIVERY"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information (Bill To / Ship To) */}
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Billed To
                      </span>
                      <div className="font-bold text-slate-900 text-sm">{order.customer.name}</div>
                      <div className="text-slate-600 mt-0.5">{order.customer.phone}</div>
                      <div className="text-slate-600 text-[11.5px] mt-1 leading-snug">
                        {order.customer.fullAddress}
                      </div>
                      {order.customer.city && (
                        <div className="text-slate-600 text-[11px] font-medium mt-0.5">
                          {order.customer.city}, {order.customer.state} - {order.customer.pincode}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Shipped To
                      </span>
                      <div className="font-bold text-slate-900 text-sm">{order.customer.name}</div>
                      <div className="text-slate-600 mt-0.5">{order.customer.phone}</div>
                      <div className="text-slate-600 text-[11.5px] mt-1 leading-snug">
                        {order.customer.fullAddress}
                      </div>
                      {order.customer.pincode && (
                        <div className="text-slate-700 text-[11px] font-bold mt-1">
                          Delivery Pincode: {order.customer.pincode}
                        </div>
                      )}
                      {order.fulfillment.courierName && (
                        <div className="text-slate-600 text-[11px] mt-1 font-mono">
                          Courier: {order.fulfillment.courierName}
                          {order.fulfillment.awbNumber && ` | AWB: ${order.fulfillment.awbNumber}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-hidden border border-slate-300 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3 font-mono text-center">SKU / Code</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {order.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900">{it.name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                              {it.sku || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              ₹{it.price.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              {it.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono">
                              ₹{it.total.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Breakdown & Signatory */}
                  <div className="grid grid-cols-12 gap-6 pt-2">
                    {/* Left: Amount in Words & Payment Split */}
                    <div className="col-span-7 flex flex-col justify-between gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="text-[10.5px] text-slate-500 uppercase font-bold block mb-0.5">
                          Amount in Words
                        </span>
                        <p className="font-bold text-slate-900 italic m-0">
                          {numberToWordsINR(order.financials.totalAmount)}
                        </p>
                      </div>

                      {/* Advance vs COD Split */}
                      <div className="p-3 rounded-lg border border-slate-200 flex flex-col gap-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Payment Status:</span>
                          <span className="font-bold uppercase text-slate-900">{order.financials.paymentStatus}</span>
                        </div>
                        {order.financials.advanceAmountPaid > 0 && (
                          <div className="flex justify-between font-bold text-emerald-700">
                            <span>Advance Received Online:</span>
                            <span className="font-mono">₹{order.financials.advanceAmountPaid.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {order.financials.codBalanceDue > 0 && (
                          <div className="flex justify-between font-bold text-amber-800 bg-amber-50 p-1 rounded">
                            <span>Cash on Delivery Due (Collect on Arrival):</span>
                            <span className="font-mono">₹{order.financials.codBalanceDue.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>

                      {/* Terms */}
                      <div className="text-[10px] text-slate-500 leading-tight">
                        <strong>Terms of Sale:</strong> All disputes are subject to local jurisdiction. Items once delivered can be exchanged as per standard exchange policy within 7 days. This is a computer generated invoice.
                      </div>
                    </div>

                    {/* Right: Calculations Table */}
                    <div className="col-span-5 flex flex-col justify-between">
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-mono font-medium">₹{order.financials.subtotal.toLocaleString("en-IN")}</span>
                        </div>

                        {order.financials.discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>
                              Discount {order.financials.discountCode ? `(${order.financials.discountCode})` : ""}:
                            </span>
                            <span className="font-mono">-₹{order.financials.discountAmount.toLocaleString("en-IN")}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-600">
                          <span>Shipping / Delivery:</span>
                          <span className="font-mono">
                            {order.financials.shippingFee > 0
                              ? `₹${order.financials.shippingFee.toLocaleString("en-IN")}`
                              : "FREE"}
                          </span>
                        </div>

                        {order.financials.tax > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Taxes / GST:</span>
                            <span className="font-mono">₹{order.financials.tax.toLocaleString("en-IN")}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t-2 border-slate-900 flex justify-between font-black text-slate-900 text-sm">
                          <span>Total Amount:</span>
                          <span className="font-mono">₹{order.financials.totalAmount.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Signatory Box */}
                      <div className="mt-8 text-right border-t border-slate-300 pt-3">
                        <span className="text-[10.5px] font-bold text-slate-700 block">
                          For {storeDetails.tradeName || storeDetails.name}
                        </span>
                        <div className="h-10"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Authorized Signatory
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3 mt-2">
                    Thank you for shopping with {storeDetails.name}! For assistance, reach us on WhatsApp: {storeDetails.phone}
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* WAREHOUSE PACKING SLIP TEMPLATE                          */
                /* ========================================================= */
                <div className="flex flex-col gap-6 text-[12px] font-sans">
                  {/* Packing Slip Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                    <div>
                      <h1 className="text-lg font-black text-slate-900 tracking-tight m-0 uppercase">
                        {storeDetails.name}
                      </h1>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Warehouse Packing Slip &amp; Dispatch Order
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-black text-slate-900">
                        {order.orderNumber}
                      </div>
                      <div className="text-xs text-slate-500">Date: {orderDate}</div>
                    </div>
                  </div>

                  {/* Courier & AWB Barcode Block */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-100 border border-slate-300">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Logistics Partner &amp; Method
                      </span>
                      <div className="font-bold text-slate-900 text-sm">
                        {order.fulfillment.courierName || "Express Courier Delivery"}
                      </div>
                      <div className="font-mono text-xs text-slate-700 mt-1">
                        AWB: <strong>{order.fulfillment.awbNumber || "PENDING ASSIGNMENT"}</strong>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end justify-center">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Payment Collectable
                      </span>
                      {order.financials.codBalanceDue > 0 ? (
                        <div className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded text-amber-900 font-black text-sm">
                          COLLECT COD: ₹{order.financials.codBalanceDue.toLocaleString("en-IN")}
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 rounded text-emerald-900 font-bold text-xs">
                          PREPAID — DO NOT COLLECT CASH
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destination Shipping Address */}
                  <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Deliver To:
                    </span>
                    <div className="text-base font-black text-slate-900">{order.customer.name}</div>
                    <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">
                      Phone: {order.customer.phone}
                    </div>
                    <div className="text-xs text-slate-700 mt-1.5 leading-relaxed font-medium">
                      {order.customer.fullAddress}
                    </div>
                    {order.customer.city && (
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {order.customer.city}, {order.customer.state} — PIN: {order.customer.pincode}
                      </div>
                    )}
                  </div>

                  {/* Checklist of Items to Pack */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        Items to Pack ({order.items.reduce((s, it) => s + it.quantity, 0)} Total Units)
                      </span>
                      <span className="text-[10.5px] text-slate-500">
                        Check box [✓] upon verifying each item in package
                      </span>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                            <th className="py-2.5 px-3 w-12 text-center">Check</th>
                            <th className="py-2.5 px-3">Item Details</th>
                            <th className="py-2.5 px-3 font-mono text-center">SKU</th>
                            <th className="py-2.5 px-3 text-center">Qty to Pack</th>
                            <th className="py-2.5 px-3 text-center">Verified</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {order.items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-3 px-3 text-center">
                                <div className="w-4 h-4 border-2 border-slate-400 rounded inline-block"></div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900 text-xs">{it.name}</span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                                {it.sku || "—"}
                              </td>
                              <td className="py-3 px-3 text-center font-black text-sm">
                                {it.quantity}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-400 text-[11px]">
                                [ &nbsp; ]
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Warehouse Sign-off */}
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 mt-4 text-xs">
                    <div>
                      <span className="text-[10.5px] font-bold text-slate-500 block mb-1">
                        Quality Check &amp; Packed By:
                      </span>
                      <div className="h-10 border-b border-slate-300 flex items-end pb-1 text-slate-400 italic">
                        Signature / Employee ID
                      </div>
                    </div>
                    <div>
                      <span className="text-[10.5px] font-bold text-slate-500 block mb-1">
                        Dispatch Handover Date &amp; Time:
                      </span>
                      <div className="h-10 border-b border-slate-300 flex items-end pb-1 text-slate-400 italic font-mono">
                        Date: ____/____/2026 &nbsp; Time: ____:____
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
