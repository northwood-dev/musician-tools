'use strict';

// The one definition of « this database is on my machine », shared by the scripts that refuse to
// write anywhere else (scripts/seed-catalog.js, the dev test-user seeder). Keyed on the host the
// connection actually resolved to: only that catches a DATABASE_URL_* pointing at a remote base.
// '' is a unix socket; `db` is the docker-compose service, where `make seed` runs.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '', 'db'];

function isLocalHost(host) {
  return LOCAL_HOSTS.includes(String(host || '').toLowerCase());
}

module.exports = { isLocalHost };
