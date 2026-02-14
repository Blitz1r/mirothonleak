import { classifyProbeStatus, createId, nowIso, parseMiroBoardId } from "@/lib/server/utils"
import type { ProbeResult } from "@/lib/server/types"

async function probeBoardApiStatus(boardId: string, signal: AbortSignal): Promise<number | null> {
  try {
    const apiResponse = await fetch(`https://miro.com/api/v1/boards/${encodeURIComponent(boardId)}`,
      {
        method: "GET",
        redirect: "manual",
        signal,
        cache: "no-store",
        headers: {
          "User-Agent": "MiroSecurityPostureAnalyzer/1.0",
          Accept: "application/json",
        },
      })

    return apiResponse.status
  } catch {
    return null
  }
}

async function probeSingleUrl(url: string, sessionId: string): Promise<ProbeResult> {
  const boardId = parseMiroBoardId(url) ?? "invalid"

  if (!parseMiroBoardId(url)) {
    return {
      id: createId("probe"),
      sessionId,
      boardUrl: url,
      boardId,
      status: "unreachable",
      httpCode: 404,
      checkedAt: nowIso(),
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "MiroSecurityPostureAnalyzer/1.0",
      },
    })

    const location = response.headers.get("location") ?? undefined
    let effectiveHttpCode = response.status

    if (response.status === 200) {
      const apiStatus = await probeBoardApiStatus(boardId, controller.signal)
      if (apiStatus === 200 || apiStatus === 401 || apiStatus === 403) {
        effectiveHttpCode = apiStatus
      }
    }

    return {
      id: createId("probe"),
      sessionId,
      boardUrl: url,
      boardId,
      status: classifyProbeStatus(effectiveHttpCode, location),
      httpCode: effectiveHttpCode,
      checkedAt: nowIso(),
    }
  } catch {
    return {
      id: createId("probe"),
      sessionId,
      boardUrl: url,
      boardId,
      status: "unreachable",
      httpCode: 0,
      checkedAt: nowIso(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function probeUrls(urls: string[]): Promise<{ sessionId: string; results: ProbeResult[] }> {
  const sessionId = createId("sess")
  const results: ProbeResult[] = []

  for (const url of urls) {
    const result = await probeSingleUrl(url.trim(), sessionId)
    results.push(result)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return { sessionId, results }
}
