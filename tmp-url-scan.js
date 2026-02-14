(async()=>{
 const u='https://miro.com/app/board/uXjVLdP1KCs=/'
 const r=await fetch(u,{redirect:'manual',headers:{'User-Agent':'MiroSecurityPostureAnalyzer/1.0'}})
 const t=await r.text()
 const urls=[...t.matchAll(/https?:\\u002F\\u002F[^\"'\\s<]+/g)].map(m=>m[0].replace(/\\u002F/g,'/'))
 const api=Array.from(new Set(urls.filter(x=>x.includes('/api/'))))
 console.log('api urls',api.length)
 console.log(api.slice(0,80).join('\n'))
 const rel=[...t.matchAll(/\/(?:api|app)\/[a-zA-Z0-9_\-\/=?.&%]+/g)].map(m=>m[0])
 const uniq=Array.from(new Set(rel.filter(x=>x.includes('board')||x.includes('permission')||x.includes('access')||x.includes('share')||x.includes('live'))))
 console.log('rel urls',uniq.length)
 console.log(uniq.slice(0,120).join('\n'))
})().catch(e=>{console.error(e);process.exit(1)})
