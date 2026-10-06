import { SparklesIcon } from "lucide-react";

export function SampleNotice({ title, description }: { title: string; description: string }) {
  return (
    <div
      role="note"
      className="border-brand/25 bg-brand-soft/60 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
    >
      <SparklesIcon className="text-brand mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="text-pretty">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground"> · {description}</span>
      </p>
    </div>
  );
}
