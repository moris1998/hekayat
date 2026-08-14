#!/usr/bin/env node
/* Creates one entry for the EDIT_USERS environment variable in Netlify.
   The password itself is never stored anywhere, only its scrypt hash.

     node tools/make-user.js sahera@example.com  "her password"  ساهرة
*/
const crypto = require('crypto');
const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.log('\n  usage: node tools/make-user.js <email> "<password>" [display name]\n');
  process.exit(1);
}
const salt = crypto.randomBytes(16).toString('hex');
const digest = crypto.scryptSync(password, salt, 32).toString('hex');

console.log('\n  Add this to EDIT_USERS in Netlify (comma-separate several people):\n');
console.log('  ' + [email.toLowerCase(), salt, digest, name || email].join(':') + '\n');
