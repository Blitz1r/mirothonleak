import { NextRequest, NextResponse } from "next/server"

import { createId } from "@/lib/server/utils"
import { getMiroAuthUrl, getMiroRedirectUri } from "@/lib/server/miro"
import { putOAuthState } from "@/lib/server/storage"

export async function GET(request: NextRequest) {
  const state = createId("state")
  await putOAuthState(state)

  const forwardedProto = request.headers.get("x-forwarded-proto")
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost ?? request.headers.get("host")
  const origin = host ? `${forwardedProto ?? "http"}://${host}` : undefined

  try {
    const redirectUri = getMiroRedirectUri(origin)
    const authUrl = getMiroAuthUrl(state, redirectUri)
    const shouldRedirect = request.nextUrl.searchParams.get("redirect") === "1"

    if (shouldRedirect) {
      return NextResponse.redirect(authUrl)
    }

    return NextResponse.json({ authUrl, state, redirectUri })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create auth URL"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
