import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { cn } from '@/lib/utils'

interface SentimentGaugeProps {
  score: number        // -1.0 to 1.0
  label: string
  postVolume: number
  source?: string
}

export default function SentimentGauge({ score, label, postVolume, source }: SentimentGaugeProps) {
  // Map -1..1 to 0..100 for RadialBar
  const pct = Math.round(((score + 1) / 2) * 100)

  const color = label === 'positive' ? '#00ff88'
    : label === 'negative' ? '#ff3b5c'
    : '#ffb800'

  const labelText = label === 'positive' ? 'Bullish'
    : label === 'negative' ? 'Bearish'
    : 'Neutral'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%"
            innerRadius="65%" outerRadius="100%"
            startAngle={210} endAngle={-30}
            data={[{ value: pct, fill: color }]}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={4}
              background={{ fill: 'rgba(255,255,255,0.05)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold" style={{ color }}>
            {score >= 0 ? '+' : ''}{score.toFixed(2)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
            {labelText}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-text-muted font-mono">
        {postVolume} posts {source ? `· ${source}` : ''}
      </p>
    </div>
  )
}
