import { appConfig } from "@/config/app";

const dialDigits = appConfig.phone.countryCode;

/**
 * Store UAE numbers as E.164 (`+9715...`). Display formatting stays separate.
 */
export function normalizeUaePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  let national = digits;

  if (national.startsWith(`00${dialDigits}`)) {
    national = national.slice(dialDigits.length + 2);
  } else if (national.startsWith(dialDigits)) {
    national = national.slice(dialDigits.length);
  }

  if (national.startsWith("0")) national = national.slice(1);
  if (!/^[2-9]\d{7,8}$/.test(national)) return null;
  return `${appConfig.phone.dialCode}${national}`;
}

export function nationalFromE164(value: string) {
  const normalized = normalizeUaePhone(value);
  if (!normalized) return value.replace(/\D/g, "").replace(/^971/, "").replace(/^0/, "");
  return normalized.slice(appConfig.phone.dialCode.length);
}

export function formatUaePhone(value: string) {
  const normalized = normalizeUaePhone(value);
  if (!normalized) return value;
  const national = normalized.slice(appConfig.phone.dialCode.length);
  if (national.length === 9) {
    return `${appConfig.phone.dialCode} ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }
  return `${appConfig.phone.dialCode} ${national.slice(0, 1)} ${national.slice(1, 4)} ${national.slice(4)}`;
}
