'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import { resolveTemplateSegments } from './lib/template-utils';

interface MessageOutputPreviewProps {
  template: string;
  variableValueMap: Map<string, string>;
  onFocusTextarea: () => void;
}

export function MessageOutputPreview({
  template,
  variableValueMap,
  onFocusTextarea,
}: MessageOutputPreviewProps) {
  return (
    <aside className="relative flex flex-col overflow-hidden bg-muted/20">
      <div className="px-6 pt-5 pb-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Output
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 pb-6">
          {template ? (
            <ResolvedPreview
              template={template}
              variableValueMap={variableValueMap}
            />
          ) : (
            <EmptyPreview onFocusTextarea={onFocusTextarea} />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResolvedPreview({
  template,
  variableValueMap,
}: {
  template: string;
  variableValueMap: Map<string, string>;
}) {
  const segments = resolveTemplateSegments(template, variableValueMap);

  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Resolved Preview
        </span>
        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
          Live
        </span>
      </div>
      <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {segments.map((segment) => {
          if (segment.isDynamic) {
            return (
              <span
                key={segment.key}
                className="rounded bg-primary/20 px-1 font-semibold text-primary"
              >
                {segment.text}
              </span>
            );
          }
          if (segment.isResolved) {
            return (
              <span
                key={segment.key}
                className="rounded bg-emerald-500/15 px-0.5 text-emerald-700 dark:text-emerald-400"
              >
                {segment.text}
              </span>
            );
          }
          return (
            <span key={segment.key} className="text-foreground">
              {segment.text}
            </span>
          );
        })}
      </p>
    </div>
  );
}

function EmptyPreview({ onFocusTextarea }: { onFocusTextarea: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Write a template to see the output preview
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        or{' '}
        <button
          type="button"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
          onClick={onFocusTextarea}
        >
          start typing
        </button>
      </p>
    </div>
  );
}
