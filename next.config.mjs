import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// ES module equivalent of __filename and __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove static export for hybrid deployment - Vercel handles this automatically
  // Enable bundle analyzer when ANALYZE=true
  ...(process.env.ANALYZE === 'true' && {
    experimental: {
      bundlePagesRouterDependencies: true,
    },
  }),
  // Webpack configuration to fix caching issues
  webpack: (config, { dev, isServer }) => {
    // Configure filesystem cache for both dev and build
    config.cache = {
      type: 'filesystem',
      cacheDirectory: resolve(__dirname, 'node_modules/.cache/webpack'),
      buildDependencies: {
        config: [__filename],
      },
      // Environment-specific cache versioning
      version: `${process.env.NODE_ENV || 'development'}-${dev ? 'dev' : 'build'}`,
    }
    
    // Optimize infrastructure logging (suppress cache warnings)
    config.infrastructureLogging = {
      level: 'error',
      debug: false,
    }
    
    // Optimize resolve configuration
    config.resolve = {
      ...config.resolve,
      cache: true,
      // Reduce filesystem calls for better performance
      symlinks: false,
    }
    
    // Enhanced snapshot options for dependency tracking
    config.snapshot = {
      managedPaths: [/^(.+?[\\/]node_modules[\\/])/],
      immutablePaths: [],
      buildDependencies: {
        hash: true,
        timestamp: true,
      },
      module: {
        timestamp: true,
      },
      resolve: {
        timestamp: true,
      },
      // Add resolve cache to reduce filesystem operations
      resolveBuildDependencies: {
        hash: true,
        timestamp: true,
      },
    }
    
    return config
  },
}

// Wrap with bundle analyzer if enabled
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer(nextConfig)
