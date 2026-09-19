export interface PincodeResult {
  valid: boolean;
  pincode: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  cities?: Array<{ id: string; title: string }>;
  error?: string;
}

// In-memory cache for lightning-fast sub-millisecond lookups
const pincodeCache = new Map<string, PincodeResult>();

// Pre-populate popular hub pincodes for instant hit
pincodeCache.set('124001', {
  valid: true,
  pincode: '124001',
  city: 'Rohtak',
  district: 'Rohtak',
  state: 'Haryana',
  country: 'India',
  cities: [
    { id: 'Rohtak H.O', title: 'Rohtak H.O' },
    { id: 'DLF Colony', title: 'DLF Colony' },
    { id: 'Model Town', title: 'Model Town' },
    { id: 'Medical College', title: 'Medical College' },
    { id: 'Janta Colony', title: 'Janta Colony' }
  ]
});
pincodeCache.set('110001', {
  valid: true,
  pincode: '110001',
  city: 'New Delhi',
  district: 'Central Delhi',
  state: 'Delhi',
  country: 'India',
  cities: [
    { id: 'Connaught Place', title: 'Connaught Place' },
    { id: 'Janpath', title: 'Janpath' },
    { id: 'Barakhamba Road', title: 'Barakhamba Road' },
    { id: 'Bengali Market', title: 'Bengali Market' }
  ]
});
pincodeCache.set('400001', {
  valid: true,
  pincode: '400001',
  city: 'Mumbai',
  district: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  cities: [
    { id: 'Fort', title: 'Fort' },
    { id: 'Bazargate', title: 'Bazargate' },
    { id: 'Marine Lines', title: 'Marine Lines' }
  ]
});
pincodeCache.set('560001', {
  valid: true,
  pincode: '560001',
  city: 'Bengaluru',
  district: 'Bangalore',
  state: 'Karnataka',
  country: 'India',
  cities: [
    { id: 'MG Road', title: 'MG Road' },
    { id: 'Brigade Road', title: 'Brigade Road' },
    { id: 'Cubbon Park', title: 'Cubbon Park' }
  ]
});

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
      const postOffices = data[0].PostOffice as any[];
      const po = postOffices[0];
      const city = po.District || po.Division || po.Block || po.Name;
      const district = po.District || city;
      const state = po.State;

      const rawCities = postOffices.map((p: any) => ({
        id: p.Name,
        title: p.Name
      }));
      const uniqueCities = Array.from(new Map(rawCities.map((c: any) => [c.title, c])).values());

      const result: PincodeResult = {
        valid: true,
        pincode: code,
        city: city || 'Unknown City',
        district: district || city || 'Unknown District',
        state: state || 'Unknown State',
        country: 'India',
        cities: uniqueCities
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
