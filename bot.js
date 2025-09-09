const axios = require('axios');

// --- Función para refrescar el access_token ---
async function getAccessToken() {
  try {
    const response = await axios.post('https://www.strava.com/api/v3/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    });
    return response.data.access_token;
  } catch (err) {
    console.error('Error al refrescar token:', err.response?.data || err.message);
    process.exit(1);
  }
}

// --- Función para obtener actividades ---
async function getActivities(accessToken) {
  try {
    const response = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: 10 } //Número de actividades que se actualizan
      }
    );
    return response.data;
  } catch (err) {
    console.error('Error al obtener actividades:', err.response?.data || err.message);
  }
}

// --- Función para actualizar una actividad ---
async function updateActivity(accessToken, activityId, newDescription) {
  try {
    await axios.put(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      { description: newDescription },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log(`Actividad ${activityId} actualizada correctamente.`);
  } catch (err) {
    console.error('Error al actualizar actividad:', err.response?.data || err.message);
  }
}

// --- Función para generar la descripción ---
function generateDescription(activity) {
  const distanceKm = (activity.distance / 1000).toFixed(1);

  // cálculo ritmo (pace)
  const paceMinutes = activity.moving_time / 60 / (activity.distance / 1000);
  const paceMin = Math.floor(paceMinutes);
  const paceSec = Math.round((paceMinutes - paceMin) * 60)
    .toString()
    .padStart(2, '0');
  const paceFormatted = `${paceMin}:${paceSec}`;

  const elevation = activity.total_elevation_gain.toFixed(0);

  // Formato principal
  let desc = `${distanceKm} km 🏃‍♂️ | ${paceFormatted} min/km ⚡ | +${elevation} m ⛰️ | ${formatTime(activity.moving_time)} ⏱️`;

  // PR general
  if (activity.personal_record) {
    desc += ' | ¡Nuevo récord en 10K! 🥇';
  }

  // Segmentos conquistados
  if (activity.segment_efforts && activity.segment_efforts.length > 0) {
    desc += '\nSegmentos conquistados 👑';
  }

  return desc;
}

// --- Formatear tiempo total ---
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Función principal ---
async function main() {
  const accessToken = await getAccessToken();
  const activities = await getActivities(accessToken);
  if (!activities) return;

  for (let act of activities) {
    const newDesc = generateDescription(act);
    await updateActivity(accessToken, act.id, newDesc);
  }
}

main();
