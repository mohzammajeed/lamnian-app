// Vercel serverless function: keeps the Open-Meteo API key private.
// Env var (Vercel → Settings → Environment Variables): OPEN_METEO_API_KEY
// Without the key it uses Open-Meteo's free endpoints.
const FORECAST = 'current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl,is_day&hourly=temperature_2m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7';
const AIR = 'current=us_aqi,pm2_5,pm10';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // lets the Android app call this endpoint
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  const key = process.env.OPEN_METEO_API_KEY;
  const air = req.query.type === 'air';
  const host = air
    ? (key ? 'https://customer-air-quality-api.open-meteo.com' : 'https://air-quality-api.open-meteo.com')
    : (key ? 'https://customer-api.open-meteo.com' : 'https://api.open-meteo.com');
  const path = air ? '/v1/air-quality' : '/v1/forecast';
  const url = `${host}${path}?latitude=${lat}&longitude=${lon}&${air ? AIR : FORECAST}${key ? '&apikey=' + encodeURIComponent(key) : ''}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'Weather service error' });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(502).json({ error: 'Weather service unreachable' });
  }
};
