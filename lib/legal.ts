export const LEGAL_EFFECTIVE_DATE = "August 6, 2026";
export const LEGAL_VERSION = "2026-08-06";

export function getLegalContactEmail() {
  return process.env.LEGAL_CONTACT_EMAIL ?? "support@pacificradar.app";
}

export function getLegalOperatorName() {
  return process.env.LEGAL_OPERATOR_NAME ?? "Pacific Radar";
}
