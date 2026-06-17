'use client'

import { Clock, ExternalLink, Trophy, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatAED } from '@/lib/utils'
import { PLATFORM_META } from '@/types'
import type { PlatformResult } from '@/types'

interface Props {
  result: PlatformResult
  rank: number
}

export function PlatformCard({ result, rank }: Props) {
  const meta = PLATFORM_META[result.platform]
  const isWinner = rank === 1

  if (!result.available) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-5 opacity-60">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-muted-foreground">{meta.label}</span>
          <Badge variant="secondary">Not available</Badge>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-shadow ${
        isWinner
          ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
          : 'border-border bg-card'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isWinner && (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-lg"
                style={{ color: meta.primaryColor }}
              >
                {meta.label}
              </span>
              {isWinner && (
                <Badge className="bg-primary text-primary-foreground text-xs">Best deal</Badge>
              )}
            </div>
            {result.savings !== undefined && result.savings > 0 && (
              <p className="text-xs text-green-700 font-medium mt-0.5">
                Save {formatAED(result.savings)} vs most expensive
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{formatAED(result.total)}</p>
          <div className="flex items-center gap-1 justify-end mt-0.5 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{result.estimatedMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="space-y-1 mb-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Items</span>
          <span>{formatAED(result.itemsTotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery fee</span>
          <span>{formatAED(result.deliveryFee)}</span>
        </div>
        {result.serviceFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Service fee</span>
            <span>{formatAED(result.serviceFee)}</span>
          </div>
        )}
        {result.smallOrderFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Small order fee</span>
            <span>{formatAED(result.smallOrderFee)}</span>
          </div>
        )}
        {result.discount > 0 && (
          <div className="flex justify-between text-green-700">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Discount
            </span>
            <span>−{formatAED(result.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
          <span>Total</span>
          <span>{formatAED(result.total)}</span>
        </div>
      </div>

      {/* CTA */}
      <Button
        className="w-full"
        variant={isWinner ? 'default' : 'outline'}
        onClick={() => window.open(result.deepLinkUrl, '_blank')}
      >
        <ExternalLink className="w-4 h-4" />
        Open in {meta.label}
      </Button>
    </div>
  )
}
