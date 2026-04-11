'use client';

import { Bot, FileText, Globe, Languages, Menu, Moon, Sun, ToyBrick } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';

import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/src/components/ui/sheet';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/src/lib/i18n';
import { cn } from '@/src/lib/utils';

type NavKey = 'agents' | 'globals' | 'templates' | 'partials';

const navItems: { href: string; key: NavKey; icon: typeof Bot }[] = [
  { href: '/', key: 'agents', icon: Bot },
  { href: '/globals', key: 'globals', icon: Globe },
  { href: '/templates', key: 'templates', icon: FileText },
  { href: '/partials', key: 'partials', icon: ToyBrick },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {t.appShell.nav[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={t.appShell.toggleTheme}
    >
      {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={t.appShell.languageSwitcher}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc as Locale)}
            className={cn(locale === loc && 'bg-accent')}
          >
            {LOCALE_LABELS[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLocale();

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Bot className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">{t.appShell.brand}</span>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <NavLinks />
        </div>
        <div className="flex items-center gap-1 border-t border-border p-4">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9" aria-label={t.appShell.openMenu}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <div className="flex items-center gap-2 pb-6 pt-2">
              <Bot className="size-5 text-primary" />
              <span className="text-sm font-semibold">{t.appShell.brand}</span>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto flex items-center gap-1 pt-6">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center gap-2">
          <Bot className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">{t.appShell.brand}</span>
        </div>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
