"use client"

import { AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface TTLHealthProps {
  remainingDays: number
  totalDays: number
  onBump: () => void
  isBumping?: boolean
}

export function VestingTTLAlert({
  remainingDays,
  totalDays,
  onBump,
  isBumping = false
}: TTLHealthProps) {
  const percentage = Math.max(0, Math.min(100, (remainingDays / totalDays) * 100))
  const isLow = remainingDays < 7
  const isCritical = remainingDays < 2

  if (remainingDays > 14) return null // Only show warning if < 2 weeks left

  return (
    <Alert 
      variant={isCritical ? "destructive" : "default"}
      className={cn(
        "border-2",
        isLow && !isCritical && "border-amber-500 bg-amber-500/10 text-amber-200",
        isCritical && "border-red-500 bg-red-500/10"
      )}
    >
      {isCritical ? (
        <AlertTriangle className="h-5 w-5 text-red-500" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      )}
      <AlertTitle className="font-bold flex items-center gap-2">
        {isCritical ? "Critical: Data Expiration Imminent" : "Storage TTL Warning"}
        <span className="text-xs font-normal opacity-70">
          ({remainingDays} days remaining)
        </span>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          Your vesting data will be deleted by the network in {remainingDays} days unless storage is extended.
        </p>
        
        <div className="flex items-center gap-4">
          <Progress value={percentage} className="h-2 flex-1" />
          <Button 
            size="sm" 
            variant={isCritical ? "destructive" : "outline"}
            className={cn(
              "h-8 gap-2",
              isLow && !isCritical && "border-amber-500 hover:bg-amber-500/20 text-amber-200"
            )}
            onClick={onBump}
            disabled={isBumping}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isBumping && "animate-spin")} />
            {isBumping ? "Bumping..." : "Extend Storage"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
