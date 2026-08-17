const WINDOW_MS = 60 * 1000;

const buckets = new Map();

export function rateLimit(max, message = "Too many requests. Try again shortly.") {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start >= WINDOW_MS) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.start + WINDOW_MS - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export function clearRateLimits() {
  buckets.clear();
}
