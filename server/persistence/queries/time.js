export function nowIso() {
  return new Date().toISOString();
}

export function sevenDaysFromNowIso() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}
