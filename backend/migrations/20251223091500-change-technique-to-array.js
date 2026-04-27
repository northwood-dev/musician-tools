"use strict";

/**
 * Convert Songs.technique from STRING to JSON array of strings.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Songs');

    // If technique_tmp exists, the migration was interrupted — finish it
    if (tableDescription.technique_tmp) {
      if (tableDescription.technique) {
        await queryInterface.removeColumn("Songs", "technique");
      }
      await queryInterface.renameColumn("Songs", "technique_tmp", "technique");
      return;
    }

    // If technique is already JSON/JSONB, migration is already done
    if (!tableDescription.technique || tableDescription.technique.type === 'JSON' || tableDescription.technique.type === 'JSONB') {
      return;
    }

    // Add a temporary JSON column
    await queryInterface.addColumn("Songs", "technique_tmp", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
    });

    // Copy data: wrap non-null string values into an array
    await queryInterface.sequelize.query(`
      UPDATE "Songs"
      SET "technique_tmp" = CASE
        WHEN "technique" IS NULL THEN NULL
        WHEN "technique" = '' THEN NULL
        ELSE json_build_array("technique")
      END;
    `);

    // Remove old column and rename tmp to technique
    await queryInterface.removeColumn("Songs", "technique");
    await queryInterface.renameColumn("Songs", "technique_tmp", "technique");
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to STRING
    await queryInterface.addColumn("Songs", "technique_tmp", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE "Songs"
      SET "technique_tmp" = CASE
        WHEN "technique" IS NULL THEN NULL
        ELSE (
          SELECT COALESCE((technique::json ->> 0), NULL)
        )
      END;
    `);

    await queryInterface.removeColumn("Songs", "technique");
    await queryInterface.renameColumn("Songs", "technique_tmp", "technique");
  },
};