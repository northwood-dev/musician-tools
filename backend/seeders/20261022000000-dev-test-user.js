'use strict';

const { Op } = require('sequelize');
const { isLocalHost } = require('../utils/localDatabase');

// Issue #18 — one verified test account for local browser testing, so a test no longer starts
// with /register + flipping email_verified in SQL. DEV ONLY: the credentials are public (they
// are right here and in QUICK_START.md), so this must never reach another database.
//
// Two checks before any write: NODE_ENV, and — like scripts/seed-catalog.js — the host the
// connection actually resolved to, the only one that catches a DATABASE_URL_DEV pointing at a
// remote database.

const TEST_USER_HANDLE = {
  name: 'testuser',
  // Every generator (register, rename, the backfill) draws 0001-9999: 0000 is never taken.
  discriminator: '0000',
};
const TEST_USER_EMAIL = 'test@example.com';
// Fixed, so a rerun recreates the account under the SAME uid. Dev sessions live in the backend's
// memory (MemoryStore, see server.js) and only hold the uid: this process cannot revoke them, and
// with a new uid a browser still signed in would point at a deleted user (reads empty, writes 500).
const TEST_USER_UID = '00000000-0000-4000-8000-000000000018';

function assertDevDatabase(queryInterface) {
  const { env } = require('../config/env');
  if (env !== 'development') {
    throw new Error(`Refusing to seed the test account: NODE_ENV is "${env}", this seeder only runs in development.`);
  }
  const { host } = queryInterface.sequelize.config;
  if (!isLocalHost(host)) {
    throw new Error(`Refusing to seed the test account: the database host "${host}" is not local. Check DATABASE_URL_DEV.`);
  }
}

module.exports = {
  async up(queryInterface) {
    assertDevDatabase(queryInterface);
    // Required after the guard: the models open their own connection from the same config.
    const { User } = require('../models');

    // sequelize-cli does not record seeders here, so `db:seed:all` reruns this every time. Each
    // run deletes the previous account and creates it again: a test may have changed its
    // password or email, or left songs behind, and the next one must start from an empty songlist.
    // Matched by email too: QUICK_START.md used to have people register test@example.com by hand.
    // Its songs, sessions, topics… go with it (every FK to Users is ON DELETE CASCADE).
    await User.destroy({ where: { [Op.or]: [{ email: TEST_USER_EMAIL }, TEST_USER_HANDLE] } });
    // Through the model, not bulkInsert: the password setter is what hashes it.
    await User.create({
      uid: TEST_USER_UID,
      ...TEST_USER_HANDLE,
      email: TEST_USER_EMAIL,
      password: 'password123',
      emailVerified: true,
      isAdmin: false,
      isCurator: false,
    });
  },

  async down(queryInterface) {
    assertDevDatabase(queryInterface);
    const { User } = require('../models');
    await User.destroy({ where: TEST_USER_HANDLE });
  },
};
