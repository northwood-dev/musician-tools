const { execSync } = require('node:child_process');

try {
  console.log('Running Sequelize migrations in release phase...');
  execSync('./node_modules/.bin/sequelize-cli db:migrate --env production', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('Release migrations completed successfully.');
} catch (error) {
  console.error('Release migrations failed.');
  process.exit(error.status || 1);
}
