export async function handler(event) {
  try {
    const url = event.queryStringParameters?.url;
    if (!url) return json(400, { error: "Missing ?url=" });

    const parsed = parseSpotify(url);
    if (!parsed) return json(400, { error: "Unsupported Spotify URL/URI" });

    return json(200, parsed); // { type, id, canonicalUrl }
  } catch (e) {
    return json(500, { error: "Resolve failed", detail: String(e) });
  }
}

function parseSpotify(input) {
  const s = String(input).trim();

  // spotify URI: spotify:track:<id>
  const uriMatch = s.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]+)$/);
  if (uriMatch) {
    const type = uriMatch[1];
    const id = uriMatch[2];
    return { type, id, canonicalUrl: `https://open.spotify.com/${type}/${id}` };
  }

  // URL: https://open.spotify.com/track/<id>...
  let u;
  try { u = new URL(s); } catch { return null; }

  // 支援 open.spotify.com 同 spotify.link（短鏈）
  const host = u.hostname.replace(/^www\./, "");
  if (host !== "open.spotify.com" && host !== "spotify.link") return null;

  const parts = u.pathname.split("/").filter(Boolean);
  const type = parts[0];
  const id = parts[1];
  if (!type || !id) return null;

  // oEmbed 支援：show/episode/artist/album/track（playlist 視乎情況）
  const allowed = ["track", "album", "artist", "episode", "show", "playlist"];
  if (!allowed.includes(type)) return null;

  return { type, id, canonicalUrl: `https://open.spotify.com/${type}/${id}` };
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
