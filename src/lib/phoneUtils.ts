// ITU-T E.164 International Country Calling Codes
const THREE_DIGIT_COUNTRY_CODES = [
  "971", // UAE
  "966", // Saudi Arabia
  "965", // Kuwait
  "974", // Qatar
  "968", // Oman
  "973", // Bahrain
  "962", // Jordan
  "961", // Lebanon
  "964", // Iraq
  "967", // Yemen
  "880", // Bangladesh
  "977", // Nepal
  "975", // Bhutan
  "960", // Maldives
  "852", // Hong Kong
  "853", // Macau
  "855", // Cambodia
  "856", // Laos
  "886", // Taiwan
  "234", // Nigeria
  "254", // Kenya
  "255", // Tanzania
  "256", // Uganda
  "233", // Ghana
  "251", // Ethiopia
  "212", // Morocco
  "213", // Algeria
  "216", // Tunisia
  "351", // Portugal
  "352", // Luxembourg
  "353", // Ireland
  "354", // Iceland
  "358", // Finland
  "420", // Czech Republic
  "421", // Slovakia
  "380", // Ukraine
  "385", // Croatia
  "381", // Serbia
];

const TWO_DIGIT_COUNTRY_CODES = [
  "91", // India
  "44", // United Kingdom
  "49", // Germany
  "33", // France
  "39", // Italy
  "34", // Spain
  "31", // Netherlands
  "32", // Belgium
  "41", // Switzerland
  "43", // Austria
  "46", // Sweden
  "47", // Norway
  "45", // Denmark
  "48", // Poland
  "30", // Greece
  "90", // Turkey
  "20", // Egypt
  "27", // South Africa
  "51", // Peru
  "52", // Mexico
  "54", // Argentina
  "55", // Brazil
  "56", // Chile
  "57", // Colombia
  "58", // Venezuela
  "60", // Malaysia
  "61", // Australia
  "62", // Indonesia
  "63", // Philippines
  "64", // New Zealand
  "65", // Singapore
  "66", // Thailand
  "81", // Japan
  "82", // South Korea
  "84", // Vietnam
  "86", // China
  "92", // Pakistan
  "94", // Sri Lanka
  "95", // Myanmar
  "98", // Iran
];

export interface ParsedPhone {
  countryCode: string; // e.g. "+91", "+51", "+1"
  nationalNumber: string;
  formatted: string; // e.g. "+91 98765 43210" or "+51 18810104"
  rawDigits: string;
}

/**
 * Dynamically parses any phone string and detects its ITU country code.
 */
export function parseDynamicPhone(input: string | null | undefined): ParsedPhone {
  if (!input) {
    return { countryCode: "", nationalNumber: "", formatted: "", rawDigits: "" };
  }

  const trimmed = String(input).trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return { countryCode: "", nationalNumber: trimmed, formatted: trimmed, rawDigits: "" };
  }

  // 1. Explicit "+" was present in the original input
  if (trimmed.startsWith("+")) {
    // Check 3-digit codes
    for (const code of THREE_DIGIT_COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        const nat = digits.slice(code.length);
        return {
          countryCode: `+${code}`,
          nationalNumber: nat,
          formatted: `+${code} ${nat}`,
          rawDigits: digits
        };
      }
    }
    // Check 2-digit codes
    for (const code of TWO_DIGIT_COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        const nat = digits.slice(code.length);
        return {
          countryCode: `+${code}`,
          nationalNumber: nat,
          formatted: formatWithGrouping(`+${code}`, nat),
          rawDigits: digits
        };
      }
    }
    // 1-digit code (1 for NANP: USA/Canada, 7 for Russia/KZ)
    if (digits.startsWith("1") || digits.startsWith("7")) {
      const code = digits[0];
      const nat = digits.slice(1);
      return {
        countryCode: `+${code}`,
        nationalNumber: nat,
        formatted: formatWithGrouping(`+${code}`, nat),
        rawDigits: digits
      };
    }
  }

  // 2. 10-digit numbers
  // In the WhatsApp CRM database, any 10-digit number without an explicit country code is an Indian number (with 91 prefix required for Meta delivery)
  if (digits.length === 10) {
    return {
      countryCode: "+91",
      nationalNumber: digits,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      rawDigits: `91${digits}`
    };
  }

  // 3. 11-digit numbers
  if (digits.length === 11) {
    // Starts with 1 (USA / Canada: +1)
    if (digits.startsWith("1")) {
      const nat = digits.slice(1);
      return {
        countryCode: "+1",
        nationalNumber: nat,
        formatted: `+1 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`,
        rawDigits: digits
      };
    }

    // Starts with 7 (Russia / Kazakhstan: +7)
    if (digits.startsWith("7")) {
      const nat = digits.slice(1);
      return {
        countryCode: "+7",
        nationalNumber: nat,
        formatted: `+7 ${nat}`,
        rawDigits: digits
      };
    }

    // Starts with 61 (Australia: +61)
    if (digits.startsWith("61")) {
      const nat = digits.slice(2);
      return {
        countryCode: "+61",
        nationalNumber: nat,
        formatted: `+61 ${nat}`,
        rawDigits: digits
      };
    }

    // Starts with 51 (Peru mobile 9 digits: 51 9XXXXXXXX)
    if (digits.startsWith("51")) {
      const nat = digits.slice(2);
      return {
        countryCode: "+51",
        nationalNumber: nat,
        formatted: `+51 ${nat}`,
        rawDigits: digits
      };
    }

    // Check other 2-digit codes
    for (const code of TWO_DIGIT_COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        const nat = digits.slice(code.length);
        return {
          countryCode: `+${code}`,
          nationalNumber: nat,
          formatted: formatWithGrouping(`+${code}`, nat),
          rawDigits: digits
        };
      }
    }
  }

  // 4. 12-digit numbers
  if (digits.length === 12) {
    // India (+91)
    if (digits.startsWith("91")) {
      const nat = digits.slice(2);
      return {
        countryCode: "+91",
        nationalNumber: nat,
        formatted: `+91 ${nat.slice(0, 5)} ${nat.slice(5)}`,
        rawDigits: digits
      };
    }

    // Check 3-digit codes (971, 966, etc.)
    for (const code of THREE_DIGIT_COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        const nat = digits.slice(code.length);
        return {
          countryCode: `+${code}`,
          nationalNumber: nat,
          formatted: `+${code} ${nat}`,
          rawDigits: digits
        };
      }
    }

    // Check 2-digit codes (44, 49, 33, etc.)
    for (const code of TWO_DIGIT_COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        const nat = digits.slice(code.length);
        return {
          countryCode: `+${code}`,
          nationalNumber: nat,
          formatted: formatWithGrouping(`+${code}`, nat),
          rawDigits: digits
        };
      }
    }
  }

  // 5. 13-digit or longer numbers
  // Check 3-digit codes first
  for (const code of THREE_DIGIT_COUNTRY_CODES) {
    if (digits.startsWith(code)) {
      const nat = digits.slice(code.length);
      return {
        countryCode: `+${code}`,
        nationalNumber: nat,
        formatted: `+${code} ${nat}`,
        rawDigits: digits
      };
    }
  }

  // Check 2-digit codes
  for (const code of TWO_DIGIT_COUNTRY_CODES) {
    if (digits.startsWith(code)) {
      const nat = digits.slice(code.length);
      return {
        countryCode: `+${code}`,
        nationalNumber: nat,
        formatted: formatWithGrouping(`+${code}`, nat),
        rawDigits: digits
      };
    }
  }

  // Check 1-digit code
  if (digits.startsWith("1") || digits.startsWith("7")) {
    const code = digits[0];
    const nat = digits.slice(1);
    return {
      countryCode: `+${code}`,
      nationalNumber: nat,
      formatted: formatWithGrouping(`+${code}`, nat),
      rawDigits: digits
    };
  }

  // Default fallback: display with leading "+"
  return {
    countryCode: "+",
    nationalNumber: digits,
    formatted: `+${digits}`,
    rawDigits: digits
  };
}

