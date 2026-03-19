'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAddStepComment, useStepComments } from '../hooks/http/use-events';

// ── Schema ─────────────────────────────────────────────────────────────────────

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

type CommentFormValues = z.infer<typeof commentSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface StepCommentsSheetProps {
  nodeExecutionId: string;
  executionId: string;
  nodeType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepCommentsSheet({
  nodeExecutionId,
  executionId,
  nodeType,
  open,
  onOpenChange,
}: StepCommentsSheetProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useStepComments(nodeExecutionId);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: container, threshold: 0.1 },
    );

    const sentinel = bottomRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const addCommentMutation = useAddStepComment({
    nodeExecutionId,
    executionId,
    workflowId: '',
  });

  const onSubmit = ({ content }: CommentFormValues) => {
    addCommentMutation.mutate(
      { nodeExecutionId, content },
      { onSuccess: () => reset() },
    );
  };

  const allComments = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <SheetTitle className="text-sm font-semibold">
              {nodeType} — Comments
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Comment input */}
        <div className="border-b border-border p-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <Field>
              <Textarea
                {...register('content')}
                placeholder="Add a comment… (Enter to send, Shift+Enter for new line)"
                className="min-h-[72px] resize-none text-sm"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmit(onSubmit)();
                  }
                }}
              />
              <FieldError errors={[errors.content]} />
            </Field>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {addCommentMutation.isPending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        </div>

        {/* Comments list — scrollable */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : allComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <MessageSquare className="size-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                No comments yet. Be the first to comment.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {allComments.map((c) => (
                <div key={c.id} className="flex gap-3 px-4 py-3">
                  <Avatar className="mt-0.5 size-7 shrink-0">
                    {c.userImage && (
                      <AvatarImage src={c.userImage} alt={c.userName} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(c.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">{c.userName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.createdAt
                          ? format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')
                          : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Sentinel — triggers fetchNextPage when visible */}
              <div ref={bottomRef} className="py-1">
                {isFetchingNextPage && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
