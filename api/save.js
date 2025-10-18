// api/save.js
module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")  return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: "content is required" });

    const owner  = process.env.GH_OWNER;   // 例: "kuribay14-web"
    const repo   = process.env.GH_REPO;    // 例: "Tango_apps2"
    const branch = process.env.GH_BRANCH || "main";
    const path   = process.env.FILE_PATH || "data.json";
    const token  = process.env.GH_TOKEN;   // Fine-grained PAT（Contents: Read/Write）

    // 既存 data.json の sha を取得
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
    const getResp = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
    });

    let sha;
    if (getResp.status === 200) {
      const j = await getResp.json();
      sha = j.sha;
    } else if (getResp.status !== 404) {
      return res.status(500).json({ error: "GET contents failed", detail: await getResp.text() });
    }

    // PUT（新規 or 更新）
    const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");
    const body = {
      message: `chore: update ${path} via Vercel API`,
      content: encoded,
      branch,
      sha // 既存が無ければ undefined のままでOK
    };

    const putResp = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!putResp.ok) {
      return res.status(500).json({ error: "PUT failed", detail: await putResp.text() });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
