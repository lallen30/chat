module.exports = {
  apps: [
    {
      name: 'blue_chat_api',
      script: './dist/index.js', // Ensure it points to the correct entry point
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
