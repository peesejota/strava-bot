# Strava Bot

Bot sencillo en Node.js para actualizar automaticamente la descripcion de actividades en Strava.

Ahora mismo el bot:

- Solo modifica actividades con `sport_type = Run`.
- Ignora caminatas, gym y cualquier otra actividad.
- Sobrescribe la descripcion existente, por ejemplo la que venga de COROS.
- Revisa las `3` actividades más recientes y actualiza como maximo `1` por ejecución.
- Evita escribir si la descripcion generada ya coincide con la actual.

## Formato de la descripcion

Para una actividad `Run`, el bot genera una descripción con este formato:

```text
10.0 km | 5:02 min/km | +84 m | 50:12
PR: 10k
```

La segunda línea solo aparece si Strava devuelve esfuerzos con `pr_rank = 1`.

## Como funciona

En cada ejecucion el bot hace este flujo:

1. Refresca el `access_token` usando `client_id`, `client_secret` y `refresh_token`.
2. Consulta las actividades recientes del atleta.
3. Recorre las más recientes hasta encontrar una `Run` valida.
4. Pide el detalle de esa actividad.
5. Genera una nueva descripción.
6. Actualiza la actividad en Strava si hace falta.

## Variables de entorno

Estas variables son obligatorias:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`

Estas variables son opcionales:

- `NUM_ACTIVITIES`: cuantas actividades actualizar como maximo por ejecucion. Por defecto `1`.
- `STRAVA_FETCH_LIMIT`: cuantas actividades recientes revisar. Por defecto se calcula automaticamente.
- `STRAVA_OVERWRITE_EXISTING`: si vale `true`, sobrescribe una descripcion ya existente.

## Uso en GitHub Actions

El workflow esta en [.github/workflows/cron.yml](.github/workflows/cron.yml).

Configuracion actual:

- Se ejecuta cada 5 minutos.
- Tambien se puede lanzar manualmente con `workflow_dispatch`.
- Usa Node.js `22`.
- Instala dependencias con `npm ci`.
- Revisa `3` actividades recientes.
- Actualiza como maximo `1` actividad por ejecucion.
- Sobrescribe la descripcion existente.

Secrets necesarios en GitHub:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`

## Uso en local

1. Instala dependencias:

```bash
npm install
```

2. Define variables de entorno.

En PowerShell:

```powershell
$env:STRAVA_CLIENT_ID="tu_client_id"
$env:STRAVA_CLIENT_SECRET="tu_client_secret"
$env:STRAVA_REFRESH_TOKEN="tu_refresh_token"
$env:NUM_ACTIVITIES="1"
$env:STRAVA_FETCH_LIMIT="3"
$env:STRAVA_OVERWRITE_EXISTING="true"
```

3. Ejecuta el bot:

```bash
npm start
```

## Scripts disponibles

- `npm start`: ejecuta el bot.
- `npm test`: valida la sintaxis de `bot.js`.

## Estructura del proyecto

```text
.
├─ .github/
│  └─ workflows/
│     └─ cron.yml
├─ bot.js
├─ package.json
└─ README.md
```

## Limitaciones actuales

- Solo soporta `Run`.
- No usa webhooks; funciona por cron.
- Para obtener PRs necesita pedir el detalle de la actividad a Strava.
- No genera descripciones para `Walk`, `Hike`, `WeightTraining` u otros tipos.

## Nota

Este proyecto usa la API de Strava, asi que necesitas tener una app creada en Strava y los permisos adecuados para leer y editar tus actividades.
