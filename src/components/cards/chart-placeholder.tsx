import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartPlaceholder({
  title,
  values,
  caption,
}: {
  title: string;
  values: number[];
  caption: string;
}) {
  const width = 320;
  const height = 140;
  const pad = 16;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - (value / max) * (height - pad * 2);
    return `${x},${y}`;
  });
  const area = `${pad},${height - pad} ${points.join(" ")} ${width - pad},${height - pad}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="text-primary h-40 w-full"
          role="img"
          aria-label={caption}
        >
          <polygon points={area} className="fill-primary/15" />
          <polyline
            points={points.join(" ")}
            fill="none"
            className="stroke-primary"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-muted-foreground mt-2 text-xs">{caption}</p>
      </CardContent>
    </Card>
  );
}
