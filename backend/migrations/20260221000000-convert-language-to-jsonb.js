'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Convert the column type from VARCHAR to JSONB
    // Wrap existing string values in arrays, handle NULLs and empty strings
    await queryInterface.sequelize.query(`
      ALTER TABLE "Songs" 
      ALTER COLUMN language TYPE jsonb 
      USING CASE 
        WHEN language IS NULL OR language = '' THEN NULL
        ELSE to_jsonb(ARRAY[language]::text[])
      END;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Convert JSONB arrays back to strings (first element only)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Songs" 
      ALTER COLUMN language TYPE varchar 
      USING CASE 
        WHEN language IS NULL THEN NULL
        WHEN jsonb_typeof(language) = 'array' AND jsonb_array_length(language) > 0 
          THEN language->>0
        ELSE NULL
      END;
    `);
  }
};
