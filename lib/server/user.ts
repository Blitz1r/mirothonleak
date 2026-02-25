import { NextRequest, NextResponse } from "next/server"

import { ANON_SESSION_COOKIE, MIRO_SESSION_COOKIE } from "@/lib/server/constants"
import { getMiroSession } from "@/lib/server/storage"
import { createId } from "@/lib/server/utils"

interface CurrentUser {
  userId: string
  accessToken?: string
  anonCookieToSet?: string
}

const ANON_USER_PATTERN = /^anon-[a-f0-9-]{36}$/

export async function getCurrentUser(request: NextRequest): Promise<CurrentUser> {
  const sessionId = request.cookies.get(MIRO_SESSION_COOKIE)?.value
  const session = await getMiroSession(sessionId)

  if (session) {
    return { userId: session.userId, accessToken: session.accessToken }
  }

  const anonCookieValue = request.cookies.get(ANON_SESSION_COOKIE)?.value
  if (anonCookieValue && ANON_USER_PATTERN.test(anonCookieValue)) {
    return { userId: anonCookieValue }
  }

  const anonUserId = createId("anon")
  return { userId: anonUserId, anonCookieToSet: anonUserId }
}

export function applyUserCookie(response: NextResponse, currentUser: CurrentUser): void {
  if (!currentUser.anonCookieToSet) return

  response.cookies.set(ANON_SESSION_COOKIE, currentUser.anonCookieToSet, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}
