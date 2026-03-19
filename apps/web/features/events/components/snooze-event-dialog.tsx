'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldGroup } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSnoozeAlertEvent } from '@/features/workflows/hooks/http/use-events';
import { Loader2, Moon } from 'lucide-react';
import { useState } from 'react';

const SNOOZE_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: '24 hours', value: 1440 },
] as const;

const DEFAULT_SNOOZE_MINUTES = 30;

interface SnoozeEventDialogProps {
  eventId: string;
  onSnooze: () => void;
}

export function SnoozeEventDialog({
  eventId,
  onSnooze,
}: SnoozeEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(
    DEFAULT_SNOOZE_MINUTES,
  );
  const mutation = useSnoozeAlertEvent();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Moon className="size-3.5 text-amber-500" />
          Snooze
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Snooze Alert</DialogTitle>
          <DialogDescription>
            Postpone this alert. No new duplicate events or notifications will
            be created during the snooze period.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="py-2">
          <Field>
            <Label className="text-xs font-medium">Snooze duration</Label>
            <Select
              value={String(snoozeMinutes)}
              onValueChange={(v) => setSnoozeMinutes(Number(v))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SNOOZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter showCloseButton>
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { eventId, snoozeMinutes },
                {
                  onSuccess: () => {
                    setOpen(false);
                    onSnooze();
                  },
                },
              )
            }
          >
            {mutation.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            {mutation.isPending ? 'Snoozing…' : 'Snooze Alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
