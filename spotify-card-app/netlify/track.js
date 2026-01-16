let cachedToken = null;
let cachedTokenExpiryMs = 0;

export async function handler(event) {
  try {
    const id = event.queryStringParameters?.id;
    if (!id) return json(400, { error: "Missing ?id=" });

    const token = await getAccessToken();

    const r = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      const text = await r.text();
      return json(r.status, { error: "Spotify API error", detail: text });
    }

    const data = await r.json();

    const releaseDate = data?.album?.release_date || "";
    const year = releaseDate ? releaseDate.slice(0, 4) : "";

    const cover = (data?.album?.images || [])[0] || null;

    // 回傳前端做圖卡最需要的資料
    return json(200, {
      type: "track",
      id: data.id,
      spotifyUrl: data.external_urls?.spotify || "",
      title: data.name,
      artists: (data.artists || []).map(a => a.name),
      album: {
        id: data.album?.id || "",
        name: data.album?.name || "",
        release_date: releaseDate,
        year,
      },
      cover, // { url, width, height } 可能為 null
    });
  } catch (e) {
    return json(500, { error: "Track failed", detail: String(e) });
  }
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiryMs) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in env vars");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token request failed: ${resp.status} ${text}`);
  }

  const tok = await resp.json();
  cachedToken = tok.access_token;

  // expires_in 是秒；提早 30 秒過期避免邊界問題
  cachedTokenExpiryMs = Date.now() + (tok.expires_in * 1000) - 30_000;

  return cachedToken;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