/**
 * Helper to group numbers neatly.
 */
function formatWithGrouping(code: string, nat: string): string {
  if (code === "+91" && nat.length === 10) {
    return `${code} ${nat.slice(0, 5)} ${nat.slice(5)}`;
  }
  if (code === "+1" && nat.length === 10) {
    return `${code} ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`;
  }
  if (code === "+44" && nat.length === 10) {
    return `${code} ${nat.slice(0, 4)} ${nat.slice(4)}`;
  }
  if (code === "+51") {
    return `${code} ${nat}`;
  }
  if (nat.length > 6) {
    const mid = Math.floor(nat.length / 2);
    return `${code} ${nat.slice(0, mid)} ${nat.slice(mid)}`;
  }
  return `${code} ${nat}`;
}

/**
 * Main function used across components to display phone numbers dynamically.
 */
export function formatWhatsAppPhone(input: string | null | undefined): string {
  if (!input) return "";
  const parsed = parseDynamicPhone(input);
  return parsed.formatted || String(input);
}

/**
 * Resolves the phone number for WhatsApp API sending (ensures digits-only E.164).
 */
export function resolveWhatsAppDispatchPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const parsed = parseDynamicPhone(phone);
  return parsed.rawDigits || String(phone).replace(/\D/g, "");
}

/**
 * Returns a canonical phone key for deduplication (last 10 digits if available).
 */
export function normalizePhoneKey(input: string | null | undefined): string {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Returns all possible lookup keys for a phone number across various international & local formats.
 * E.g. "+91 98765 43210", "919876543210", "09876543210", "9876543210"
 * All map to overlapping keys: ["9876543210", "919876543210", "+919876543210"]
 */
export function getPhoneLookupKeys(input: string | null | undefined): string[] {
  if (!input) return [];
  const rawStr = String(input).trim();
  const digits = rawStr.replace(/\D/g, "");
  if (!digits || digits.length < 7) return [];

  const keys = new Set<string>();

  // Full digits
  keys.add(digits);
  keys.add(`+${digits}`);

  // Last 10 digits
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    keys.add(last10);
    keys.add(`+91${last10}`);
    keys.add(`91${last10}`);
  }

  // If starts with 91 (India) and length 12
  if (digits.startsWith("91") && digits.length === 12) {
    keys.add(digits.slice(2));
  }

  // If starts with 0 (trunk prefix) and length 11
  if (digits.startsWith("0") && digits.length === 11) {
    keys.add(digits.slice(1));
  }

  // If 10 digits (Standard Indian national mobile)
  if (digits.length === 10) {
    keys.add(`91${digits}`);
    keys.add(`+91${digits}`);
    keys.add(`0${digits}`);
  }

  return Array.from(keys);
}

