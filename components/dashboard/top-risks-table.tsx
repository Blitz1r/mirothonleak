"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ScannedBoard } from "@/lib/mock-data"

interface TopRisksTableProps {
  boards: ScannedBoard[]
}

const severityBadge: Record<string, string> = {
  low: "border-severity-low/30 bg-severity-low/10 text-severity-low",
  medium: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  high: "border-severity-high/30 bg-severity-high/10 text-severity-high",
}

export function TopRisksTable({ boards }: TopRisksTableProps) {
  const topBoards = [...boards].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground">Top Risk Boards</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Board</TableHead>
              <TableHead className="text-muted-foreground">Team</TableHead>
              <TableHead className="text-muted-foreground text-right">Score</TableHead>
              <TableHead className="text-muted-foreground text-right">Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topBoards.map((board) => (
              <TableRow key={board.boardId} className="border-border">
                <TableCell className="font-medium text-foreground">{board.boardName}</TableCell>
                <TableCell className="text-muted-foreground">{board.team}</TableCell>
                <TableCell className="text-right tabular-nums font-mono text-foreground">{board.riskScore}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", severityBadge[board.severity])}
                  >
                    {board.severity}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
