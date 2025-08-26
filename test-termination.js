const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testTermination() {
  try {
    console.log('🧪 Testing bot termination endpoints...\n');

    // Test status endpoint
    console.log('1. Checking bot status...');
    const statusResponse = await axios.get(`${BASE_URL}/status`);
    console.log('✅ Status:', statusResponse.data);
    console.log('');

    // Test Telegram notification
    console.log('2. Testing Telegram notification...');
    const telegramResponse = await axios.post(`${BASE_URL}/testTelegram`);
    console.log('✅ Telegram test:', telegramResponse.data);
    console.log('');

    // Test termination
    console.log('3. Testing bot termination...');
    const terminateResponse = await axios.post(`${BASE_URL}/terminate`);
    console.log('✅ Termination response:', terminateResponse.data);
    console.log('');

    // Check status after termination
    console.log('4. Checking status after termination...');
    const statusAfterResponse = await axios.get(`${BASE_URL}/status`);
    console.log('✅ Status after termination:', statusAfterResponse.data);
    console.log('');

    // Test restart
    console.log('5. Testing bot restart...');
    const restartResponse = await axios.post(`${BASE_URL}/restart`);
    console.log('✅ Restart response:', restartResponse.data);
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testTermination();
