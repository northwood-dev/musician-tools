const { PracticeSession, sequelize } = require('../models');

// One session per user, day and instrument (issue #5, unique index
// practice_sessions_user_date_instrument_unique). Finds that session, or
// creates it. Two requests racing on the same day/instrument (double click,
// two devices) both miss the lookup; the loser's insert hits the unique index.
// The insert runs in a SAVEPOINT so that failure does not abort the caller's
// transaction, and the loser then reads the winner's row and merges into it.
// Returns [session, created].
async function findOrCreateDaySession({ userUid, date, instrumentType, note = null }, transaction) {
  const where = { userUid, date, instrumentType };
  const existing = await PracticeSession.findOne({ where, transaction });
  if (existing) return [existing, false];
  try {
    const created = await sequelize.transaction({ transaction }, savepoint =>
      PracticeSession.create({ ...where, note }, { transaction: savepoint }));
    return [created, true];
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    return [await PracticeSession.findOne({ where, transaction }), false];
  }
}

module.exports = { findOrCreateDaySession };
