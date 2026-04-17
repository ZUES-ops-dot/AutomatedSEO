import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true
});
