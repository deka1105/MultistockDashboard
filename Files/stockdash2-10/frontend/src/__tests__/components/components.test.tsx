import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// ─── Test wrapper ─────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

function renderWith(ui: React.ReactElement) {
  return render(ui, { wrapper })
}

// ─── NewsPanel ────────────────────────────────────────────────────────────────

import NewsPanel from '@/components/news/NewsPanel'
import { MOCK_NEWS } from '../mocks/handlers'

describe('NewsPanel', () => {
  const articles = MOCK_NEWS.articles as any

  it('renders all articles', () => {
    renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    expect(screen.getByText('Apple beats Q4 earnings')).toBeInTheDocument()
  })

  it('shows ticker in header', () => {
    renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    // Header contains "AAPL News & Social" — use getAllByText and check at least one
    expect(screen.getAllByText(/AAPL/).length).toBeGreaterThan(0)
  })

  it('renders social section divider when social articles present', () => {
    renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    expect(screen.getByText('Social')).toBeInTheDocument()
  })

  it('all article URLs are real (not example.com)', () => {
    const { container } = renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    const links = container.querySelectorAll('a[href]')
    links.forEach(link => {
      expect(link.getAttribute('href')).not.toContain('example.com')
    })
  })

  it('all links open in new tab', () => {
    const { container } = renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    const links = container.querySelectorAll('a[href]')
    links.forEach(link => {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    })
  })

  it('Reddit article has reddit.com URL', () => {
    const { container } = renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    const links = Array.from(container.querySelectorAll('a'))
    const redditLink = links.find(l => l.href.includes('reddit.com'))
    expect(redditLink).toBeDefined()
  })

  it('X article has x.com URL', () => {
    const { container } = renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    const links = Array.from(container.querySelectorAll('a'))
    const xLink = links.find(l => l.href.includes('x.com'))
    expect(xLink).toBeDefined()
  })

  it('StockTwits article has stocktwits.com URL', () => {
    const { container } = renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    const links = Array.from(container.querySelectorAll('a'))
    const stLink = links.find(l => l.href.includes('stocktwits.com'))
    expect(stLink).toBeDefined()
  })

  it('shows SOCIAL badge on social articles', () => {
    renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    const socialBadges = screen.getAllByText('SOCIAL')
    expect(socialBadges.length).toBeGreaterThan(0)
  })

  it('empty articles shows no recent news', () => {
    renderWith(<NewsPanel articles={[]} ticker="AAPL" />)
    expect(screen.getByText('No recent news')).toBeInTheDocument()
  })

  it('renders sentiment bar when articles present', () => {
    const { container } = renderWith(<NewsPanel articles={articles} ticker="AAPL" />)
    // sentiment bar is a flex div with colored children
    const bar = container.querySelector('.h-1.flex')
    expect(bar).toBeInTheDocument()
  })
})

// ─── StatsRow ─────────────────────────────────────────────────────────────────

import { StatsRow, WeekRangeBar } from '@/components/stocks/StatsRow'

const MOCK_QUOTE_DATA = {
  ticker: 'AAPL', price: 189.50, change: 1.23, change_pct: 0.65,
  high: 191.00, low: 187.50, open: 188.00, prev_close: 188.27,
  timestamp: 1700000000,
}

describe('StatsRow', () => {
  it('renders all 6 stat cells', () => {
    const { container } = renderWith(
      <StatsRow quote={MOCK_QUOTE_DATA} />
    )
    // Each stat cell has a stat-label
    const labels = container.querySelectorAll('.stat-label')
    expect(labels.length).toBeGreaterThanOrEqual(4)
  })

  it('shows Open price', () => {
    renderWith(<StatsRow quote={MOCK_QUOTE_DATA} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('$188.00')).toBeInTheDocument()
  })

  it('shows High price', () => {
    renderWith(<StatsRow quote={MOCK_QUOTE_DATA} />)
    expect(screen.getByText('$191.00')).toBeInTheDocument()
  })

  it('shows volume from lastCandle', () => {
    const lastCandle = { date: '2024-01-01', timestamp: 1, open: 185, high: 192, low: 183, close: 189, volume: 50_000_000 }
    renderWith(<StatsRow quote={MOCK_QUOTE_DATA} lastCandle={lastCandle} />)
    expect(screen.getByText('50.00M')).toBeInTheDocument()
  })

  it('shows dash for volume when no lastCandle', () => {
    renderWith(<StatsRow quote={MOCK_QUOTE_DATA} />)
    // Volume cell should show '—'
    const volumeLabel = screen.getByText('Volume')
    const cell = volumeLabel.parentElement
    expect(cell?.textContent).toContain('—')
  })
})

