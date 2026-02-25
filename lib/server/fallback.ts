import { MOCK_BOARDS } from "@/lib/mock-data"
import type { MiroBoard } from "@/lib/server/types"

export function getFallbackBoards(): MiroBoard[] {
  return MOCK_BOARDS.map((board) => ({
    id: board.boardId,
    name: board.boardName,
    modifiedAt: board.lastModified,
    owner: board.owner,
    team: board.team,
    publicAccess: board.findings.some((item) => item.check === "public_link"),
    publicEditAccess: board.findings.some((item) => item.check === "public_edit_access"),
    editorCount: (() => {
      const editorFinding = board.findings.find((item) => item.check === "editors")
      const count = editorFinding?.details?.editorCount
      return typeof count === "number" ? count : undefined
    })(),
    contentText: [board.boardName, board.findings.map((item) => JSON.stringify(item.details)).join(" ")].join(" "),
  }))
}
