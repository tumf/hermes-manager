import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { AppShell } from '@/src/components/app-shell';
import { LocaleProvider } from '@/src/components/locale-provider';
import { TooltipProvider } from '@/src/components/ui/tooltip';

const mockUsePathname = vi.fn();
const mockSetTheme = vi.fn();
const localStorageState = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageState.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageState.set(key, String(value));
  }),
  removeItem: vi.fn((key: string) => {
    localStorageState.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageState.clear();
  }),
};

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
  }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/globals');
    mockSetTheme.mockReset();
    localStorageState.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
  });

  it('renders a sticky desktop sidebar and scrollable main pane', () => {
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <TooltipProvider>
          <AppShell>
            <div>Shell content</div>
          </AppShell>
        </TooltipProvider>
      </LocaleProvider>,
    );

    const root = container.firstElementChild;
    const aside = container.querySelector('aside');
    const main = container.querySelector('main');
    const mainInner = main?.firstElementChild;

    expect(root).toHaveClass('h-dvh', 'overflow-hidden');
    expect(aside).toHaveClass('md:sticky', 'md:top-0', 'md:h-dvh');
    expect(main).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col', 'overflow-hidden');
    expect(mainInner).toHaveClass(
      'flex',
      'h-full',
      'min-h-0',
      'flex-1',
      'flex-col',
      'w-full',
      'overflow-y-auto',
    );
    expect(screen.getByRole('link', { name: 'Globals' })).toHaveClass('bg-accent');
  });

  it('collapses desktop navigation to an icon rail and restores from localStorage', async () => {
    const user = userEvent.setup();

    const { container, unmount } = render(
      <LocaleProvider initialLocale="en">
        <TooltipProvider>
          <AppShell>
            <div>Shell content</div>
          </AppShell>
        </TooltipProvider>
      </LocaleProvider>,
    );

    const collapseButton = await screen.findByRole('button', { name: 'Collapse sidebar' });
    await user.click(collapseButton);

    await waitFor(() => {
      const aside = container.querySelector('aside');
      expect(aside).toHaveClass('md:w-20');
      expect(window.localStorage.getItem('hermes-desktop-sidebar-collapsed')).toBe('true');
    });

    expect(screen.getByRole('link', { name: 'Globals' })).toHaveAttribute('aria-label', 'Globals');

    unmount();

    const rerendered = render(
      <LocaleProvider initialLocale="en">
        <TooltipProvider>
          <AppShell>
            <div>Shell content</div>
          </AppShell>
        </TooltipProvider>
      </LocaleProvider>,
    );

    await waitFor(() => {
      const aside = rerendered.container.querySelector('aside');
      expect(aside).toHaveClass('md:w-20');
    });

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });
});
