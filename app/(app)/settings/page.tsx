"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DEFAULT_SETTINGS, type SettingsConfig } from "@/lib/mock-data"
import { Settings, Save, Plus, X, RotateCcw } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsConfig>({ ...DEFAULT_SETTINGS })
  const [newKeyword, setNewKeyword] = useState("")
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      setError(null)
      try {
        const response = await fetch("/api/settings")
        const data = (await response.json()) as { settings?: SettingsConfig; error?: string }

        if (!response.ok || !data.settings) {
          setError(data.error ?? "Failed to load settings")
          return
        }

        setSettings(data.settings)
      } catch {
        setError("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [])

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })

      const data = (await response.json()) as { settings?: SettingsConfig; error?: string }

      if (!response.ok || !data.settings) {
        setError(data.error ?? "Failed to save settings")
        return
      }

      setSettings(data.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    setSettings({ ...DEFAULT_SETTINGS })
    setError(null)

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(DEFAULT_SETTINGS),
      })

      const data = (await response.json()) as { settings?: SettingsConfig; error?: string }
      if (!response.ok || !data.settings) {
        setError(data.error ?? "Failed to reset settings")
      }
    } catch {
      setError("Failed to reset settings")
    }
  }

  const addKeyword = () => {
    const keyword = newKeyword.trim()
    if (keyword && !settings.sensitiveKeywords.includes(keyword)) {
      setSettings((prev) => ({
        ...prev,
        sensitiveKeywords: [...prev.sensitiveKeywords, keyword],
      }))
      setNewKeyword("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setSettings((prev) => ({
      ...prev,
      sensitiveKeywords: prev.sensitiveKeywords.filter((k) => k !== keyword),
    }))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure scan thresholds and sensitive keyword detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2" disabled={isSaving || isLoading}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-2" disabled={isSaving || isLoading}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : saved ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-xs text-severity-high">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scan Thresholds */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings className="h-4 w-4" />
              Scan Thresholds
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Adjust the thresholds used for heuristic security checks during board scanning.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Stale Board Threshold */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="staleDays" className="text-sm text-foreground">
                Stale Board Threshold (days)
              </Label>
              <p className="text-xs text-muted-foreground">
                Boards not modified within this number of days will be flagged as stale.
              </p>
              <Input
                id="staleDays"
                type="number"
                min={1}
                max={365}
                value={settings.staleDaysThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    staleDaysThreshold: parseInt(e.target.value) || 90,
                  }))
                }
                disabled={isLoading}
                className="max-w-[200px] bg-secondary border-border text-foreground"
              />
              <span className="text-xs text-muted-foreground">
                Default: 90 days
              </span>
            </div>

            <Separator className="bg-border" />

            {/* Max Editors Threshold */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxEditors" className="text-sm text-foreground">
                Maximum Editors Threshold
              </Label>
              <p className="text-xs text-muted-foreground">
                Boards with more editors than this number will be flagged for review.
              </p>
              <Input
                id="maxEditors"
                type="number"
                min={1}
                max={100}
                value={settings.maxEditorsThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxEditorsThreshold: parseInt(e.target.value) || 10,
                  }))
                }
                disabled={isLoading}
                className="max-w-[200px] bg-secondary border-border text-foreground"
              />
              <span className="text-xs text-muted-foreground">
                Default: 10 editors
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sensitive Keywords */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings className="h-4 w-4" />
              Sensitive Keywords
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Keywords used to detect potentially sensitive content in board text and sticky notes. This is a heuristic check with low confidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Add keyword input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                disabled={isLoading}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={addKeyword}
                disabled={!newKeyword.trim() || isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Keyword list */}
            <div className="flex flex-wrap gap-2">
              {settings.sensitiveKeywords.map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="gap-1 border-border bg-secondary text-foreground hover:bg-secondary/80"
                >
                  <span className="font-mono text-xs">{keyword}</span>
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 rounded-full p-0.5 hover:bg-background/50"
                    aria-label={`Remove keyword ${keyword}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {settings.sensitiveKeywords.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No keywords configured. Add keywords above to enable sensitive text detection.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Check weights reference */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Risk Score Reference</CardTitle>
          <CardDescription className="text-muted-foreground">
            How each security check contributes to the per-board risk score (0-100 scale).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { check: "Public Link Sharing", weight: 30, confidence: "High" },
              { check: "Public Edit Access", weight: 20, confidence: "High" },
              { check: "Stale Board", weight: 10, confidence: "High" },
              { check: "Too Many Editors", weight: 10, confidence: "Medium" },
              { check: "Sensitive Text", weight: 15, confidence: "Low" },
            ].map((item) => (
              <div
                key={item.check}
                className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-3"
              >
                <span className="text-xs font-medium text-foreground">{item.check}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-primary tabular-nums">+{item.weight}</span>
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
                <Badge variant="outline" className="w-fit text-[10px] border-border bg-secondary text-muted-foreground">
                  {item.confidence} confidence
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Severity legend */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">Severity Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-severity-low" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-severity-low">Low</span>
                <span className="text-xs text-muted-foreground">Score 0-19</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-severity-medium" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-severity-medium">Medium</span>
                <span className="text-xs text-muted-foreground">Score 20-49</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-severity-high" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-severity-high">High</span>
                <span className="text-xs text-muted-foreground">Score 50+</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
