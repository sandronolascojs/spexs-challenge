'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useResolveAlertEvent } from '@/features/workflows/hooks/http/use-events';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ResolveEventDialogProps {
  eventId: string;
  onResolve: () => void;
}

export function ResolveEventDialog({
  eventId,
  onResolve,
}: ResolveEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const mutation = useResolveAlertEvent();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Alert</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="resolve-comment"
              className="text-xs font-medium text-muted-foreground"
            >
              Resolution note (optional)
            </Label>
            <Textarea
              id="resolve-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe how this alert was resolved…"
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { eventId, comment },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setComment('');
                    onResolve();
                  },
                },
              )
            }
          >
            {mutation.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            {mutation.isPending ? 'Resolving…' : 'Mark as Resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
