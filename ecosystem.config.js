module.exports = {
  apps: [
    {
      name: 'blue_chat_api',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3107,
        SECRET_KEY: '83d9df5d584c994a773482fe764484fbde4d91168a91a328040f57eaa32e62f5',
        COOKIE_SECRET: '83d9df5d584c994a773482fe764484fbde4d91168a91a328040f57eaa32e62f5'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3107,
        SECRET_KEY: '83d9df5d584c994a773482fe764484fbde4d91168a91a328040f57eaa32e62f5',
        COOKIE_SECRET: '83d9df5d584c994a773482fe764484fbde4d91168a91a328040f57eaa32e62f5'
      }
    }
  ]
};
