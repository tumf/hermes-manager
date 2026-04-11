import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { AgentEnvTab } from '../../src/components/agent-env-tab';
import { DialogFooter } from '../../src/components/ui/dialog';
import { buildGetEnvRoute, buildPostEnvRoute, createEnvState } from '../helpers/env-helpers';
import { createFetchRouter } from '../helpers/fetch-router';

function mockFetch() {
  const state = createEnvState();
  return createFetchRouter([buildGetEnvRoute('alpha', state), buildPostEnvRoute()]);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AgentEnvTab', () => {
  it('renders masked secure value and keeps secure selected in edit dialog', async () => {
    global.fetch = mockFetch();

    render(<AgentEnvTab name="alpha" />);

    expect(await screen.findByText('API_KEY')).toBeInTheDocument();
    expect(screen.getByText('***')).toBeInTheDocument();
    expect(screen.getAllByText('secure').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /edit API_KEY/i }));

    const dialog = await screen.findByRole('dialog');
    const visibilitySelect = within(dialog).getByLabelText('Visibility') as HTMLSelectElement;
    expect(visibilitySelect.value).toBe('secure');
  });

  it('DialogFooter keeps a separated non-scrolling action bar layout', () => {
    const { container } = render(
      <DialogFooter>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </DialogFooter>,
    );

    expect(container.firstChild).toHaveClass('shrink-0');
    expect(container.firstChild).toHaveClass('border-t');
    expect(container.firstChild).not.toHaveClass('sticky');
  });
});