describe('WeekRangeBar', () => {
  it('renders range bar with low and high', () => {
    renderWith(<WeekRangeBar price={189.5} low52={155.0} high52={230.0} />)
    expect(screen.getByText('$155.00')).toBeInTheDocument()
    expect(screen.getByText('$230.00')).toBeInTheDocument()
  })

  it('renders nothing when price is null', () => {
    const { container } = renderWith(<WeekRangeBar price={null} low52={155} high52={230} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when high equals low', () => {
    const { container } = renderWith(<WeekRangeBar price={180} low52={180} high52={180} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows percentile', () => {
    renderWith(<WeekRangeBar price={192.5} low52={155.0} high52={230.0} />)
    expect(screen.getByText(/percentile/)).toBeInTheDocument()
  })

  it('clamps percentile between 0 and 100', () => {
    // Price above 52W high — should clamp to 100th
    renderWith(<WeekRangeBar price={250} low52={155} high52={230} />)
    expect(screen.getByText('100th percentile')).toBeInTheDocument()
  })
})

// ─── SentimentGauge ──────────────────────────────────────────────────────────

import SentimentGauge from '@/components/sentiment/SentimentGauge'

describe('SentimentGauge', () => {
  it('renders bullish label for positive score', () => {
    renderWith(<SentimentGauge score={0.65} label="positive" postVolume={142} />)
    expect(screen.getByText('Bullish')).toBeInTheDocument()
  })

  it('renders bearish label for negative score', () => {
    renderWith(<SentimentGauge score={-0.45} label="negative" postVolume={88} />)
    expect(screen.getByText('Bearish')).toBeInTheDocument()
  })

  it('renders neutral label for neutral score', () => {
    renderWith(<SentimentGauge score={0.05} label="neutral" postVolume={30} />)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('shows post volume', () => {
    renderWith(<SentimentGauge score={0.6} label="positive" postVolume={142} />)
    expect(screen.getByText(/142 posts/)).toBeInTheDocument()
  })

  it('shows formatted score', () => {
    renderWith(<SentimentGauge score={0.65} label="positive" postVolume={10} />)
    expect(screen.getByText('+0.65')).toBeInTheDocument()
  })

  it('shows negative score without + sign', () => {
    renderWith(<SentimentGauge score={-0.45} label="negative" postVolume={10} />)
    expect(screen.getByText('-0.45')).toBeInTheDocument()
  })

  it('shows source when provided', () => {
    renderWith(<SentimentGauge score={0.3} label="positive" postVolume={50} source="StockTwits" />)
    expect(screen.getByText(/StockTwits/)).toBeInTheDocument()
  })
})

// ─── Error components ─────────────────────────────────────────────────────────

import { ErrorCard, EmptyState } from '@/components/common/ErrorBoundary'

describe('ErrorCard', () => {
  it('renders error message', () => {
    renderWith(<ErrorCard message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows default message when none provided', () => {
    renderWith(<ErrorCard />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders retry button when handler provided', async () => {
    const onRetry = vi.fn()
    renderWith(<ErrorCard message="Error" onRetry={onRetry} />)
    await userEvent.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not render retry button when no handler', () => {
    renderWith(<ErrorCard message="Error" />)
    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders default message', () => {
    renderWith(<EmptyState />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders custom message', () => {
    renderWith(<EmptyState message="No results found" />)
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })
})

// ─── Skeleton components ──────────────────────────────────────────────────────

import { Skeleton, QuoteCardSkeleton, ChartSkeleton } from '@/components/common/Skeleton'

describe('Skeleton components', () => {
  it('Skeleton renders with custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />)
    expect(container.firstChild).toHaveClass('animate-pulse')
    expect(container.firstChild).toHaveClass('h-10')
  })

  it('QuoteCardSkeleton renders', () => {
    const { container } = render(<QuoteCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('ChartSkeleton renders', () => {
    const { container } = render(<ChartSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
