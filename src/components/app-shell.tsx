'use client';

import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Languages,
  Menu,
  Moon,
  Sun,
  ToyBrick,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import React, { useEffect, useMemo, useState } from 'react';

import { useLocale } from '@/src/components/locale-provider';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/src/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/src/lib/i18n';
import { cn } from '@/src/lib/utils';

type NavKey = 'agents' | 'globals' | 'templates' | 'partials';

const DESKTOP_SIDEBAR_STORAGE_KEY = 'hermes-desktop-sidebar-collapsed';

const navItems: { href: string; key: NavKey; icon: typeof Bot }[] = [
  { href: '/', key: 'agents', icon: Bot },
  { href: '/globals', key: 'globals', icon: Globe },
  { href: '/templates', key: 'templates', icon: FileText },
  { href: '/partials', key: 'partials', icon: ToyBrick },
];

function NavLinks({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const label = t.appShell.nav[item.key];
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-label={collapsed ? label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
              collapsed && 'justify-center px-2',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className={cn(collapsed && 'sr-only')}>{label}</span>
          </Link>
        );

        if (!collapsed) {
          return link;
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [desktopSidebarReady, setDesktopSidebarReady] = useState(false);
  const pathname = usePathname();
  const { t } = useLocale();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setDesktopCollapsed(localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === 'true');
    } catch {
      setDesktopCollapsed(false);
    } finally {
      setDesktopSidebarReady(true);
    }
  }, []);

  useEffect(() => {
    if (!desktopSidebarReady) return;
    try {
      localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, desktopCollapsed ? 'true' : 'false');
    } catch {
      // noop
    }
  }, [desktopCollapsed, desktopSidebarReady]);

  const desktopSidebarLabel = useMemo(
    () => (desktopCollapsed ? t.appShell.expandSidebar : t.appShell.collapseSidebar),
    [desktopCollapsed, t.appShell.collapseSidebar, t.appShell.expandSidebar],
  );

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden md:flex-row">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 md:sticky md:top-0 md:flex md:h-dvh md:flex-col',
          desktopCollapsed ? 'md:w-20' : 'md:w-64',
          !desktopSidebarReady && 'md:transition-none',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-border px-2',
            desktopCollapsed ? 'justify-center' : 'justify-between gap-2 px-3',
          )}
        >
          <div
            className={cn('flex min-w-0 items-center gap-2', desktopCollapsed && 'justify-center')}
          >
            <Bot className="size-5 shrink-0 text-primary" />
            <span
              className={cn(
                'truncate text-sm font-semibold tracking-tight',
                desktopCollapsed && 'sr-only',
              )}
            >
              {t.appShell.brand}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                aria-label={desktopSidebarLabel}
                onClick={() => setDesktopCollapsed((value) => !value)}
              >
                {desktopCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronLeft className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{desktopSidebarLabel}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <NavLinks collapsed={desktopCollapsed} />
        </div>
        <div
          className={cn(
            'flex border-t border-border p-4',
            desktopCollapsed ? 'flex-col items-center gap-2 px-2' : 'items-center gap-1',
          )}
        >
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9" aria-label={t.appShell.openMenu}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex h-full flex-col">
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

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
