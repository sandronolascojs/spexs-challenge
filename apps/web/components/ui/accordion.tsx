'use client';

import { Accordion as AccordionPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  );
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('not-last:border-b', className)}
      {...props}
    />
  );
}

function AccordionHeader({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Header>) {
  return (
    <AccordionPrimitive.Header
      data-slot="accordion-header"
      className={cn('flex items-center', className)}
      {...props}
    />
  );
}

/**
 * Bare trigger — use this inside an explicit <AccordionHeader> when you need
 * sibling elements (e.g. an action button) in the same header row.
 */
function AccordionTriggerPrimitive({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cn(
        'group/accordion-trigger relative flex flex-1 items-center gap-3 py-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        data-slot="accordion-trigger-icon"
        className="pointer-events-none size-4 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:hidden"
      />
      <ChevronUpIcon
        data-slot="accordion-trigger-icon"
        className="pointer-events-none hidden size-4 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:inline"
      />
    </AccordionPrimitive.Trigger>
  );
}

/**
 * Convenience wrapper — renders its own <AccordionHeader> internally.
 * Use when you don't need sibling elements alongside the trigger.
 */
function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionHeader>
      <AccordionTriggerPrimitive className={className} {...props}>
        {children}
      </AccordionTriggerPrimitive>
    </AccordionHeader>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          'h-(--radix-accordion-content-height) pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  AccordionTriggerPrimitive,
  AccordionContent,
};
