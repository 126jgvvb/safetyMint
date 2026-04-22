import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { AppProvider } from '../context/AppContext';

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart" />,
}));

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AppProvider>
        {ui}
      </AppProvider>
    </BrowserRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with page header', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('displays active and frozen packages count', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBeGreaterThan(0);
    });

    expect(document.querySelector('.stat-card')).toHaveTextContent('Active Packages');
    expect(document.querySelector('.stat-card')).toHaveTextContent('frozen');
  });

  it('displays wallet information', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBeGreaterThan(0);
    });

    const statCards = document.querySelectorAll('.stat-card');
    const walletCard = Array.from(statCards).find(card => card.textContent.includes('Total Wallet'));
    expect(walletCard).toHaveTextContent('UGX 52,500');
  });

  it('displays total loans issued', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBeGreaterThan(0);
    });

    const statCards = document.querySelectorAll('.stat-card');
    const loansCard = Array.from(statCards).find(card => card.textContent.includes('Total Loans Issued'));
    expect(loansCard).toHaveTextContent('UGX 22,500');
  });

  it('displays pending repayments count', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBeGreaterThan(0);
    });

    const statCards = document.querySelectorAll('.stat-card');
    const repaymentsCard = Array.from(statCards).find(card => card.textContent.includes('Pending Repayments'));
    expect(repaymentsCard).toHaveTextContent('1');
  });

  it('renders performance chart', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(document.querySelector('.chart-container')).toBeInTheDocument();
    });

    expect(document.querySelector('.chart-header')).toHaveTextContent('Overall Performance');
  });

  it('renders package performance chart', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const cards = document.querySelectorAll('.card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('displays quick overview table with packages', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    const table = document.querySelector('table');
    expect(table).toHaveTextContent('Package');
    expect(table).toHaveTextContent('Status');
    expect(table).toHaveTextContent('Current Amount');
    expect(table).toHaveTextContent('Rate');
    expect(table).toHaveTextContent('Progress');
  });

  it('displays loan package financial details', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const cards = document.querySelectorAll('.card');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    const cards = document.querySelectorAll('.card');
    const financialCard = Array.from(cards).find(card => card.textContent.includes('Loan Package Financial Details'));
    expect(financialCard).toHaveTextContent('Total Principal');
    expect(financialCard).toHaveTextContent('Total Interests');
    expect(financialCard).toHaveTextContent('Interests Obtained');
    expect(financialCard).toHaveTextContent('Interests Remaining');
  });

  it('displays package rows in financial details table', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const tables = document.querySelectorAll('table');
      expect(tables.length).toBe(2);
    });

    const tables = document.querySelectorAll('table');
    const financialTable = tables[1];
    
    expect(financialTable).toHaveTextContent('Starter Loan');
    expect(financialTable).toHaveTextContent('Business Loan');
    expect(financialTable).toHaveTextContent('Premium Loan');
    expect(financialTable).toHaveTextContent('Amount Deducted');
    expect(financialTable).toHaveTextContent('Returned Successfully');
    expect(financialTable).toHaveTextContent('Interest Obtained');
  });

  it('shows status badges with correct classes', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const statusBadges = document.querySelectorAll('.status-badge');
      expect(statusBadges.length).toBeGreaterThan(0);
    });

    const activeBadge = document.querySelector('.status-active');
    const frozenBadge = document.querySelector('.status-frozen');
    
    expect(activeBadge).toHaveTextContent('active');
    expect(frozenBadge).toHaveTextContent('frozen');
  });

  it('displays progress bars for packages', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const progressBars = document.querySelectorAll('.progress-bar');
      expect(progressBars.length).toBe(3);
    });
  });
});