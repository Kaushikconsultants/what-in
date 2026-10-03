'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MapPin,
  CheckCircle2,
  Package,
  ShieldCheck,
  Truck,
  Sparkles,
  CreditCard,
  Building2,
  ArrowRight,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const convId = searchParams.get('conv') || searchParams.get('conversationId') || '';
  const customerId = searchParams.get('c') || searchParams.get('customerId') || '';
  const clientId = searchParams.get('client') || searchParams.get('clientId') || '';
  const amountParam = searchParams.get('amt') || searchParams.get('amount') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [storeName, setStoreName] = useState('Official Store');
  const [clientPhone, setClientPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [streetLandmark, setStreetLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'FULL_COD' | 'PARTIAL_COD' | 'PREPAID'>('FULL_COD');

  // Order Details
  const [items, setItems] = useState<any[]>([]);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [orderDesc, setOrderDesc] = useState('Order Items');
  const [recoverySettings, setRecoverySettings] = useState<any>({
    allowedPaymentModes: ['PREPAID', 'PARTIAL_COD', 'FULL_COD'],
    partialCodMode: 'PERCENTAGE',
    partialCodValue: 10,
    prepaidDiscountPercent: 5
  });

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/whatsapp/checkout/details?conv=${encodeURIComponent(convId)}&c=${encodeURIComponent(customerId)}&client=${encodeURIComponent(clientId)}&amt=${encodeURIComponent(amountParam)}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setStoreName(d.storeName || 'Official Store');
          setClientPhone(d.clientPhone || '');
          setFullName(d.customerName || '');
          setPhone(d.customerPhone || '');
          setHouseFlat(d.houseFlat || '');
          setStreetLandmark(d.streetLandmark || '');
          setPincode(d.pincode || '');
          setCity(d.city || '');
          setState(d.state || '');
          setItems(d.items || []);
          setOrderTotal(Number(d.orderTotal) || Number(amountParam) || 0);
          setOrderDesc(d.orderDesc || 'Order Items');
          if (d.recoverySettings) {
            setRecoverySettings(d.recoverySettings);
            const modes = d.recoverySettings.allowedPaymentModes || [];
            if (modes.includes('FULL_COD')) setPaymentMode('FULL_COD');
            else if (modes.includes('PARTIAL_COD')) setPaymentMode('PARTIAL_COD');
            else if (modes.includes('PREPAID')) setPaymentMode('PREPAID');
          }
        }
      } catch (err: any) {
        console.error('Failed to load checkout details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [convId, customerId, clientId, amountParam]);

  // Auto-lookup Pincode
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);

    if (val.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`/api/whatsapp/pincode/${val}`);
        const data = await res.json();
        if (data.valid || data.success) {
          if (data.city) setCity(data.city);
          if (data.state) setState(data.state);
        }
      } catch (_) {}
      setPincodeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!houseFlat.trim() && !streetLandmark.trim()) {
      setErrorMsg('Please enter your house / flat or street address.');
      return;
    }
    if (!pincode || pincode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/whatsapp/checkout/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          customerId,
          clientId,
          fullName,
          phone,
          houseFlat,
          streetLandmark,
          pincode,
          city,
          state,
          paymentMode,
          orderTotal,
          orderDescription: orderDesc
        })
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(json.error || 'Failed to submit address. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-300 font-medium text-sm">Loading Order & Delivery Form...</p>
      </div>
    );
  }

  if (submitted) {
    const waLink = clientPhone ? `https://wa.me/${clientPhone.replace(/\D/g, '')}` : 'https://wa.me';
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400">
            <CheckCircle2 size={42} className="animate-bounce" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Delivery Details Saved!</h1>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Aapki delivery address successfully receive ho chuki hai. Order confirmation & payment link aapke <span className="text-emerald-400 font-bold">WhatsApp</span> par bhej di gayi hai.
          </p>

          <div className="bg-slate-800/80 rounded-2xl p-4 text-left border border-slate-700/60 mb-6 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Customer:</span>
              <span className="font-semibold text-slate-200">{fullName}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Pincode:</span>
              <span className="font-semibold text-slate-200">{pincode} ({city || 'India'})</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Payment Mode:</span>
              <span className="font-semibold text-emerald-400">
                {paymentMode === 'FULL_COD' ? 'Cash on Delivery (Full COD)' : paymentMode === 'PARTIAL_COD' ? 'Partial COD (Token Advance)' : 'Prepaid Online'}
              </span>
            </div>
          </div>

          <a
            href={waLink}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <MessageSquare size={18} />
            <span>Open WhatsApp Chat</span>
          </a>
        </div>
      </div>
    );
  }

  // Calculate Partial COD and Prepaid calculations
  let partialCodAdvance = 0;
  if (recoverySettings.partialCodMode === 'FIXED') {
    partialCodAdvance = Math.min(orderTotal || 200, recoverySettings.partialCodValue || 200);
  } else {
    partialCodAdvance = Math.max(1, Math.round(((orderTotal || 1000) * (recoverySettings.partialCodValue || 10)) / 100));
  }
  const codBalance = Math.max(0, (orderTotal || partialCodAdvance) - partialCodAdvance);

  const prepaidDiscount = recoverySettings.prepaidDiscountPercent > 0 && orderTotal > 0
    ? Math.round((orderTotal * recoverySettings.prepaidDiscountPercent) / 100)
    : 0;
  const prepaidTotal = Math.max(1, orderTotal - prepaidDiscount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="flex items-center justify-between py-4 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white leading-tight">{storeName}</h2>
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> Verified WhatsApp Store
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-full border border-slate-700">
            1-Tap Checkout
          </span>
        </div>

        {/* Order Summary Card */}
        {orderTotal > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Package size={14} className="text-emerald-400" />
                <span>Order Summary</span>
              </div>
              <span className="text-base font-black text-white">₹{orderTotal.toLocaleString('en-IN')}</span>
            </div>
            {items.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.name}</span>
                    <span className="font-medium text-slate-300">₹{(it.price * it.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">{orderDesc}</p>
            )}
          </div>
        )}

        {/* Address Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <MapPin size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Delivery Address</h3>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">House / Flat No. & Building *</label>
            <input
              type="text"
              required
              placeholder="e.g. Flat 402, Green Valley Apts"
              value={houseFlat}
              onChange={(e) => setHouseFlat(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Street, Area & Landmark</label>
            <input
              type="text"
              placeholder="e.g. Near City Hospital, Sector 14"
              value={streetLandmark}
              onChange={(e) => setStreetLandmark(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6 Digits"
                  value={pincode}
                  onChange={handlePincodeChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500 font-mono"
                />
                {pincodeLoading && (
                  <div className="absolute right-2 top-3">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
              <input
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Payment Preference Selector */}
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-bold text-white mb-2">Select Payment Preference</label>
            <div className="space-y-2">
              {/* Full COD */}
              <label
                onClick={() => setPaymentMode('FULL_COD')}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === 'FULL_COD'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMode === 'FULL_COD' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                    {paymentMode === 'FULL_COD' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Truck size={14} className="text-emerald-400" /> Cash on Delivery (Full COD)
                    </div>
                    <div className="text-[11px] text-slate-400">Pay ₹{orderTotal > 0 ? orderTotal.toLocaleString('en-IN') : 'Total'} upon parcel delivery</div>
                  </div>
                </div>
              </label>

              {/* Partial COD */}
              <label
                onClick={() => setPaymentMode('PARTIAL_COD')}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === 'PARTIAL_COD'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMode === 'PARTIAL_COD' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                    {paymentMode === 'PARTIAL_COD' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" /> Partial COD (Advance Token)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Pay ₹{partialCodAdvance} token on WhatsApp + ₹{codBalance} on delivery
                    </div>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Popular
                </span>
              </label>

              {/* Prepaid Online */}
              <label
                onClick={() => setPaymentMode('PREPAID')}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  paymentMode === 'PREPAID'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMode === 'PREPAID' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                    {paymentMode === 'PREPAID' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <CreditCard size={14} className="text-indigo-400" /> Full Prepaid (Instant UPI)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {prepaidDiscount > 0 ? `Pay ₹${prepaidTotal.toLocaleString('en-IN')} (Saved ₹${prepaidDiscount})` : `Pay ₹${orderTotal} via WhatsApp UPI`}
                    </div>
                  </div>
                </div>
                {prepaidDiscount > 0 && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {recoverySettings.prepaidDiscountPercent}% OFF
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Zero-Payment Guarantee Notice */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-tight text-[11.5px]">
              <strong className="text-slate-200">No payment collected here:</strong> Order confirmation & WhatsApp UPI link will be sent to your chat immediately upon submission.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Address...</span>
              </>
            ) : (
              <>
                <span>Confirm Address & Place Order</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          Powered by What-In Quick Commerce • 100% Encrypted & Safe
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
