import { NextRequest, NextResponse } from "next/server"

import { MIRO_SESSION_COOKIE } from "@/lib/server/constants"
import { getMiroRedirectUri, exchangeCodeForToken, getMiroUser } from "@/lib/server/miro"
import { consumeOAuthState, putMiroSession } from "@/lib/server/storage"
import { createId } from "@/lib/server/utils"

function getCallbackBaseUrl(request: NextRequest): string | undefined {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost ?? request.headers.get("host")
  return host ? `${forwardedProto ?? "http"}://${host}` : undefined
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const asJson = request.nextUrl.searchParams.get("format") === "json"

  if (!code || !state) {
    return NextResponse.json({ error: "Missing OAuth code or state" }, { status: 400 })
  }

  if (!consumeOAuthState(state)) {
    return NextResponse.json({ error: "Invalid or expired OAuth state" }, { status: 400 })
  }

  try {
    const redirectUri = getMiroRedirectUri(getCallbackBaseUrl(request))
    const token = await exchangeCodeForToken(code, redirectUri)
    const user = await getMiroUser(token.access_token)

    const sessionId = createId("miro-session")
    const expiresAt = token.expires_in ? Date.now() + token.expires_in * 1000 : undefined

    putMiroSession({
      id: sessionId,
      userId: user.id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt,
      createdAt: Date.now(),
    })

    if (asJson) {
      const response = NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })

      response.cookies.set(MIRO_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      })

      return response
    }

    const redirectTarget = new URL("/scanner?connected=1", request.url)
    const response = NextResponse.redirect(redirectTarget)

    response.cookies.set(MIRO_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth callback failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
