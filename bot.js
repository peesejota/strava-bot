const axios = require('axios');

// Leer token y número de actividades desde variables de entorno
const ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;
const NUM_ACTIVITIES = process.env.NUM_ACTIVITIES ? parseInt(process.env.NUM_ACTIVITIES) : 1;

if (!ACCESS_TOKEN) {
  console.error('Error: STRAVA_ACCESS_TOKEN is not defined');
  process.exit(1);
}

// Función para obtener tus últimas actividades
async function getActivities() {
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      params: { per_page: NUM_ACTIVITIES }
    });
    return response.data;
  } catch (err) {
    if (err.response && err.response.data) {
      console.error('Error al obtener actividades:', err.response.data);
    } else {
      console.error('Error al obtener actividades:', err.message);
    }
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
    if (err.response && err.response.data) {
      console.error('Error al actualizar actividad:', err.response.data);
    } else {
      console.error('Error al actualizar actividad:', err.message);
    }
  }
}

// Función para convertir ritmo decimal a mm:ss
function paceToString(paceDecimal) {
  const minutes = Math.floor(paceDecimal);
  const seconds = Math.round((paceDecimal - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2,'0')}`;
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

// Función para generar la descripción con emojis y PRs
function generateDescription(activity) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const paceDecimal = activity.moving_time ? (activity.moving_time / (activity.distance / 1000) / 60) : 0;
  const pace = paceDecimal ? paceToString(paceDecimal) : '?';
  const elevation = activity.total_elevation_gain.toFixed(0);

  // Formato principal
  let desc = `${distanceKm} km 🏃‍♂️ | ${pace} min/km ⚡ | +${elevation} m ⛰️ | ${formatTime(activity.moving_time)} ⏱️`;

  // PR general de la actividad
  if (activity.personal_record) {
    const prDistanceKm = (activity.distance / 1000).toFixed(1);
    desc += ` | ¡Nuevo récord en ${prDistanceKm} km! 🥇`;
  }

  // Segmentos conquistados con PR
  if (activity.segment_efforts && activity.segment_efforts.length > 0) {
    const prSegments = activity.segment_efforts.filter(seg => seg.personal_record);
    if (prSegments.length > 0) {
      desc += '\nSegmentos conquistados 👑';
      prSegments.forEach(seg => {
        desc += `\n- ${seg.name}: ${formatTime(seg.elapsed_time)} ⏱️`;
      });
    }
  }

  return desc;
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
