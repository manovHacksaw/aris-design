import arcjet, { shield } from '@arcjet/node';

// Base instance — shield WAF on every protected route.
// Per-route rate limit rules are added via .withRule() at the route level.
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN' }),
  ],
});

export default aj;
