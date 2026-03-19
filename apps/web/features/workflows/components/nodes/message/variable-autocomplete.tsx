'use client';

import { cn } from '@/lib/utils';
import { Hash, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VariableItem } from './lib/template-utils';

// ── Constants ─────────────────────────────────────────────────────────────────

/** The trigger sequence that opens the autocomplete dropdown. */
const TRIGGER_SEQUENCE = '{{';

/** Maximum number of items visible in the dropdown before scrolling. */
const MAX_VISIBLE_ITEMS = 6;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutocompleteState {
  /** Character index where `{{` starts in the textarea value. */
  triggerStart: number;
  /** The partial text the user has typed after `{{`, used to filter variables. */
  filterText: string;
}

interface VariableAutocompleteProps {
  /** Available variables to suggest. */
  variables: VariableItem[];
  /** Current textarea value. */
  value: string;
  /** Current cursor position in the textarea. */
  cursorPosition: number | null;
  /** The textarea element for pixel-position calculation. */
  textareaElement: HTMLTextAreaElement | null;
  /** Called when the user selects a variable from the dropdown. */
  onSelect: (completed: string, cursorOffset: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Detects whether the user is currently inside a `{{...` token that hasn't been
 * closed yet. Returns the autocomplete state or null if not in a trigger context.
 */
function detectTriggerContext(
  value: string,
  cursor: number,
): AutocompleteState | null {
  // Walk backwards from cursor to find the nearest `{{`
  const beforeCursor = value.slice(0, cursor);
  const lastOpen = beforeCursor.lastIndexOf(TRIGGER_SEQUENCE);
  if (lastOpen === -1) return null;

  const afterOpen = beforeCursor.slice(lastOpen + TRIGGER_SEQUENCE.length);

  // If there's already a `}}` between the `{{` and cursor, it's closed
  if (afterOpen.includes('}}')) return null;

  // If there are newlines or spaces in the partial, it's not a variable token
  if (/[\s\n]/.test(afterOpen)) return null;

  return {
    triggerStart: lastOpen,
    filterText: afterOpen.toLowerCase(),
  };
}

/**
 * Calculates the pixel coordinates of a character position within a textarea
 * by creating an invisible mirror div with matching styles.
 */
function getCaretPixelPosition(
  textarea: HTMLTextAreaElement,
  charIndex: number,
): { top: number; left: number } {
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  // Copy all relevant styles to the mirror
  const propertiesToCopy = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'letterSpacing',
    'lineHeight',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'border',
    'borderWidth',
    'boxSizing',
    'whiteSpace',
    'wordWrap',
    'wordBreak',
    'overflowWrap',
    'tabSize',
  ] as const;

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.width = `${textarea.clientWidth}px`;

  for (const prop of propertiesToCopy) {
    mirror.style[prop] = style[prop];
  }

  // Insert text up to the caret, then a span marker
  const textBefore = textarea.value.slice(0, charIndex);
  const textNode = document.createTextNode(textBefore);
  const marker = document.createElement('span');
  marker.textContent = '\u200b'; // zero-width space

  mirror.appendChild(textNode);
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();

  const top = markerRect.top - mirrorRect.top - textarea.scrollTop;
  const left = markerRect.left - mirrorRect.left - textarea.scrollLeft;

  document.body.removeChild(mirror);
  return { top, left };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VariableAutocomplete({
  variables,
  value,
  cursorPosition,
  textareaElement,
  onSelect,
}: VariableAutocompleteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Detect trigger context
  const triggerContext =
    cursorPosition !== null
      ? detectTriggerContext(value, cursorPosition)
      : null;

  // Filter variables by partial input
  const filteredVariables = triggerContext
    ? variables.filter((v) =>
        v.key.toLowerCase().includes(triggerContext.filterText),
      )
    : [];

  const isOpen = triggerContext !== null && filteredVariables.length > 0;

  // Reset active index when filter changes
  const previousFilterRef = useRef('');
  if (triggerContext?.filterText !== previousFilterRef.current) {
    previousFilterRef.current = triggerContext?.filterText ?? '';
    if (activeIndex !== 0) setActiveIndex(0);
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeItem = listRef.current.children[activeIndex] as
      | HTMLElement
      | undefined;
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Select handler: replaces `{{partial` with `{{variable.key}}`
  const selectVariable = useCallback(
    (variable: VariableItem) => {
      if (!triggerContext || cursorPosition === null) return;

      const before = value.slice(0, triggerContext.triggerStart);
      const after = value.slice(cursorPosition);
      const token = `{{${variable.key}}}`;
      const newValue = before + token + after;
      const newCursor = triggerContext.triggerStart + token.length;

      onSelect(newValue, newCursor);
    },
    [triggerContext, cursorPosition, value, onSelect],
  );

  // Keyboard navigation — called from the parent textarea's keydown
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredVariables.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredVariables.length - 1,
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredVariables[activeIndex];
        if (selected) selectVariable(selected);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Let parent handle closing by moving cursor
      }
    },
    [isOpen, filteredVariables, activeIndex, selectVariable],
  );

  // Attach keyboard listener to the textarea
  useEffect(() => {
    if (!textareaElement || !isOpen) return;
    textareaElement.addEventListener('keydown', handleKeyDown);
    return () => textareaElement.removeEventListener('keydown', handleKeyDown);
  }, [textareaElement, isOpen, handleKeyDown]);

  if (!isOpen || !textareaElement) return null;

  // Calculate position relative to the textarea container
  const caretPos = getCaretPixelPosition(textareaElement, cursorPosition ?? 0);

  return (
    <div
      className="absolute z-50 min-w-[220px] max-w-[300px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
      style={{
        top: caretPos.top + 24, // below the line
        left: Math.min(caretPos.left, 300), // prevent overflow
      }}
    >
      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Variables
      </div>
      <div ref={listRef} className="max-h-[240px] overflow-y-auto py-1">
        {filteredVariables
          .slice(0, MAX_VISIBLE_ITEMS * 3)
          .map((variable, index) => (
            <button
              key={variable.key}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors',
                index === activeIndex
                  ? 'bg-muted text-foreground'
                  : 'text-foreground/80 hover:bg-muted/60',
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                selectVariable(variable);
              }}
            >
              <VariableTypeIcon type={variable.type} />
              <div className="flex-1 overflow-hidden">
                <span className="block truncate font-mono">{variable.key}</span>
                {variable.value !== undefined && (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {variable.value}
                  </span>
                )}
              </div>
            </button>
          ))}
      </div>
      <div className="border-t border-border px-2 py-1 text-[10px] text-muted-foreground">
        <kbd className="rounded border border-border bg-muted px-1 font-mono">
          ↑↓
        </kbd>{' '}
        navigate{' '}
        <kbd className="rounded border border-border bg-muted px-1 font-mono">
          ↵
        </kbd>{' '}
        select{' '}
        <kbd className="rounded border border-border bg-muted px-1 font-mono">
          esc
        </kbd>{' '}
        close
      </div>
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function VariableTypeIcon({ type }: { type: VariableItem['type'] }) {
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
        type === 'string'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : type === 'number'
            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      )}
    >
      {type === 'string' ? (
        <Type className="size-3" />
      ) : (
        <Hash className="size-3" />
      )}
    </span>
  );
}
