const { execSync } = require('child_process');

// Environment variables to set
const envVars = {
  'NEXTAUTH_URL': 'https://desktrade-o078muqgl-smits-versel.vercel.app',
  'NEXTAUTH_SECRET': 'smitcode-secret-2024'
};

console.log('Setting up environment variables in Vercel...');

Object.entries(envVars).forEach(([key, value]) => {
  try {
    console.log(`Adding ${key}...`);
    execSync(`npx vercel env add ${key} production`, {
      input: `${value}\n`,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`✓ ${key} added successfully`);
  } catch (error) {
    console.error(`✗ Failed to add ${key}:`, error.message);
  }
});

console.log('\nEnvironment variables setup complete!');
console.log('Please also ensure DATABASE_URL is set in Vercel dashboard.');