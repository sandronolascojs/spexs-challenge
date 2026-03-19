'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { VARIABLE_TOKEN_PATTERN } from '../shared/variable-token-pattern';
import type { VariableItem } from './lib/template-utils';
import { VariableAutocomplete } from './variable-autocomplete';

interface MessageTemplateOverlayProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  fieldName: string;
  fieldRef: (el: HTMLTextAreaElement | null) => void;
  isInvalid: boolean;
  cursorPosition: number | null;
  onCursorChange: (position: number) => void;
  variables: VariableItem[];
}

export function MessageTemplateOverlay({
  value,
  onChange,
  onBlur,
  fieldName,
  fieldRef,
  isInvalid,
  cursorPosition,
  onCursorChange,
  variables,
}: MessageTemplateOverlayProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleTextareaSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    onCursorChange(e.currentTarget.selectionStart);
  }

  function handleTextareaScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (bgRef.current) {
      bgRef.current.scrollTop = e.currentTarget.scrollTop;
      bgRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }

  function handleAutocompleteSelect(newValue: string, newCursor: number) {
    onChange(newValue);
    // Restore cursor position after React re-renders the textarea
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursor;
        textareaRef.current.selectionEnd = newCursor;
        textareaRef.current.focus();
      }
      onCursorChange(newCursor);
    });
  }

  return (
    <div className="group relative flex flex-1 overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary/20">
      {/* Background div rendering colored tokens */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed text-foreground"
      >
        {!value ? (
          <span className="text-muted-foreground/40">
            e.g. Alert: {'{{trigger.metricName}}'} has reached{' '}
            {'{{trigger.value}}'}
          </span>
        ) : (
          renderHighlightedTemplate(value)
        )}
        {value.endsWith('\n') ? <br /> : null}
      </div>

      {/* Foreground invisible textarea that captures typing/selection */}
      <Textarea
        id={fieldName}
        name={fieldName}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          // Update cursor on every keystroke so autocomplete tracks it
          onCursorChange(e.target.selectionStart);
        }}
        onBlur={onBlur}
        ref={(el) => {
          fieldRef(el);
          textareaRef.current = el;
        }}
        aria-invalid={isInvalid}
        className={cn(
          'absolute inset-0 z-10 resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-transparent caret-foreground shadow-none outline-none focus-visible:ring-0',
        )}
        onSelect={handleTextareaSelect}
        onClick={handleTextareaSelect}
        onScroll={handleTextareaScroll}
      />

      {/* Autocomplete dropdown positioned at the caret */}
      <VariableAutocomplete
        variables={variables}
        value={value}
        cursorPosition={cursorPosition}
        textareaElement={textareaRef.current}
        onSelect={handleAutocompleteSelect}
      />
    </div>
  );
}

/**
 * Renders a template string with `{{variable}}` tokens highlighted.
 * Uses offset-based keys for stable React rendering.
 */
function renderHighlightedTemplate(template: string) {
  const parts = template.split(VARIABLE_TOKEN_PATTERN);
  let charOffset = 0;

  return parts.map((segment) => {
    const key = `bg-${charOffset}`;
    charOffset += segment.length;
    VARIABLE_TOKEN_PATTERN.lastIndex = 0;

    if (VARIABLE_TOKEN_PATTERN.test(segment)) {
      return (
        <mark key={key} className="rounded bg-primary/20 text-primary">
          {segment}
        </mark>
      );
    }
    return <span key={key}>{segment}</span>;
  });
}
