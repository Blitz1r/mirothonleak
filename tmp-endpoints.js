(async () => {
  const id = "uXjVLdP1KCs="
  const base = "https://miro.com"
  const paths = [
    `/api/v1/boards/${id}`,
    `/api/v1/boards/${id}/`,
    `/api/v2/boards/${id}`,
    `/api/v2/boards/${id}/`,
    `/api/v1/board/${id}`,
    `/api/v1/boards/${id}/access`,
    `/api/v1/boards/${id}/permissions`,
    `/api/v1/boards/${id}/picture`,
    `/api/v1/boards/${id}/picture?size=180`,
    `/api/v1/boards/${id}/export`
  ]

  for (const path of paths) {
    const url = `${base}${path}`
    try {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": "MiroSecurityPostureAnalyzer/1.0" } })
      console.log(r.status, path, r.headers.get("content-type") || "")
    } catch (e) {
      console.log("ERR", path, e?.message || String(e))
    }
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
