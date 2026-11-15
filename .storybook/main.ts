import type { StorybookConfig } from '@storybook/react-vite';

// #152 — the design pass's demo (#141): every shared building block in every state,
// next to its component (`*.stories.tsx`). `npm run storybook` serves it locally; it is
// never deployed. It reuses the app's Vite config, so Tailwind and the app CSS apply.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-a11y', // accessibility checks on every story (roles, names, contrast)
    '@storybook/addon-themes', // light / dark switch, same `dark` class as the app
  ],
  framework: { name: '@storybook/react-vite', options: {} },
};

export default config;
