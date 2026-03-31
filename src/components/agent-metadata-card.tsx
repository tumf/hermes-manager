import { type Dispatch, type SetStateAction } from 'react';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';

interface AgentMetadataCardProps {
  metaDraft: {
    name: string;
    description: string;
    tagsInput: string;
  };
  metaSaving: boolean;
  onMetaDraftChange: Dispatch<
    SetStateAction<{ name: string; description: string; tagsInput: string }>
  >;
  onSave: () => void;
}

export function AgentMetadataCard({
  metaDraft,
  metaSaving,
  onMetaDraftChange,
  onSave,
}: AgentMetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="meta-name" className="text-sm font-medium">
              Display Name
            </label>
            <Input
              id="meta-name"
              value={metaDraft.name}
              onChange={(e) => onMetaDraftChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="My Bot"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="meta-tags" className="text-sm font-medium">
              Tags (comma separated)
            </label>
            <Input
              id="meta-tags"
              value={metaDraft.tagsInput}
              onChange={(e) =>
                onMetaDraftChange((prev) => ({ ...prev, tagsInput: e.target.value }))
              }
              placeholder="prod, monitor"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="meta-description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="meta-description"
            value={metaDraft.description}
            onChange={(e) =>
              onMetaDraftChange((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Purpose or notes"
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={metaSaving}>
            {metaSaving ? 'Saving…' : 'Save Metadata'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
