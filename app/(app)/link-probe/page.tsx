"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, type ProbeResult, type ProbeStatus } from "@/lib/mock-data"
import {
  Link2,
  Search,
  Download,
  AlertCircle,
  Eye,
  Lock,
  XCircle,
} from "lucide-react"

const MIRO_URL_REGEX = /miro\.com\/app\/board\/([a-zA-Z0-9_=]+)/

function extractBoardId(url: string): string | null {
  const match = url.match(MIRO_URL_REGEX)
  return match ? match[1] : null
}

const statusConfig: Record<ProbeStatus, { label: string; color: string; icon: React.ElementType; badgeClass: string }> = {
  viewable: {
    label: "Viewable (Public)",
    color: "text-severity-high",
    icon: Eye,
    badgeClass: "border-severity-high/30 bg-severity-high/10 text-severity-high",
  },
  protected: {
    label: "Protected (Auth Required)",
    color: "text-severity-medium",
    icon: Lock,
    badgeClass: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  },
  unreachable: {
    label: "Unreachable",
    color: "text-muted-foreground",
    icon: XCircle,
    badgeClass: "border-border bg-secondary text-muted-foreground",
  },
}

export default function LinkProbePage() {
  const [urlInput, setUrlInput] = useState("")
  const [results, setResults] = useState<ProbeResult[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProbing, setIsProbing] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const handleProbe = async () => {
    const lines = urlInput
      .split(/[\n,]/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) return
    if (lines.length > 50) {
      setErrors(["Maximum 50 URLs per submission."])
      return
    }

    setIsProbing(true)
    setErrors([])
    setResults([])
    setSessionId(null)

    try {
      const response = await fetch("/api/probe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: urlInput }),
      })

      const data = (await response.json()) as {
        sessionId?: string
        results?: ProbeResult[]
        error?: string
      }

      if (!response.ok || !data.results) {
        setErrors([data.error ?? "Probe failed"])
        return
      }

      const invalidLines = lines
        .map((url, index) => ({ url, index }))
        .filter(({ url }) => !extractBoardId(url))
        .map(({ url, index }) => `Line ${index + 1}: Invalid Miro board URL - "${url.slice(0, 60)}"`)

      setResults(data.results)
      setSessionId(data.sessionId ?? null)
      setErrors(invalidLines)
    } catch {
      setErrors(["Probe failed"])
    } finally {
      setIsProbing(false)
    }
  }

  const handleExportCSV = () => {
    if (!sessionId) return
    window.open(`/api/export/${sessionId}?type=probe`, "_blank")
  }

  const viewableCount = results.filter((r) => r.status === "viewable").length
  const protectedCount = results.filter((r) => r.status === "protected").length
  const unreachableCount = results.filter((r) => r.status === "unreachable").length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Link Probe</h1>
        <p className="text-sm text-muted-foreground">
          Paste Miro board URLs to check their public accessibility status
        </p>
      </div>

      {/* Input */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Link2 className="h-4 w-4" />
            Board URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Textarea
              placeholder={"Paste Miro board URLs, one per line.\nExample format: https://miro.com/app/board/<board-id>/"}
              className="min-h-[120px] bg-secondary border-border font-mono text-sm text-foreground placeholder:text-muted-foreground"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Maximum 50 URLs per submission. Supports one URL per line or comma-separated.
              </p>
              <Button
                onClick={handleProbe}
                disabled={isProbing || !urlInput.trim()}
                className="gap-2"
              >
                {isProbing ? (
                  <>
                    <div className="flex gap-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-bounce [animation-delay:0ms]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-bounce [animation-delay:150ms]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                    Probing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Probe URLs
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation errors */}
      {errors.length > 0 && (
        <Card className="border-severity-high/30 bg-severity-high/5">
          <CardContent className="py-4">
            <div className="flex flex-col gap-2">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-high" />
                  <span className="text-xs text-severity-high">{err}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-severity-high" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold tabular-nums">{viewableCount}</span>{" "}
                  <span className="text-muted-foreground">Viewable</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-severity-medium" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold tabular-nums">{protectedCount}</span>{" "}
                  <span className="text-muted-foreground">Protected</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-sm text-foreground">
                  <span className="font-semibold tabular-nums">{unreachableCount}</span>{" "}
                  <span className="text-muted-foreground">Unreachable</span>
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Results table */}
          <Card className="bg-card border-border">
            <CardContent className="px-0 py-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-12">#</TableHead>
                    <TableHead className="text-muted-foreground">Board URL</TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">Board ID</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground text-right">HTTP</TableHead>
                    <TableHead className="hidden lg:table-cell text-muted-foreground text-right">Checked At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => {
                    const config = statusConfig[result.status]
                    const StatusIcon = config.icon
                    return (
                      <TableRow
                        key={result.id}
                        className={cn(
                          "border-border",
                          result.status === "viewable" && "bg-severity-high/5"
                        )}
                      >
                        <TableCell className="text-muted-foreground tabular-nums font-mono text-xs">{index + 1}</TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-foreground break-all">
                            {result.boardUrl}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs font-mono text-muted-foreground">{result.boardId}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", config.badgeClass)}>
                            <StatusIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">{config.label}</span>
                            <span className="sm:hidden capitalize">{result.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono text-xs text-muted-foreground tabular-nums">
                          {result.httpCode}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right text-xs text-muted-foreground">
                          {formatDate(result.checkedAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This tool only checks publicly observable HTTP responses. No unauthorized access is attempted. Viewable boards are highlighted as potential exposure risks.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
