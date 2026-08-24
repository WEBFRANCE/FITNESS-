import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

// npm install @serwist/next serwist
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
});

const nextConfig: NextConfig = {};

export default withSerwist(nextConfig);
