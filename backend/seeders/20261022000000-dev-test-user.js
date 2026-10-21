'use strict';

const { Op } = require('sequelize');

// Issue #18 — one verified test account for local browser testing, so a test no longer starts
// with /register + flipping email_verified in SQL. DEV ONLY: the credentials are public (they
// are right here and in QUICK_START.md), so this must never reach another database.
//
// Two checks, like scripts/seed-catalog.js: NODE_ENV, and the host the connection actually
// resolved to — the only one that catches a DATABASE_URL_DEV pointing at a remote database.
// `db` is the docker-compose service name, where `make seed` runs.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', 'db'];

const TEST_USER = {
  name: 'testuser',
  // register draws 0001-9999, so 0000 can never collide with a registered testuser.
  discriminator: '0000',
  email: 'test@example.com',
  password: 'password123',
};

function assertDevDatabase(queryInterface) {
  const { env } = require('../config/env');
  if (env !== 'development') {
    throw new Error(`Refusing to seed the test account: NODE_ENV is "${env}", this seeder only runs in development.`);
  }
  const host = String(queryInterface.sequelize.config.host || '').toLowerCase();
  if (!LOCAL_HOSTS.includes(host)) {
    throw new Error(`Refusing to seed the test account: the database host "${host}" is not local. Check DATABASE_URL_DEV.`);
  }
}

module.exports = {
  async up(queryInterface) {
    assertDevDatabase(queryInterface);
    // Required after the guard: the models open their own connection from the same config.
    const { User } = require('../models');
    const knownState = { ...TEST_USER, emailVerified: true, pendingEmail: null, isAdmin: false, isCurator: false };

    // sequelize-cli does not record seeders here, so `db:seed:all` reruns this every time. A rerun
    // resets the account (a test may have changed its password or email) rather than failing.
    // Matched by email too: QUICK_START.md used to have people register test@example.com by hand.
    const existing = await User.findOne({
      where: { [Op.or]: [{ email: TEST_USER.email }, { name: TEST_USER.name, discriminator: TEST_USER.discriminator }] },
    });
    if (existing) {
      // Through the model, not bulkUpdate: the password setter is what hashes it.
      await existing.update(knownState);
    } else {
      await User.create(knownState);
    }
  },

  async down(queryInterface) {
    assertDevDatabase(queryInterface);
    const { User } = require('../models');
    // Its songs, sessions, topics… go with it (every FK to Users is ON DELETE CASCADE).
    await User.destroy({ where: { name: TEST_USER.name, discriminator: TEST_USER.discriminator } });
  },
};
