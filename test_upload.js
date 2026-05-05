const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  // Try to login to get token
  const loginRes = await fetch('http://localhost:8003/api/v1/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@dravanua.com', password: 'password123' })
  });
  
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.log("Login failed", loginData);
    return;
  }
  
  const token = loginData.token;
  
  // Create a dummy image file
  fs.writeFileSync('dummy.jpg', 'fake image content');
  
  const form = new FormData();
  form.append('image', fs.createReadStream('dummy.jpg'));
  
  const uploadRes = await fetch('http://localhost:8003/api/v1/admin/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });
  
  const text = await uploadRes.text();
  console.log("Upload Status:", uploadRes.status);
  console.log("Upload Response:", text);
}

testUpload();
