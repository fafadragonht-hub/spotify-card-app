export async function handler(event) {
  try {
    const url = event.queryStringParameters?.url;
    if (!url) return json(400, { error: "Missing ?url=" });

    // 直接用 Spotify 官方 oEmbed
    const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;

    const r = await fetch(endpoint, {
      headers: {
        // 有時候加 Accept 會更穩
        "Accept": "application/json",
      },
      redirect: "follow",
    });

    if (!r.ok) {
      const text = await r.text();
      return json(r.status, { error: "Spotify oEmbed error", detail: text });
    }

    const data = await r.json();

    // 注意：oEmbed 通常冇 year/release date
    return json(200, {
      provider_name: data.provider_name,
      provider_url: data.provider_url,
      title: data.title,                 // 常見格式：歌名、或 "Song • Artist"
      author_name: data.author_name,     // 多數係 artist name
      author_url: data.author_url,
      thumbnail_url: data.thumbnail_url, // 封面圖（可用作抽色/顯示）
      thumbnail_width: data.thumbnail_width,
      thumbnail_height: data.thumbnail_height,
      html: data.html,                   // 官方 embed iframe html
      width: data.width,
      height: data.height,
      type: data.type,
      version: data.version,
      // 方便前端：把原始 query url 也回傳
      requested_url: url,
    });
  } catch (e) {
    return json(500, { error: "oEmbed failed", detail: String(e) });
  }
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
