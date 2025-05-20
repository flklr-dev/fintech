const corsOptions = {
  origin: [
    'http://13.212.176.39:3000',
    'http://localhost:3000',
    'http://localhost:19006', // Expo development server
    /\.ap-southeast-1\.compute\.amazonaws\.com$/ // Allow all EC2 domains
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

module.exports = corsOptions; 