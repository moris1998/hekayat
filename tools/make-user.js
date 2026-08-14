#!/usr/bin/env node
/* Creates one entry for the EDIT_USERS environment variable in Netlify.

   Google sign-in only (no password to remember):
     node tools/make-user.js --google sahera@gmail.com ساهرة

   With a password as well:
     node tools/make-user.js sahera@gmail.com "her password" ساهرة

   The password itself is never stored, only its scrypt hash.
*/
const crypto = require('crypto');
const args = process.argv.slice(2);

if (args[0] === '--google') {
  const [, email, name] = args;
  if (!email) { console.log('\n  usage: node tools/make-user.js --google <email> [name]\n'); process.exit(1); }
  console.log('\n  Add this to EDIT_USERS in Netlify (comma-separate several people):\n');
  console.log('  ' + [email.toLowerCase(), '', '', name || email].join(':') + '\n');
  console.log('  She signs in with the Google button. No password.\n');
  process.exit(0);
}

const [email, password, name] = args;
if (!email || !password) {
  console.log('\n  usage: node tools/make-user.js <email> "<password>" [name]');
  console.log('     or: node tools/make-user.js --google <email> [name]\n');
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString('hex');
const digest = crypto.scryptSync(password, salt, 32).toString('hex');
console.log('\n  Add this to EDIT_USERS in Netlify (comma-separate several people):\n');
console.log('  ' + [email.toLowerCase(), salt, digest, name || email].join(':') + '\n');
