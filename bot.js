const axios = require('axios');

const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH_URL = 'https://www.strava.com/api/v3/oauth/token';
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_MAX_ACTIVITIES_TO_UPDATE = 1;
const DEFAULT_FETCH_LIMIT = 10;
const MAX_FETCH_LIMIT = 200;
const SUPPORTED_SPORT_TYPES = new Set(['Run']);

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getPositiveIntEnv(name, fallbackValue) {
  const rawValue = process.env[name];

  if (rawValue == null || rawValue.trim() === '') {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }

  return parsedValue;
}

function getBooleanEnv(name, fallbackValue) {
  const rawValue = process.env[name];

  if (rawValue == null || rawValue.trim() === '') {
    return fallbackValue;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`Environment variable ${name} must be a boolean value.`);
}

function loadConfig() {
  const maxActivitiesToUpdate = getPositiveIntEnv(
    'NUM_ACTIVITIES',
    DEFAULT_MAX_ACTIVITIES_TO_UPDATE
  );
  const configuredFetchLimit = getPositiveIntEnv(
    'STRAVA_FETCH_LIMIT',
    Math.max(DEFAULT_FETCH_LIMIT, maxActivitiesToUpdate * 5)
  );

  return {
    clientId: getRequiredEnv('STRAVA_CLIENT_ID'),
    clientSecret: getRequiredEnv('STRAVA_CLIENT_SECRET'),
    refreshToken: getRequiredEnv('STRAVA_REFRESH_TOKEN'),
    maxActivitiesToUpdate,
    fetchLimit: Math.min(
      MAX_FETCH_LIMIT,
      Math.max(configuredFetchLimit, maxActivitiesToUpdate)
    ),
    overwriteExisting: getBooleanEnv('STRAVA_OVERWRITE_EXISTING', false)
  };
}

async function getAccessToken(config) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await axios.post(STRAVA_OAUTH_URL, params, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data.access_token;
}

function createStravaClient(accessToken) {
  return axios.create({
    baseURL: STRAVA_API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

async function getRecentActivities(stravaClient, fetchLimit) {
  const response = await stravaClient.get('/athlete/activities', {
    params: { per_page: fetchLimit }
  });

  return response.data;
}

async function getActivityDetail(stravaClient, activityId) {
  const response = await stravaClient.get(`/activities/${activityId}`, {
    params: {
      include_all_efforts: true
    }
  });

  return response.data;
}

async function updateActivityDescription(stravaClient, activityId, description) {
  await stravaClient.put(`/activities/${activityId}`, {
    description
  });
}

function isSupportedActivity(activity) {
  return SUPPORTED_SPORT_TYPES.has(activity?.sport_type ?? activity?.type);
}

function normalizeDescription(description) {
  return (description ?? '').trim();
}

function getActivitySkipReason(activity, overwriteExisting) {
  if (!activity) {
    return 'activity payload is empty';
  }

  if (!isSupportedActivity(activity)) {
    return `unsupported sport type "${activity.sport_type ?? activity.type ?? 'unknown'}"`;
  }

  if (!Number.isFinite(activity.distance) || activity.distance <= 0) {
    return 'distance is empty or zero';
  }

  if (!Number.isFinite(activity.moving_time) || activity.moving_time <= 0) {
    return 'moving time is empty or zero';
  }

  if (!overwriteExisting && normalizeDescription(activity.description) !== '') {
    return 'description already exists';
  }

  return null;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatPace(movingTimeSeconds, distanceMeters) {
  if (!Number.isFinite(movingTimeSeconds) || movingTimeSeconds <= 0) {
    return null;
  }

  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  const secondsPerKilometer = Math.round(movingTimeSeconds / (distanceMeters / 1000));
  const paceMinutes = Math.floor(secondsPerKilometer / 60);
  const paceSeconds = secondsPerKilometer % 60;

  return `${paceMinutes}:${String(paceSeconds).padStart(2, '0')}`;
}

function getPersonalBestSummary(activity) {
  const personalBestEfforts = (activity.best_efforts ?? []).filter(
    (effort) => effort?.pr_rank === 1 && effort?.name
  );

  if (personalBestEfforts.length === 0) {
    return null;
  }

  const effortNames = personalBestEfforts.slice(0, 3).map((effort) => effort.name);

  if (personalBestEfforts.length === 1) {
    return `PR: ${effortNames[0]}`;
  }

  const suffix =
    personalBestEfforts.length > effortNames.length
      ? ` (+${personalBestEfforts.length - effortNames.length} mas)`
      : '';

  return `PRs: ${effortNames.join(', ')}${suffix}`;
}

function generateDescription(activity) {
  const distanceKm = (activity.distance / 1000).toFixed(1);
  const pace = formatPace(activity.moving_time, activity.distance);
  const elevationMeters = Math.round(activity.total_elevation_gain ?? 0);
  const movingTime = formatDuration(activity.moving_time);

  const parts = [
    `${distanceKm} km`,
    pace ? `${pace} min/km` : null,
    `+${elevationMeters} m`,
    movingTime
  ].filter(Boolean);

  const descriptionLines = [parts.join(' | ')];
  const personalBestSummary = getPersonalBestSummary(activity);

  if (personalBestSummary) {
    descriptionLines.push(personalBestSummary);
  }

  return descriptionLines.join('\n');
}

async function main() {
  const config = loadConfig();
  const accessToken = await getAccessToken(config);
  const stravaClient = createStravaClient(accessToken);
  const activities = await getRecentActivities(stravaClient, config.fetchLimit);

  if (!Array.isArray(activities) || activities.length === 0) {
    console.log('No recent activities found.');
    return;
  }

  let updatedActivities = 0;

  for (const activitySummary of activities) {
    if (updatedActivities >= config.maxActivitiesToUpdate) {
      break;
    }

    if (!isSupportedActivity(activitySummary)) {
      console.log(
        `Skipping activity ${activitySummary.id}: unsupported sport type "${activitySummary.sport_type ?? activitySummary.type ?? 'unknown'}".`
      );
      continue;
    }

    const activity = await getActivityDetail(stravaClient, activitySummary.id);
    const skipReason = getActivitySkipReason(activity, config.overwriteExisting);

    if (skipReason) {
      console.log(`Skipping activity ${activity.id}: ${skipReason}.`);
      continue;
    }

    const nextDescription = generateDescription(activity);
    const currentDescription = normalizeDescription(activity.description);

    if (currentDescription === nextDescription) {
      console.log(`Skipping activity ${activity.id}: description is already up to date.`);
      continue;
    }

    await updateActivityDescription(stravaClient, activity.id, nextDescription);
    updatedActivities += 1;
    console.log(`Updated activity ${activity.id}.`);
  }

  if (updatedActivities === 0) {
    console.log('No activities needed updates.');
    return;
  }

  console.log(`Completed successfully. Updated ${updatedActivities} activity(s).`);
}

if (require.main === module) {
  main().catch((error) => {
    const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`Strava bot failed: ${details}`);
    process.exitCode = 1;
  });
}

module.exports = {
  formatDuration,
  formatPace,
  generateDescription,
  getActivitySkipReason,
  isSupportedActivity,
  loadConfig,
  normalizeDescription
};
