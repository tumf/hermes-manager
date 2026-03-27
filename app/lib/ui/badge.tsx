import React from 'react';

import { cn } from '../utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'muted';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'success' && 'bg-green-100 text-green-800',
        variant === 'muted' && 'bg-gray-100 text-gray-600',
        variant === 'default' && 'bg-blue-100 text-blue-800',
        className,
      )}
    >
      {children}
    </span>
  );
}
