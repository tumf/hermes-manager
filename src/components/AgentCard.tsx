'use client';

import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { StatusBadge } from '@/src/components/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';

interface AgentCardProps {
  name: string;
  label: string;
  enabled: boolean;
  running?: boolean;
  onStartStop: (action: 'start' | 'stop') => void;
  onCopy: () => void;
  onDelete: () => void;
}

export function AgentCard({
  name,
  label,
  enabled,
  running,
  onStartStop,
  onCopy,
  onDelete,
}: AgentCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="truncate text-base font-semibold">{name}</CardTitle>
        <StatusBadge status={running ? 'running' : 'stopped'} />
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <Badge variant={enabled ? 'secondary' : 'muted'} className="text-xs">
          {enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </CardContent>
      <CardFooter className="gap-2">
        {running ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={() => onStartStop('stop')}
          >
            Stop
          </Button>
        ) : (
          <Button size="sm" className="min-h-10" onClick={() => onStartStop('start')}>
            Start
          </Button>
        )}
        <Button variant="outline" size="sm" className="min-h-10" asChild>
          <Link href={`/agents/${encodeURIComponent(name)}`}>Manage</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto min-h-10"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The agent will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
