import { render, screen } from '@testing-library/react';

// #154: the button block's variants are classes; whatever the variant and size, the
// element stays a real button found by its name (nothing in the classes changes that).
test.each(['btn-primary', 'btn-secondary', 'btn-danger', 'btn-link'])('%s is a button named by its text, in both sizes', (variant) => {
  render(<><button type="button" className={variant}>Save</button><button type="button" className={`${variant} btn-sm`}>Save small</button></>);
  expect(screen.getByRole('button', { name: 'Save' })).toHaveClass(variant);
  expect(screen.getByRole('button', { name: 'Save small' })).toHaveClass('btn-sm');
});
