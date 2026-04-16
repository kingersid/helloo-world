const axios = require('axios');
const { spawn } = require('child_process');

async function testServer() {
  const port = 3002;
  const server = spawn('node', ['server.js'], { env: { ...process.env, PORT: port } });
  
  await new Promise(res => setTimeout(res, 3000));
  
  try {
    const res = await axios.get(`http://localhost:${port}/api/dashboard`);
    console.log(JSON.stringify(res.data.summary, null, 2));
  } catch (err) {
    console.error(err.message);
  } finally {
    server.kill();
  }
}

testServer();
