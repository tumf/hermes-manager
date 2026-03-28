'use client';

import { ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/src/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { HERMES_ENV_KEY_GROUPS } from '@/src/lib/hermes-env-keys';
import { cn } from '@/src/lib/utils';

interface EnvKeyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const LISTBOX_ID = 'env-key-suggestions';

export function EnvKeyCombobox({ value, onChange, className }: EnvKeyComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  function handleSelect(selectedKey: string) {
    onChange(selectedKey);
    setSearch('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={LISTBOX_ID}
          aria-label="Env key"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-48',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{value || 'KEY_NAME'}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search keys..." value={search} onValueChange={setSearch} />
          <CommandList id={LISTBOX_ID}>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => {
                    // Use mousedown to fire before popover closes
                    e.preventDefault();
                    handleSelect(search.trim());
                  }}
                >
                  Use &ldquo;{search.trim()}&rdquo;
                </button>
              ) : (
                'No keys found.'
              )}
            </CommandEmpty>
            {HERMES_ENV_KEY_GROUPS.map((group) => (
              <CommandGroup key={group.category} heading={group.category}>
                {group.keys.map((envKey) => (
                  <CommandItem
                    key={envKey}
                    value={envKey}
                    onSelect={() => handleSelect(envKey)}
                    className="font-mono text-xs"
                  >
                    {envKey}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
