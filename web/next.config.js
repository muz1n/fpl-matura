/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'resources.premierleague.com',
                pathname: '/premierleague/**',
            },
        ],
    },
    // Prefetching nur für echte Navigation, nicht für API routes
    experimental: {
        optimizeCss: false,
    },
}

module.exports = nextConfig
