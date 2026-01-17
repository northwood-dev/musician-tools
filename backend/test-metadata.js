const { fetchSongMetadata } = require('./services/songMetadataService');

(async () => {
  console.log('Testing fetchSongMetadata...');
  const result = await fetchSongMetadata({
    title: 'Killing in the Name',
    artist: 'Rage Against The Machine'
  });
  console.log('\nFinal result:', JSON.stringify(result, null, 2));
})();
