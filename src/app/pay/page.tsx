'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

function PayContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);
  const upiId = searchParams.get('pa');
  const payeeName = searchParams.get('pn');
  const amount = searchParams.get('am');
  const desc = searchParams.get('tn');

  useEffect(() => {
    if (!upiId || !amount) {
      setError(true);
      return;
    }

    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || 'Merchant')}&am=${amount}&cu=INR&tn=${encodeURIComponent(desc || '')}`;
    
    // Automatically attempt to open the UPI app
    window.location.href = upiLink;
  }, [upiId, payeeName, amount, desc]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Payment Link</h1>
          <p className="text-gray-500 text-sm">This payment link is broken or missing required parameters.</p>
        </div>
      </div>
    );
  }

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId || '')}&pn=${encodeURIComponent(payeeName || 'Merchant')}&am=${amount || ''}&cu=INR&tn=${encodeURIComponent(desc || '')}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-pulse">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">₹{amount}</h1>
        <p className="text-gray-500 text-sm mb-8 font-medium">Paying {payeeName || 'Merchant'}</p>
        
        <p className="text-sm text-gray-600 mb-6">If your payment app didn't open automatically, click the button below:</p>
        
        <a 
          href={upiLink}
          className="block w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
        >
          Open UPI App
        </a>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>}>
      <PayContent />
    </Suspense>
  );
}
