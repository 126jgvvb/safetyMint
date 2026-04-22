import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AppProvider } from '../context/AppContext';

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AppProvider>
        {ui}
      </AppProvider>
    </BrowserRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all elements', async () => {
    renderWithProviders(<Login />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Safety/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Secure Loan Management')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    renderWithProviders(<Login />);

    const form = screen.getByRole('button', { name: /Sign In/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('updates email and password fields on input', async () => {
    renderWithProviders(<Login />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('toggles password visibility', async () => {
    renderWithProviders(<Login />);

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput.type).toBe('password');

    const toggleButton = document.querySelector('.fa-eye');
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    }
  });

  it('shows forgot password link', async () => {
    renderWithProviders(<Login />);

    const forgotPasswordLink = screen.getByRole('link', { name: /Forgot Password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('shows signup link', async () => {
    renderWithProviders(<Login />);

    const signupLink = screen.getByRole('link', { name: /Sign Up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });
});