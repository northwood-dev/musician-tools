import { render, screen } from '@testing-library/react';
import { LiveNotice } from './LiveNotice';

// #225: a message whose announcement region is always there (#153).
test('the region is there before any message, empty', () => {
  render(<LiveNotice tone="success">{null}</LiveNotice>);
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('the same region then holds the message', () => {
  const { rerender } = render(<LiveNotice tone="success">{null}</LiveNotice>);
  const region = screen.getByRole('status');
  rerender(<LiveNotice tone="success">"Wonderwall" rejected.</LiveNotice>);
  expect(screen.getByRole('status')).toBe(region);
  expect(region).toHaveTextContent('"Wonderwall" rejected.');
});

test('an error is an alert', () => {
  render(<LiveNotice tone="error">Could not reject.</LiveNotice>);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not reject.');
});

test('the announcement can be overridden, and the region named', () => {
  render(<LiveNotice tone="warning" announce="alert" label="Songs and topics error">Menus may be incomplete.</LiveNotice>);
  expect(screen.getByRole('alert', { name: 'Songs and topics error' })).toHaveTextContent('Menus may be incomplete.');
});

test('the box itself is not a second live region', () => {
  render(<LiveNotice tone="error">Boom</LiveNotice>);
  expect(screen.getAllByRole('alert')).toHaveLength(1);
});

test('an action sits in the box', () => {
  render(<LiveNotice tone="error" action={<button type="button">Retry</button>}>Boom</LiveNotice>);
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});

test('0 is a message, not "nothing"', () => {
  render(<LiveNotice tone="info">{0}</LiveNotice>);
  expect(screen.getByRole('status')).toHaveTextContent('0');
});
