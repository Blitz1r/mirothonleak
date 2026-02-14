(async () => {
  const u = "https://miro.com/app/board/uXjVLdP1KCs=/"
  const r = await fetch(u, { redirect: "manual", headers: { "User-Agent": "MiroSecurityPostureAnalyzer/1.0" } })
  const t = await r.text()
  const terms = ["uXjVLdP1KCs", "anonymous", "public", "auth", "guest", "permission", "access"]
  for (const term of terms) {
    const lower = t.toLowerCase()
    const idx = lower.indexOf(term.toLowerCase())
    console.log("---", term, "idx", idx)
    if (idx >= 0) {
      const s = t.slice(Math.max(0, idx - 250), idx + 450).replace(/\s+/g, " ")
      console.log(s)
    }
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
