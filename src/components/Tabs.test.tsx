import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const TABS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

function Demo() {
  const [value, setValue] = useState('a');
  return (
    <Tabs label="Sections" tabs={TABS} value={value} onChange={setValue}>
      <p>Content of {value}</p>
    </Tabs>
  );
}

test('the tab list is named, and the selected tab shows its panel', () => {
  render(<Demo />);
  expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
  const alpha = screen.getByRole('tab', { name: 'Alpha' });
  expect(alpha).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'false');
  const panel = screen.getByRole('tabpanel', { name: 'Alpha' });
  expect(panel).toHaveTextContent('Content of a');
  expect(alpha).toHaveAttribute('aria-controls', panel.id);
});

test('clicking a tab selects it', () => {
  render(<Demo />);
  fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
  expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Beta' })).toHaveTextContent('Content of b');
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
});

test('only the selected tab is in the Tab order', () => {
  render(<Demo />);
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '0');
  expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('tabindex', '-1');
  expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('tabindex', '-1');
});

test('arrow keys move between tabs and wrap around, moving focus too', () => {
  render(<Demo />);
  const alpha = screen.getByRole('tab', { name: 'Alpha' });
  alpha.focus();
  fireEvent.keyDown(alpha, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Beta' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Beta' }), { key: 'ArrowLeft' });
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Alpha' }), { key: 'ArrowLeft' });
  expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Gamma' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
});

test('Home and End jump to the first and last tab', () => {
  render(<Demo />);
  const alpha = screen.getByRole('tab', { name: 'Alpha' });
  fireEvent.keyDown(alpha, { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Gamma' }), { key: 'Home' });
  expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
});
