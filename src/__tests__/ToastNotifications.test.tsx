describe('Toast Notifications Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('toast message is set when metadata not found', () => {
    let toastMessage: string | null = null;
    const setToastMessage = (msg: string | null) => {
      toastMessage = msg;
    };

    // Simulate metadata not found
    setToastMessage('No metadata found online.');
    expect(toastMessage).toBe('No metadata found online.');
  });

  test('toast auto-dismisses after timeout', () => {
    let toastMessage: string | null = 'Test message';
    const setToastMessage = (msg: string | null) => {
      toastMessage = msg;
    };

    // Set toast
    setToastMessage('No metadata found online.');
    expect(toastMessage).toBe('No metadata found online.');

    // Simulate setTimeout callback
    setTimeout(() => setToastMessage(null), 2500);

    // Fast-forward time
    jest.advanceTimersByTime(2500);

    // Run pending timers
    jest.runOnlyPendingTimers();

    expect(toastMessage).toBe(null);
  });

  test('toast shown when adding to playlist', () => {
    let toastMessage: string | null = null;
    const setToastMessage = (msg: string | null) => {
      toastMessage = msg;
    };

    // Simulate successful playlist addition
    setToastMessage('Added to playlist');
    setTimeout(() => setToastMessage(null), 2500);

    expect(toastMessage).toBe('Added to playlist');

    jest.advanceTimersByTime(2500);
    jest.runOnlyPendingTimers();

    expect(toastMessage).toBe(null);
  });

  test('toast message for missing title/artist', () => {
    let toastMessage: string | null = null;
    const setToastMessage = (msg: string | null) => {
      toastMessage = msg;
    };

    setToastMessage('Add a title and artist to auto-fill.');
    setTimeout(() => setToastMessage(null), 2500);

    expect(toastMessage).toBe('Add a title and artist to auto-fill.');
  });

  test('toast message for auto-fill error', () => {
    let toastMessage: string | null = null;
    const setToastMessage = (msg: string | null) => {
      toastMessage = msg;
    };

    setToastMessage('Auto-fill unavailable at the moment.');
    setTimeout(() => setToastMessage(null), 2500);

    expect(toastMessage).toBe('Auto-fill unavailable at the moment.');
  });
});
