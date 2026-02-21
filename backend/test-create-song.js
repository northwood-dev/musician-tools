const axios = require('axios');

async function testCreateSong() {
  try {
    // First, login
    const loginResponse = await axios.post('http://localhost:3001/api/login', {
      email: 'test@example.com',
      password: 'testpassword'
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Login response:', loginResponse.status);
    const cookies = loginResponse.headers['set-cookie'];

    // Then create a song
    const songData = {
      title: 'Test Song Language',
      artist: 'Test Artist',
      language: ['French', 'English'],
      genre: ['Rock'],
      instrument: ['Guitar'],
      bpm: 120,
      key: 'C',
      notes: 'Test notes'
    };

    const createResponse = await axios.post('http://localhost:3001/api/songs', songData, {
      withCredentials: true,
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    console.log('Create song success:', createResponse.status);
    console.log('Song data:', JSON.stringify(createResponse.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testCreateSong();
