export function transformResourceUrl(url: string): string {
  if (!url) return url;
  
  const gcsPrefix = 'https://storage.googleapis.com/';
  if (url.startsWith(gcsPrefix)) {
    const afterPrefix = url.substring(gcsPrefix.length);
    const parts = afterPrefix.split('/');
    if (parts.length > 1) {
      const filePath = parts.slice(1).join('/');
      return `/api/resources/view?file=${encodeURIComponent(filePath)}`;
    }
  }
  return url;
}
