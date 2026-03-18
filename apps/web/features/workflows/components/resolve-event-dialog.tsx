'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ResolveEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  workflowId: string;
}

const DEFAULT_COMMENT = '';

export function ResolveEventDialog({
  open,
  onOpenChange,
  eventId,
  workflowId,
}: ResolveEventDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(DEFAULT_COMMENT);

  const resolveMutation = useMutation(
    trpc.events.resolve.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.events.listByWorkflow.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.events.getById.queryFilter({ id: eventId }),
        );
        setComment(DEFAULT_COMMENT);
        onOpenChange(false);
      },
    }),
  );

  function handleResolve() {
    const trimmedComment = comment.trim();
    resolveMutation.mutate({
      eventId,
      comment: trimmedComment || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Event</DialogTitle>
          <DialogDescription>
            Mark this event as resolved. You can optionally add a comment
            explaining the resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Resolution Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="e.g., Fixed by scaling up the service"
              rows={3}
            />
          </div>

          {resolveMutation.error && (
            <p className="text-sm text-destructive">
              {resolveMutation.error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resolveMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
            {resolveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Resolving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Resolve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
