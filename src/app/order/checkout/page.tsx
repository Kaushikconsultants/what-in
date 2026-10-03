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
  AlertCircle,
  Building
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
  const [postOffices, setPostOffices] = useState<string[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<string>('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'FULL_COD' | 'PARTIAL_COD' | 'PREPAID'>('PARTIAL_COD');

  // Order Details
  const [items, setItems] = useState<any[]>([]);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [orderDesc, setOrderDesc] = useState('Order Items');
  const [recoverySettings, setRecoverySettings] = useState<any>({
    allowedPaymentModes: ['PREPAID', 'PARTIAL_COD'],
    partialCodMode: 'PERCENTAGE',
    partialCodValue: 10,
    prepaidDiscountPercent: 5
  });

  const fetchPostOfficesForPincode = async (code: string) => {
    const cleanPin = String(code || '').replace(/\D/g, '').slice(0, 6);
    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`/api/whatsapp/pincode/${cleanPin}`);
        const data = await res.json();
        if (data.valid || data.success) {
          if (data.city) setCity(data.city);
          if (data.state) setState(data.state);
          const list = data.postOffices || (data.cities || []).map((c: any) => c.title || c.id || c) || [];
          setPostOffices(list);
          if (list.length > 0 && !selectedPostOffice) {
            setSelectedPostOffice(list[0]);
          }
        }
      } catch (_) {}
      setPincodeLoading(false);
    } else {
      setPostOffices([]);
      setSelectedPostOffice('');
    }
  };

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

          if (d.pincode && d.pincode.length === 6) {
            fetchPostOfficesForPincode(d.pincode);
          }

          if (d.recoverySettings) {
            setRecoverySettings(d.recoverySettings);
            const modes = d.recoverySettings.allowedPaymentModes || [];
            if (modes.includes('PARTIAL_COD')) {
              setPaymentMode('PARTIAL_COD');
            } else if (modes.includes('PREPAID')) {
              setPaymentMode('PREPAID');
            } else if (modes.includes('FULL_COD')) {
              setPaymentMode('FULL_COD');
            }
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
    fetchPostOfficesForPincode(val);
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

    const resolvedStreetLandmark = [
      selectedPostOffice ? `[PO: ${selectedPostOffice}]` : '',
      streetLandmark
    ].filter(Boolean).join(' ');

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
          streetLandmark: resolvedStreetLandmark,
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
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-600 font-medium text-sm">Loading Order & Delivery Form...</p>
      </div>
    );
  }

  if (submitted) {
    const waLink = clientPhone ? `https://wa.me/${clientPhone.replace(/\D/g, '')}` : 'https://wa.me';
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-slate-200/60 relative overflow-hidden">
          <div className="w-20 h-20 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600">
            <CheckCircle2 size={42} className="animate-bounce" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Delivery Details Saved!</h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Aapki delivery address successfully receive ho chuki hai. Order confirmation & payment link aapke <span className="text-emerald-600 font-bold">WhatsApp</span> par bhej di gayi hai.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 mb-6 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Customer:</span>
              <span className="font-semibold text-slate-800">{fullName}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Delivery Area:</span>
              <span className="font-semibold text-slate-800">{selectedPostOffice ? `${selectedPostOffice}, ` : ''}{pincode} ({city || 'India'})</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Payment Mode:</span>
              <span className="font-bold text-emerald-700">
                {paymentMode === 'FULL_COD' ? 'Cash on Delivery (Full COD)' : paymentMode === 'PARTIAL_COD' ? 'Partial COD (Token Advance)' : 'Prepaid Online'}
              </span>
            </div>
          </div>

          <a
            href={waLink}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
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

  // Check allowed modes strictly
  const allowedModes: string[] = Array.isArray(recoverySettings?.allowedPaymentModes) && recoverySettings.allowedPaymentModes.length > 0
    ? recoverySettings.allowedPaymentModes
    : ['PREPAID', 'PARTIAL_COD'];
  const showFullCod = allowedModes.includes('FULL_COD') || allowedModes.includes('COD');
  const showPartialCod = allowedModes.includes('PARTIAL_COD') || allowedModes.includes('PARTIAL');
  const showPrepaid = allowedModes.includes('PREPAID') || allowedModes.includes('ONLINE');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 text-slate-900 flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="flex items-center justify-between py-4 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md shadow-emerald-600/20">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">{storeName}</h2>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck size={13} /> Verified WhatsApp Store
              </p>
            </div>
          </div>
          <span className="text-[10.5px] bg-white text-slate-700 font-bold px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            1-Tap Checkout
          </span>
        </div>

        {/* Order Summary Card */}
        {orderTotal > 0 && (
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Package size={15} className="text-emerald-600" />
                <span>Order Summary</span>
              </div>
              <span className="text-base font-black text-slate-900">₹{orderTotal.toLocaleString('en-IN')}</span>
            </div>
            {items.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.name}</span>
                    <span className="font-semibold text-slate-800">₹{(it.price * it.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{orderDesc}</p>
            )}
          </div>
        )}

        {/* Address Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/40 space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <MapPin size={17} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Delivery Address</h3>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-sm text-slate-900 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-sm text-slate-900 placeholder-slate-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">House / Flat No. & Building *</label>
            <input
              type="text"
              required
              placeholder="e.g. Flat 402, Green Valley Apts"
              value={houseFlat}
              onChange={(e) => setHouseFlat(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Street, Area & Landmark</label>
            <input
              type="text"
              placeholder="e.g. Near City Hospital, Sector 14"
              value={streetLandmark}
              onChange={(e) => setStreetLandmark(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6 Digits"
                  value={pincode}
                  onChange={handlePincodeChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none text-sm text-slate-900 placeholder-slate-400 font-mono font-bold"
                />
                {pincodeLoading && (
                  <div className="absolute right-2.5 top-3">
                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-sm text-slate-900 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none text-sm text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Post Office Dropdown Selector */}
          {postOffices && postOffices.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5">
              <label className="block text-xs font-bold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                <Building size={14} className="text-emerald-700" />
                Select Post Office / Locality *
              </label>
              <select
                value={selectedPostOffice}
                onChange={(e) => setSelectedPostOffice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm text-slate-900 font-semibold cursor-pointer"
              >
                <option value="">-- Choose your local Post Office ({postOffices.length} found) --</option>
                {postOffices.map((po, idx) => (
                  <option key={idx} value={po}>
                    📍 {po}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-800 mt-1">
                Postal division auto-detected from PIN {pincode}.
              </p>
            </div>
          )}

          {/* Payment Preference Selector */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-900">Select Payment Preference</label>
              {Number(recoverySettings?.prepaidDiscountPercent) > 0 && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <Sparkles size={12} className="text-emerald-600" /> {recoverySettings.prepaidDiscountPercent}% UPI Discount Active
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {/* Partial COD (Only rendered if enabled in admin settings) */}
              {showPartialCod && (
                <label
                  onClick={() => setPaymentMode('PARTIAL_COD')}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMode === 'PARTIAL_COD'
                      ? 'bg-emerald-50/80 border-emerald-600 text-slate-900 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMode === 'PARTIAL_COD' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                      {paymentMode === 'PARTIAL_COD' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                        <Sparkles size={15} className="text-amber-600" /> Partial COD (Advance Token)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {orderTotal > 0 ? (
                          <>Pay <strong className="text-slate-800">₹{partialCodAdvance.toLocaleString('en-IN')}</strong> token on WhatsApp + <strong className="text-slate-800">₹{codBalance.toLocaleString('en-IN')}</strong> on delivery</>
                        ) : (
                          <>Pay {recoverySettings.partialCodMode === 'FIXED' ? `₹${recoverySettings.partialCodValue || 200}` : `${recoverySettings.partialCodValue || 10}%`} token advance online + rest on delivery</>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    Popular
                  </span>
                </label>
              )}

              {/* Prepaid Online (Only rendered if enabled in admin settings) */}
              {showPrepaid && (
                <label
                  onClick={() => setPaymentMode('PREPAID')}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMode === 'PREPAID'
                      ? 'bg-emerald-50/80 border-emerald-600 text-slate-900 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMode === 'PREPAID' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                      {paymentMode === 'PREPAID' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                        <CreditCard size={15} className="text-indigo-600" /> Full Prepaid (Instant UPI)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {orderTotal > 0 ? (
                          prepaidDiscount > 0 ? (
                            <>Pay <strong className="text-emerald-700 font-bold">₹{prepaidTotal.toLocaleString('en-IN')}</strong> (Saved ₹{prepaidDiscount}) via Instant WhatsApp UPI</>
                          ) : (
                            <>Pay <strong className="text-slate-800">₹{orderTotal.toLocaleString('en-IN')}</strong> via WhatsApp UPI</>
                          )
                        ) : (
                          <>Pay via Instant WhatsApp UPI {Number(recoverySettings?.prepaidDiscountPercent) > 0 ? `(Get ${recoverySettings.prepaidDiscountPercent}% Extra Instant Discount)` : ''}</>
                        )}
                      </div>
                    </div>
                  </div>
                  {Number(recoverySettings?.prepaidDiscountPercent) > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      {recoverySettings.prepaidDiscountPercent}% OFF
                    </span>
                  )}
                </label>
              )}

              {/* Full COD (Only rendered if enabled in admin settings) */}
              {showFullCod && (
                <label
                  onClick={() => setPaymentMode('FULL_COD')}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMode === 'FULL_COD'
                      ? 'bg-emerald-50/80 border-emerald-600 text-slate-900 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMode === 'FULL_COD' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                      {paymentMode === 'FULL_COD' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                        <Truck size={15} className="text-emerald-600" /> Cash on Delivery (Full COD)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {orderTotal > 0 ? `Pay ₹${orderTotal.toLocaleString('en-IN')} upon parcel delivery` : 'Pay 100% in cash upon parcel delivery'}
                      </div>
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Zero-Payment Guarantee Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-tight text-[11.5px]">
              <strong className="text-slate-800">No payment collected on this form:</strong> Order confirmation & WhatsApp UPI link will be sent to your chat immediately upon submission.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

        <p className="text-center text-[11px] text-slate-400 mt-4">
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
        <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
