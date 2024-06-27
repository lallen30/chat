require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'blue_chat_api',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: true,
      ignore_watch: ['node_modules', 'public', 'logs', '*.db-journal', 'database.db'],
      watch_options: {
        followSymlinks: false,
      },
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT,
        SECRET_KEY: process.env.SECRET_KEY,
        COOKIE_SECRET: process.env.COOKIE_SECRET,
        AT_KEY: process.env.AT_KEY,
        PASSCODE: process.env.PASSCODE
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT,
        SECRET_KEY: process.env.SECRET_KEY,
        COOKIE_SECRET: process.env.COOKIE_SECRET,
        AT_KEY: process.env.AT_KEY,
        PASSCODE: process.env.PASSCODE
      }
    }
  ]
};
