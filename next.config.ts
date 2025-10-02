
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // webpack: (config, { isServer, dev }) => {
  //   if (!isServer && !dev && config.entry && typeof config.entry === 'function') {
  //     const originalEntry = config.entry;
  //     config.entry = async () => {
  //       const entries = await originalEntry();
  //       // Add your service worker script to the entry points
  //       // This ensures it's processed by webpack.
  //       // However, for firebase-messaging-sw.js, it's often best to keep it simple and in public.
  //       // If you need to bundle more complex SW logic, this is one way.
  //       // if (entries['main.js'] && !entries['main.js'].includes('./src/lib/firebase-sw-register.js')) {
  //       //   entries['main.js'].unshift('./src/lib/firebase-sw-register.js');
  //       // }
  //       return entries;
  //     };
  //   }
  //   return config;
  // },
};

export default nextConfig;
