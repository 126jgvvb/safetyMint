import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';

function TestComponent() {
  const {
    isAuthenticated, theme, toggleTheme,
    packages, wallet, transactions,
    loading, useApi
  } = useApp();

  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="theme">{theme}</span>
      <span data-testid="packages-count">{packages.length}</span>
      <span data-testid="wallet-main">{wallet.main}</span>
      <span data-testid="wallet-interest">{wallet.interest}</span>
      <span data-testid="transactions-count">{transactions.length}</span>
      <span data-testid="use-api">{useApi ? 'yes' : 'no'}</span>
      <button onClick={() => act(() => toggleTheme())} data-testid="toggle-theme">Toggle</button>
    </div>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial state with mock data', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('no');
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('packages-count').textContent).toBe('3');
    expect(screen.getByTestId('wallet-main').textContent).toBe('50000');
    expect(screen.getByTestId('wallet-interest').textContent).toBe('2500');
    expect(screen.getByTestId('transactions-count').textContent).toBe('3');
  });

  it('toggles theme between dark and light', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    
    await act(async () => {
      screen.getByTestId('toggle-theme').click();
    });
    
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('has useApi set to false when API is not available', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('use-api').textContent).toBe('no');
  });
});