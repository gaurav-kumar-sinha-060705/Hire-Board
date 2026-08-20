export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function publicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

export function profileSummary(user) {
  const p = user?.profile || {};
  return { headline: p.headline || "", company: p.company || "", location: p.location || "", bio: p.bio || "" };
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function cleanString(val, max) {
  return String(val || "").trim().slice(0, max);
}

export function cleanUrl(val, max) {
  let value = String(val || "").trim().slice(0, max);
  if (value && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = "https://" + value;
  return value;
}

export function dataUrlBytes(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const b64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}
