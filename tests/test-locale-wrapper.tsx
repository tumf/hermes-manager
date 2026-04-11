import type { ReactNode } from 'react';

import { LocaleProvider } from '@/src/components/locale-provider';

export function TestLocaleWrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
