import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  output: 'standalone'
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true
});
