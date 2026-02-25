"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BoardFindingsPanel } from "@/components/scanner/board-findings-panel"
import {
  formatDate,
  type ScannedBoard,
  type Severity,
} from "@/lib/mock-data"
import {
  ScanSearch,
  LogIn,
  ArrowUpDown,
  ChevronRight,
  Shield,
  X,
} from "lucide-react"

const severityBadge: Record<string, string> = {
  low: "border-severity-low/30 bg-severity-low/10 text-severity-low",
  medium: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  high: "border-severity-high/30 bg-severity-high/10 text-severity-high",
}

const severityScoreColor: Record<Severity, string> = {
  low: "text-severity-low",
  medium: "text-severity-medium",
  high: "text-severity-high",
}

type SortField = "boardName" | "riskScore" | "lastModified"
type SortDir = "asc" | "desc"

export default function ScannerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [boards, setBoards] = useState<ScannedBoard[]>([])
  const [scanSource, setScanSource] = useState<"miro" | "mock" | null>(null)
  const [scanWarning, setScanWarning] = useState<string | null>(null)
  const [selectedBoard, setSelectedBoard] = useState<ScannedBoard | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [filterText, setFilterText] = useState("")
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all")
  const [sortField, setSortField] = useState<SortField>("riskScore")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected") === "1") {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = async () => {
    setApiError(null)

    try {
      const response = await fetch("/api/auth/miro")
      const data = (await response.json()) as { authUrl?: string; error?: string }

      if (!response.ok || !data.authUrl) {
        setApiError(data.error ?? "Unable to start OAuth flow")
        return
      }

      window.location.href = data.authUrl
    } catch {
      setApiError("Unable to start OAuth flow")
    }
  }

  const handleScan = async () => {
    setApiError(null)
    setScanWarning(null)
    setIsScanning(true)

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      const data = (await response.json()) as {
        boards?: ScannedBoard[]
        source?: "miro" | "mock"
        warning?: string
        error?: string
      }

      if (!response.ok || !data.boards) {
        setApiError(data.error ?? "Scan failed")
        return
      }

      setBoards(data.boards)
      setScanSource(data.source ?? null)
      setScanWarning(data.warning ?? null)
      setSelectedBoard(data.boards[0] ?? null)
      setIsAuthenticated(true)
    } catch {
      setApiError("Scan failed")
    } finally {
      setIsScanning(false)
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const filteredBoards = boards
    .filter((b) => {
      const matchesText =
        b.boardName.toLowerCase().includes(filterText.toLowerCase()) ||
        b.team.toLowerCase().includes(filterText.toLowerCase()) ||
        b.owner.toLowerCase().includes(filterText.toLowerCase())
      const matchesSeverity = filterSeverity === "all" || b.severity === filterSeverity
      return matchesText && matchesSeverity
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      if (sortField === "boardName") return a.boardName.localeCompare(b.boardName) * dir
      if (sortField === "riskScore") return (a.riskScore - b.riskScore) * dir
      if (sortField === "lastModified") return (new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()) * dir
      return 0
    })

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Board Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Authenticate with Miro to scan your boards for security risks
          </p>
        </div>
        <Card className="mx-auto max-w-md bg-card border-border">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-lg font-semibold text-foreground">Connect Your Miro Account</h2>
              <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
                Sign in with Miro OAuth to allow the scanner to read your board metadata and sharing settings. We request the minimum scopes required.
              </p>
            </div>
            <Button onClick={handleLogin} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign in with Miro
            </Button>
            {apiError ? (
              <p className="text-xs text-severity-high text-center">{apiError}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Scopes: boards:read, team:read
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Authenticated but no scan yet
  if (boards.length === 0 && !isScanning) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Board Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Scan your Miro boards for security risks
          </p>
        </div>
        <Card className="mx-auto max-w-md bg-card border-border">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ScanSearch className="h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-lg font-semibold text-foreground">Ready to Scan</h2>
              <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
                Click the button below to fetch all accessible boards and run security checks against each one.
              </p>
            </div>
            <Button onClick={handleScan} className="gap-2">
              <ScanSearch className="h-4 w-4" />
              Start Scan
            </Button>
            {apiError ? (
              <p className="text-xs text-severity-high text-center">{apiError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Scanning in progress
  if (isScanning) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Board Scanner</h1>
          <p className="text-sm text-muted-foreground">Scanning your boards...</p>
        </div>
        <Card className="mx-auto max-w-md bg-card border-border">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <ScanSearch className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-lg font-semibold text-foreground">Scanning Boards</h2>
              <p className="text-sm text-muted-foreground">
                Fetching board metadata and running security checks...
              </p>
            </div>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Scan results with detail panel
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Board Scanner</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
            {filteredBoards.length} of {boards.length} boards shown
            </span>
            {scanSource ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                Source: {scanSource}
              </Badge>
            ) : null}
          </div>
        </div>
        <Button onClick={handleScan} variant="outline" size="sm" className="gap-2">
          <ScanSearch className="h-4 w-4" />
          Re-scan
        </Button>
      </div>

      {apiError ? (
        <p className="text-sm text-severity-high">{apiError}</p>
      ) : null}

      {scanWarning ? (
        <p className="text-sm text-severity-medium">{scanWarning}</p>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Filter boards..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-xs bg-secondary border-border text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex gap-2">
          {(["all", "high", "medium", "low"] as const).map((sev) => (
            <Button
              key={sev}
              variant={filterSeverity === sev ? "default" : "outline"}
              size="sm"
              className="capitalize"
              onClick={() => setFilterSeverity(sev)}
            >
              {sev}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Board table */}
        <div className={cn("lg:col-span-3", selectedBoard && "lg:col-span-3")}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-foreground">Scanned Boards</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>
                      <button
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleSort("boardName")}
                      >
                        Board <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">Team</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground">
                      <button
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleSort("lastModified")}
                      >
                        Modified <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground ml-auto"
                        onClick={() => toggleSort("riskScore")}
                      >
                        Score <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">Severity</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoards.map((board) => (
                    <TableRow
                      key={board.boardId}
                      className={cn(
                        "border-border cursor-pointer",
                        selectedBoard?.boardId === board.boardId && "bg-secondary"
                      )}
                      onClick={() => setSelectedBoard(board)}
                    >
                      <TableCell className="font-medium text-foreground">{board.boardName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{board.team}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {formatDate(board.lastModified)}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums font-mono font-semibold", severityScoreColor[board.severity])}>
                        {board.riskScore}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn("capitalize", severityBadge[board.severity])}>
                          {board.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-8">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedBoard ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{selectedBoard.boardName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedBoard.owner} &middot; {selectedBoard.team}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedBoard(null)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-border bg-secondary/50 px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                  <span className={cn("text-2xl font-bold tabular-nums font-mono", severityScoreColor[selectedBoard.severity])}>
                    {selectedBoard.riskScore}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Findings</span>
                  <span className="text-2xl font-bold tabular-nums text-foreground">{selectedBoard.findings.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Last Modified</span>
                  <span className="text-xs text-foreground">{formatDate(selectedBoard.lastModified)}</span>
                </div>
              </div>
              <BoardFindingsPanel findings={selectedBoard.findings} boardName={selectedBoard.boardName} />
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ScanSearch className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Select a board to view findings</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
