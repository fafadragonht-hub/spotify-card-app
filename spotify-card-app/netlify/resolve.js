export async function handler(event) {
  try {
    const url = event.queryStringParameters?.url;
    if (!url) {
      return json(400, { error: "Missing ?url=" });
    }

    const parsed = parseSpotify(url);
    if (!parsed) {
      return json(400, { error: "Unsupported Spotify URL/URI" });
    }

    return json(200, parsed); // { type, id }
  } catch (e) {
    return json(500, { error: "Resolve failed", detail: String(e) });
  }
}

function parseSpotify(input) {
  // 支援：
  // 1) https://open.spotify.com/track/<id>?...
  // 2) spotify:track:<id>
  const s = String(input).trim();

  // spotify URI
  const uriMatch = s.match(/^spotify:(track|album|playlist):([A-Za-z0-9]+)$/);
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };

  // URL
  let u;
  try { u = new URL(s); } catch { return null; }

  if (!/spotify\.com$/.test(u.hostname) && !/open\.spotify\.com$/.test(u.hostname)) {
    return null;
  }

  // pathname: /track/<id>
  const parts = u.pathname.split("/").filter(Boolean);
  const type = parts[0];
  const id = parts[1];
  if (!type || !id) return null;
  if (!["track", "album", "playlist"].includes(type)) return null;

  return { type, id };
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
