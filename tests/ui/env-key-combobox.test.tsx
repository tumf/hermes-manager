import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom';

import { EnvKeyCombobox } from '../../src/components/env-key-combobox';

// cmdk requires ResizeObserver and scrollIntoView which are not available in jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('EnvKeyCombobox', () => {
  it('renders with placeholder when value is empty', () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    const trigger = screen.getByRole('combobox', { name: /env key/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('KEY_NAME');
  });

  it('renders with current value when provided', () => {
    render(<EnvKeyCombobox value="OPENROUTER_API_KEY" onChange={vi.fn()} />);

    const trigger = screen.getByRole('combobox', { name: /env key/i });
    expect(trigger).toHaveTextContent('OPENROUTER_API_KEY');
  });

  it('opens dropdown when clicked and shows category groups', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));

    // Category headings should be visible
    expect(await screen.findByText('LLM Provider')).toBeInTheDocument();
    expect(screen.getByText('Tool API Keys')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
  });

  it('shows known keys in dropdown', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));

    await screen.findByText('LLM Provider');
    expect(screen.getByText('OPENROUTER_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('FIRECRAWL_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('BROWSERBASE_API_KEY')).toBeInTheDocument();
    expect(screen.getByText('Gateway: General')).toBeInTheDocument();
  });

  it('suggests Telegram keys when searching for TELEGRAM', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const searchInput = await screen.findByPlaceholderText('Search keys...');

    fireEvent.change(searchInput, { target: { value: 'TELEGRAM' } });

    expect(await screen.findByText('Gateway: Telegram')).toBeInTheDocument();
    expect(screen.getByText('TELEGRAM_BOT_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('TELEGRAM_ALLOWED_USERS')).toBeInTheDocument();
    expect(screen.getByText('TELEGRAM_HOME_CHANNEL')).toBeInTheDocument();
  });

  it('suggests Discord keys when searching for DISCORD', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const searchInput = await screen.findByPlaceholderText('Search keys...');

    fireEvent.change(searchInput, { target: { value: 'DISCORD' } });

    expect(await screen.findByText('Gateway: Discord')).toBeInTheDocument();
    expect(screen.getByText('DISCORD_BOT_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('DISCORD_ALLOWED_USERS')).toBeInTheDocument();
    expect(screen.getByText('DISCORD_HOME_CHANNEL')).toBeInTheDocument();
  });

  it('keeps existing gateway keys available under Gateway: General', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const searchInput = await screen.findByPlaceholderText('Search keys...');

    fireEvent.change(searchInput, { target: { value: 'SLACK' } });

    expect(await screen.findByText('Gateway: General')).toBeInTheDocument();
    expect(screen.getByText('SLACK_BOT_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('SLACK_APP_TOKEN')).toBeInTheDocument();
  });

  it('calls onChange when a suggestion is selected', async () => {
    const onChange = vi.fn();
    render(<EnvKeyCombobox value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    await screen.findByText('LLM Provider');

    // Click on a suggestion item
    fireEvent.click(screen.getByText('OPENROUTER_API_KEY'));

    expect(onChange).toHaveBeenCalledWith('OPENROUTER_API_KEY');
  });

  it('shows a free-input option even when partial matches remain', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const input = screen.getByPlaceholderText('Search keys...');
    fireEvent.change(input, { target: { value: 'OPEN' } });

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Use “OPEN”')).toBeInTheDocument();
    expect(within(listbox).getByText('OPENROUTER_API_KEY')).toBeInTheDocument();
  });

  it('hides the free-input option for exact known-key matches', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const input = screen.getByPlaceholderText('Search keys...');
    fireEvent.change(input, { target: { value: 'OPENROUTER_API_KEY' } });

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).queryByText('Use “OPENROUTER_API_KEY”')).not.toBeInTheDocument();
    expect(within(listbox).getByText('OPENROUTER_API_KEY')).toBeInTheDocument();
  });

  it('confirms the free-input text when pressing Enter', async () => {
    const onChange = vi.fn();
    render(<EnvKeyCombobox value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const input = screen.getByPlaceholderText('Search keys...');
    fireEvent.change(input, { target: { value: 'OPEN' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('OPEN');
  });

  it('selects the free-input option when clicked', async () => {
    const onChange = vi.fn();
    render(<EnvKeyCombobox value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));
    const input = screen.getByPlaceholderText('Search keys...');
    fireEvent.change(input, { target: { value: 'TELEGRAM' } });

    fireEvent.click(await screen.findByText('Use “TELEGRAM”'));

    expect(onChange).toHaveBeenCalledWith('TELEGRAM');
  });

  it('does not show the free-input option for blank input', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox', { name: /env key/i }));

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).queryByText(/Use “/)).not.toBeInTheDocument();
  });

  it('has aria-controls attribute referencing the listbox', () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    const trigger = screen.getByRole('combobox', { name: /env key/i });
    expect(trigger).toHaveAttribute('aria-controls', 'env-key-suggestions');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('sets aria-expanded to true when open', async () => {
    render(<EnvKeyCombobox value="" onChange={vi.fn()} />);

    const trigger = screen.getByRole('combobox', { name: /env key/i });
    fireEvent.click(trigger);

    await screen.findByText('LLM Provider');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
