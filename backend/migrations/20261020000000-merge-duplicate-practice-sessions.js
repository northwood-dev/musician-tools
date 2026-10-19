'use strict';

// Issue #5: a practice session is "one day, one instrument". The manual form used
// to create a new session on every log, so a day of bass could hold several Bass
// sessions. This migration folds every group of sessions sharing (user, date,
// instrument) into its OLDEST session, with the same merge rules as the app
// (utils/sessionMerge: same song/topic or same orphan label -> one entry, minutes
// summed, notes joined oldest first), then enforces the rule with a unique index.
//
// Plays: SongPlays cascade on SessionItem deletion, so the plays of every folded
// entry are re-attached to its surviving entry BEFORE that entry is deleted. The
// sessions of a group share day and instrument, so the plays need nothing else.
//
// Irreversible: down() only drops the index — merged sessions cannot be split
// back (nothing records which entry came from which session). Validate on a
// fresh production dump, and back up production right before deploying.
const { mergeSessions } = require('../utils/sessionMerge');

const INDEX_NAME = 'practice_sessions_user_date_instrument_unique';

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const select = (sql, replacements) =>
        sequelize.query(sql, { replacements, transaction, type: sequelize.QueryTypes.SELECT });
      const run = (sql, replacements) => sequelize.query(sql, { replacements, transaction });

      const groups = await select(`
        SELECT user_uid, date, instrument_type
        FROM "PracticeSessions"
        GROUP BY user_uid, date, instrument_type
        HAVING COUNT(*) > 1
      `);

      for (const group of groups) {
        const sessions = await select(`
          SELECT uid, note, "createdAt"
          FROM "PracticeSessions"
          WHERE user_uid = :user_uid AND date = :date AND instrument_type = :instrument_type
          ORDER BY "createdAt" ASC, uid ASC
        `, group);
        const sessionUids = sessions.map(session => session.uid);
        const items = await select(`
          SELECT uid, session_uid AS "sessionUid", song_uid AS "songUid", topic_uid AS "topicUid",
                 label, minutes, note, position
          FROM "SessionItems"
          WHERE session_uid IN (:sessionUids)
        `, { sessionUids });
        for (const session of sessions) {
          session.items = items.filter(item => item.sessionUid === session.uid);
        }

        const [survivor, ...folded] = sessions;
        const mergeResult = mergeSessions(sessions);

        for (const removedUid of mergeResult.removedUids) {
          await run('UPDATE "SongPlays" SET "sessionItemUid" = :to WHERE "sessionItemUid" = :from',
            { to: mergeResult.playRemap[removedUid], from: removedUid });
        }
        if (mergeResult.removedUids.length > 0) {
          await run('DELETE FROM "SessionItems" WHERE uid IN (:uids)', { uids: mergeResult.removedUids });
        }
        for (const entry of mergeResult.entries) {
          await run(`
            UPDATE "SessionItems"
            SET session_uid = :sessionUid, minutes = :minutes, note = :note, position = :position, "updatedAt" = NOW()
            WHERE uid = :uid
          `, { sessionUid: survivor.uid, minutes: entry.minutes, note: entry.note, position: entry.position, uid: entry.uid });
        }
        await run('UPDATE "PracticeSessions" SET note = :note, "updatedAt" = NOW() WHERE uid = :uid',
          { note: mergeResult.note, uid: survivor.uid });
        // Every entry now belongs to the survivor: the folded sessions are empty
        await run('DELETE FROM "PracticeSessions" WHERE uid IN (:uids)', { uids: folded.map(session => session.uid) });
      }

      // Guarded: sequelize.sync() may already have created it from the model's `indexes`
      const indexes = await queryInterface.showIndex('PracticeSessions', { transaction });
      if (!indexes.some(index => index.name === INDEX_NAME)) {
        await queryInterface.addIndex('PracticeSessions', ['user_uid', 'date', 'instrument_type'], {
          unique: true,
          name: INDEX_NAME,
          transaction,
        });
      }
    });
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('PracticeSessions');
    if (indexes.some(index => index.name === INDEX_NAME)) {
      await queryInterface.removeIndex('PracticeSessions', INDEX_NAME);
    }
  },
};
