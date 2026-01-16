import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Songs from '../pages/Songs';

jest.mock('../services/songService', () => ({
  songService: {
    getAllSongs: jest.fn().mockResolvedValue([]),
    updateSong: jest.fn().mockResolvedValue({}),
    createSong: jest.fn().mockResolvedValue({}),
    deleteSong: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/instrumentService', () => ({
  instrumentService: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../services/songPlayService', () => ({
  songPlayService: {
    getPlays: jest.fn().mockResolvedValue([]),
    markPlayed: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../services/playlistService', () => ({
  playlistService: {
    getAllPlaylists: jest.fn().mockResolvedValue([]),
  },
}));

describe('Songs sidebar persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('restores collapsed state from localStorage and persists expand', async () => {
    localStorage.setItem('songsSidebarExpanded', 'false');

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Songs />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Collapse sidebar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expand sidebar'));

    await waitFor(() => expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument());
    await waitFor(() => expect(localStorage.getItem('songsSidebarExpanded')).toBe('true'));
  });
});
