'use client';

import type { CSSProperties, ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Fixed-order categorical series colors (see styles/tokens.css `--chart-series-*`
 * and the dataviz skill's palette.md) — assign by index, never cycle or
 * reassign when the series count changes.
 */
export const CHART_COLORS = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
  'var(--chart-series-6)',
  'var(--chart-series-7)',
  'var(--chart-series-8)',
] as const;

/** Chrome colors (grid, axis, tick) and a ready-made tooltip contentStyle, all token-driven. */
export const chartTheme = {
  grid: 'var(--color-border)',
  axis: 'var(--color-gray-300)',
  tick: 'var(--color-text-subtle)',
  tooltipContentStyle: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
  } satisfies CSSProperties,
  tooltipLabelStyle: {
    color: 'var(--color-text-muted)',
    fontWeight: 'var(--font-weight-medium)',
  } satisfies CSSProperties,
};

export interface ChartWrapperProps {
  height?: number;
  children: ReactElement;
}

/** Thin ResponsiveContainer wrapper — pair with CHART_COLORS/chartTheme for series and chrome. */
export function ChartWrapper({ height = 320, children }: ChartWrapperProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
