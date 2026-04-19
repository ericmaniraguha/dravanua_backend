const axios = require('axios');

async function testRoutes() {
  const port = process.env.DRAVANUA_PORT || 8003;
  const base = `http://localhost:${port}/api/v1/admin`;
  try {
    const res = await axios.get(`http://localhost:${port}/`);
    console.log('Health Check:', res.data);
    
    try {
      const bRes = await axios.get(`${base}/bookings`);
      console.log('Bookings:', bRes.status);
    } catch (e) {
      console.log('Bookings Failed:', e.response ? e.response.status : e.message);
      if (e.response && e.response.data) console.log('Data:', e.response.data);
    }
  } catch (e) {
    console.log('Server unreachable:', e.message);
  }
}

testRoutes();
