const { fetchSongMetadata } = require('./backend/services/songMetadataService');
const logger = require('./backend/logger');

(async () => {
  try {
    console.log('Testing: Rage Against the Machine / Killing in the Name');
    const result = await fetchSongMetadata({
      title: 'Killing in the Name',
      artist: 'Rage Against the Machine'
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
})();
