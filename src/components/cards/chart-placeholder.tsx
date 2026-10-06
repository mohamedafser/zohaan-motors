import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartPlaceholder({
  title,
  values,
  caption,
  summary,
}: {
  title: string;
  values: number[];
  caption: string;
  /** Optional headline figure shown under the title. */
  summary?: React.ReactNode;
}) {
  const width = 600;
  const height = 200;
  const pad = 8;
  const max = Math.max(...values, 1) * 1.1;
  const coords = values.map((value, index) => ({
    x: (index / Math.max(values.length - 1, 1)) * width,
    y: height - pad - (value / max) * (height - pad * 2),
  }));
  const line = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const last = coords.at(-1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {summary ? <CardDescription>{summary}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="relative min-h-44 flex-1">
          {/* Horizontal gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
            {[0, 1, 2, 3].map((line) => (
              <div key={line} className="border-border/70 border-t border-dashed" />
            ))}
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="text-brand absolute inset-0 size-full overflow-visible rtl:-scale-x-100"
            role="img"
            aria-label={caption}
          >
            <defs>
              <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#chart-fill)" />
            <polyline
              points={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {last ? (
            <span
              className="bg-brand ring-card absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 rtl:translate-x-1/2"
              style={{ insetInlineStart: "100%", top: `${(last.y / height) * 100}%` }}
              aria-hidden
            />
          ) : null}
        </div>
        <p className="text-muted-foreground mt-3 text-xs">{caption}</p>
      </CardContent>
    </Card>
  );
}
