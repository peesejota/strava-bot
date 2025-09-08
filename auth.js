const express = require('express');
const open = require('open');
const axios = require('axios');

const CLIENT_ID = '175475'; // reemplaza con tu Client ID
const CLIENT_SECRET = 'b99b447cd6b77933e3f10ab19a523c6fec57331a'; // reemplaza con tu Client Secret
const PORT = 3000;

const app = express();

app.get('/exchange_token', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code provided');

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code'
      }
    });

    const data = response.data;
    console.log('ACCESS TOKEN:', data.access_token);
    res.send('Autenticación completada. Revisa la consola de Node.js.');
  } catch (err) {
    console.error(err.response.data);
    res.send('Error al intercambiar token');
  }
});

app.listen(PORT, () => {
  console.log(`Abre este enlace en tu navegador para autorizar el bot:`);
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=http://localhost:${PORT}/exchange_token&approval_prompt=auto&scope=activity:read_all,activity:write`;
  console.log(authUrl);
  const { exec } = require('node:child_process');
exec(`start "" "${authUrl}"`);

});
