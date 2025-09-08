const axios = require('axios');

// Pega tu access token aquí
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // reemplaza con tu token

// Función para obtener tus últimas actividades
async function getActivities() {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${STRAVA_ACCESS_TOKEN}` },
      params: { per_page: 1 } // traer las 5 últimas actividades
    });
    return response.data;
  } catch (err) {
    console.error('Error al obtener actividades:', err.response.data);
  }
}

// Función para editar la descripción de una actividad
async function updateActivity(activityId, newDescription) {
  try {
    await axios.put(`https://www.strava.com/api/v3/activities/${activityId}`, {
      description: newDescription
    }, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    });
    console.log(`Actividad ${activityId} actualizada correctamente.`);
  } catch (err) {
    console.error('Error al actualizar actividad:', err.response.data);
  }
}

// Función para generar la descripción con emojis
function generateDescription(activity) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const pace = activity.moving_time ? (activity.moving_time / (activity.distance / 1000) / 60).toFixed(2) : '?';
  const elevation = activity.total_elevation_gain.toFixed(0);

  // Formato principal
  let desc = `${distanceKm} km 🏃‍♂️ | ${pace} min/km ⚡ | +${elevation} m ⛰️ | ${formatTime(activity.moving_time)} ⏱️`;

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

// Función para formatear tiempo en hh:mm:ss o mm:ss
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
    : `${m}:${s.toString().padStart(2,'0')}`;
}

// Función principal
async function main() {
  const activities = await getActivities();
  if (!activities) return;

  for (let act of activities) {
    const newDesc = generateDescription(act);
    await updateActivity(act.id, newDesc);
  }
}

main();
