export const songLinksService = {
  async getStreamingLinks(songUid: string): Promise<{ links: Array<{ platform: string; url: string; label: string }> }> {
    const response = await fetch(`/api/songs/${songUid}/streaming-links`);
    if (!response.ok) {
      throw new Error('Failed to fetch streaming links');
    }
    return response.json();
  }
};
