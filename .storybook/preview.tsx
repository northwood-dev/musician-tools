import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/index.css';
import { APP_BACKGROUND } from '../src/constants/appBackground';

// Stories render on the app's own backdrop, and the toolbar's theme switch toggles the
// `dark` class on <html>, exactly like the header's theme button, so a block looks here
// as it does in the app, in both modes.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div className={`min-h-screen p-6 ${APP_BACKGROUND}`}>
        <Story />
      </div>
    ),
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
      parentSelector: 'html',
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    // Fail loudly in the a11y panel rather than only warn: these blocks exist for #27, #37,
    // #38 and #145's accessibility work.
    a11y: { test: 'error' },
  },
};

export default preview;
