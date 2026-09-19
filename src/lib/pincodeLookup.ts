interface PincodeResult {
  valid: boolean;
  pincode: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  error?: string;
}

// In-memory cache for lightning-fast sub-millisecond lookups
const pincodeCache = new Map<string, PincodeResult>();

// Pre-populate popular hub pincodes for instant hit
pincodeCache.set('124001', { valid: true, pincode: '124001', city: 'Rohtak', district: 'Rohtak', state: 'Haryana', country: 'India' });
pincodeCache.set('110001', { valid: true, pincode: '110001', city: 'New Delhi', district: 'Central Delhi', state: 'Delhi', country: 'India' });
pincodeCache.set('400001', { valid: true, pincode: '400001', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', country: 'India' });
pincodeCache.set('560001', { valid: true, pincode: '560001', city: 'Bengaluru', district: 'Bangalore', state: 'Karnataka', country: 'India' });
pincodeCache.set('700001', { valid: true, pincode: '700001', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', country: 'India' });
pincodeCache.set('600001', { valid: true, pincode: '600001', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', country: 'India' });
pincodeCache.set('500001', { valid: true, pincode: '500001', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', country: 'India' });
pincodeCache.set('380001', { valid: true, pincode: '380001', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', country: 'India' });
pincodeCache.set('302001', { valid: true, pincode: '302001', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', country: 'India' });
pincodeCache.set('226001', { valid: true, pincode: '226001', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', country: 'India' });
pincodeCache.set('160017', { valid: true, pincode: '160017', city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh', country: 'India' });
pincodeCache.set('141001', { valid: true, pincode: '141001', city: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', country: 'India' });
pincodeCache.set('201301', { valid: true, pincode: '201301', city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', country: 'India' });
pincodeCache.set('122001', { valid: true, pincode: '122001', city: 'Gurugram', district: 'Gurgaon', state: 'Haryana', country: 'India' });

export async function lookupPincode(rawCode: string | number): Promise<PincodeResult> {
  const code = String(rawCode || '').replace(/\D/g, '').trim();

  if (code.length !== 6) {
    return {
      valid: false,
      pincode: code,
      error: 'Invalid pincode format. Must be a 6-digit Indian Postal PIN.'
    };
  }

  // Check cache first
  if (pincodeCache.has(code)) {
    return pincodeCache.get(code)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Postal API returned ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      const city = po.District || po.Division || po.Block || po.Name;
      const district = po.District || city;
      const state = po.State;

      const result: PincodeResult = {
        valid: true,
        pincode: code,
        city: city || 'Unknown City',
        district: district || city || 'Unknown District',
        state: state || 'Unknown State',
        country: 'India'
      };

      pincodeCache.set(code, result);
      return result;
    }

    const invalidResult: PincodeResult = {
      valid: false,
      pincode: code,
      error: 'Pincode not found in Indian postal registry'
    };
    pincodeCache.set(code, invalidResult);
    return invalidResult;
  } catch (err: any) {
    console.warn(`[Pincode Lookup] Network fallback for ${code}:`, err.message);
    // Return gracefully so user is not blocked
    return {
      valid: true, // Allow user to proceed with manual city/state
      pincode: code,
      city: '',
      district: '',
      state: '',
      country: 'India'
    };
  }
}
