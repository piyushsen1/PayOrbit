/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets Next compile @app/shared's raw TS directly instead of requiring it to
  // ship a prebuilt dist/ — see packages/shared and root package.json.
  transpilePackages: ['@app/shared'],
};

module.exports = nextConfig;
