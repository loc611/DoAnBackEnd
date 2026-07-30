module.exports = {
  apps: [
    {
      name: 'school-management-api',
      script: 'npm',
      args: 'run start:prod --workspace=server@1.0.0', // Gọi script trong workspace backend
      cwd: './', // Root directory
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
