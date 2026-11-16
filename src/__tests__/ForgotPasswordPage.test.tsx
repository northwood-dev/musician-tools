import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import { passwordResetService } from '../services/passwordResetService';
import { ROUTER_FUTURE } from '../routerFuture';

jest.mock('../services/passwordResetService', () => ({
  passwordResetService: { requestReset: jest.fn(), reset: jest.fn() },
}));
const svc = passwordResetService as jest.Mocked<typeof passwordResetService>;

beforeEach(() => jest.clearAllMocks());

test('submitting an email shows the generic confirmation (no existence reveal)', async () => {
  svc.requestReset.mockResolvedValue(undefined);
  render(<MemoryRouter future={ROUTER_FUTURE}><ForgotPasswordPage /></MemoryRouter>);

  fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'ada@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

  await waitFor(() => expect(svc.requestReset).toHaveBeenCalledWith('ada@example.com'));
  await screen.findByText(/if an account matches/i);
  // Anti-enumeration: never confirm/deny the account.
  expect(screen.queryByText(/no account|doesn't exist|not found/i)).toBeNull();
});

test('a red error is announced at once (role="alert") (#127)', async () => {
  svc.requestReset.mockRejectedValue(new Error('Something went wrong'));
  render(<MemoryRouter future={ROUTER_FUTURE}><ForgotPasswordPage /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'ada@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
});

test('the same error twice is announced twice (a new alert each time) (#147)', async () => {
  svc.requestReset.mockRejectedValue(new Error('Something went wrong'));
  render(<MemoryRouter future={ROUTER_FUTURE}><ForgotPasswordPage /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'ada@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
  const first = await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
  await waitFor(() => expect(screen.getByRole('alert')).not.toBe(first));
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
});
