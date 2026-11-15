import { render, screen, fireEvent } from '@testing-library/react';
import { Chip, RemovableChip, ToggleChip, Tag } from './Chip';

test('a removable chip is named "Remove {label}" and removes on click; the ✕ is decorative', () => {
  const onRemove = jest.fn();
  render(<RemovableChip label="Rock" onRemove={onRemove} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Rock' }));
  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: /✕/ })).toBeNull();
});

test('a removable chip can carry its own name and title', () => {
  render(<RemovableChip label="Jazz" onRemove={() => {}} ariaLabel="Jazz, being removed — click to keep" title="Jazz" />);
  expect(screen.getByRole('button', { name: 'Jazz, being removed — click to keep' })).toHaveAttribute('title', 'Jazz');
});

test('a removable chip can be disabled', () => {
  render(<RemovableChip label="Rock" onRemove={() => {}} disabled />);
  expect(screen.getByRole('button', { name: 'Remove Rock' })).toBeDisabled();
});

test('a toggle chip says whether it is on', () => {
  const onToggle = jest.fn();
  const { rerender } = render(<ToggleChip pressed={false} onToggle={onToggle}>Reggae</ToggleChip>);
  const chip = screen.getByRole('button', { name: 'Reggae' });
  expect(chip).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(chip);
  expect(onToggle).toHaveBeenCalledTimes(1);
  rerender(<ToggleChip pressed onToggle={onToggle}>Reggae</ToggleChip>);
  expect(screen.getByRole('button', { name: 'Reggae' })).toHaveAttribute('aria-pressed', 'true');
});

test('a static chip and a tag are plain text, not buttons', () => {
  render(<><Chip>YouTube</Chip><Tag>Draft</Tag></>);
  expect(screen.getByText('YouTube')).toBeInTheDocument();
  expect(screen.getByText('Draft')).toBeInTheDocument();
  expect(screen.queryByRole('button')).toBeNull();
});
