(async () => {
  const u = "https://miro.com/app/board/uXjVLdP1KCs=/"
  const r = await fetch(u, { redirect: "manual", headers: { "User-Agent": "MiroSecurityPostureAnalyzer/1.0" } })
  const t = await r.text()
  const patterns = ["uXjVLdP1KCs", "board", "access", "anonymous", "public", "auth", "password", "share", "bootstrap", "initial", "state", "window.__", "preloaded", "viewer"]
  for (const p of patterns) {
    const re = new RegExp(p, "ig")
    const m = t.match(re)
    console.log(p, m ? m.length : 0)
  }
  const scriptSrc = [...t.matchAll(/<script[^>]*src=\"([^\"]+)\"/g)].map((m) => m[1])
  console.log("script count", scriptSrc.length)
  console.log(scriptSrc.slice(0, 20).join("\n"))
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
