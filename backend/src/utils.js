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
