const axios = require('axios');

// --- Obtener un access_token nuevo ---
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
    console.error('Error al refrescar token:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

// --- Obtener actividades ---
async function getActivities(token) {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${token}` },
      params: { per_page: process.env.NUM_ACTIVITIES || 1 }
    });
    return response.data;
  } catch (err) {
    console.error('Error al obtener actividades:', err.response ? err.response.data : err.message);
  }
}

// --- Actualizar descripción ---
async function updateActivity(token, activityId, newDescription) {
  try {
    await axios.put(`https://www.strava.com/api/v3/activities/${activityId}`, {
      description: newDescription
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Actividad ${activityId} actualizada correctamente.`);
  } catch (err) {
    console.error('Error al actualizar actividad:', err.response ? err.response.data : err.message);
  }
}

// --- Generar descripción ---
function generateDescription(activity) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const pace = activity.moving_time
    ? (activity.moving_time / 60 / (activity.distance / 1000)).toFixed(2)
    : '?';
  const elevation = activity.total_elevation_gain.toFixed(0);

  let desc = `${distanceKm} km 🏃‍♂️ | ${pace} min/km ⚡ | +${elevation} m ⛰️ | ${formatTime(activity.moving_time)} ⏱️`;

  if (activity.pr_count && activity.pr_count > 0) {
    desc += ' | ¡Nuevo récord en 10K! 🥇';
  }

  if (activity.segment_efforts && activity.segment_efforts.length > 0) {
    desc += '\nSegmentos conquistados 👑';
  }

  return desc;
}

// --- Formatear tiempo ---
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
    : `${m}:${s.toString().padStart(2,'0')}`;
}

// --- Main ---
async function main() {
  const token = await getAccessToken();
  const activities = await getActivities(token);
  if (!activities) return;

  for (let act of activities) {
    const newDesc = generateDescription(act);
    await updateActivity(token, act.id, newDesc);
  }
}

main();
