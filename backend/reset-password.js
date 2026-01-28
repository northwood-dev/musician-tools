#!/usr/bin/env node

const bcryptjs = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function main() {
  try {
    console.log('🔐 Password Hash Generator\n');

    const email = await question('Enter user email: ');
    const newPassword = await question('Enter new password: ');
    const confirmPassword = await question('Confirm new password: ');

    if (newPassword !== confirmPassword) {
      console.error('❌ Passwords do not match!');
      process.exit(1);
    }

    if (newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters long!');
      process.exit(1);
    }

    // Hash the password
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(newPassword, salt);

    console.log('\n✅ Password hash generated!\n');
    console.log('📧 Email: ' + email);
    console.log('🔑 Password hash:\n');
    console.log(hashedPassword);
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SQL to copy-paste in your production database:\n');
    console.log(`UPDATE "Users" SET "password" = '${hashedPassword}' WHERE "email" = '${email}';`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
