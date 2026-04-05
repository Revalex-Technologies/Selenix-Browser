export interface IFaviconCandidate {
  url?: string | null;
  rel?: string;
  type?: string;
  sizes?: string;
  purpose?: string;
  source?: 'electron' | 'link' | 'manifest' | 'meta' | 'fallback';
}

const COMMON_FAVICON_CANDIDATES: IFaviconCandidate[] = [
  { url: '/favicon.ico', rel: 'icon', source: 'fallback' },
  { url: '/favicon.svg', rel: 'icon', source: 'fallback' },
  { url: '/favicon.png', rel: 'icon', source: 'fallback' },
  {
    url: '/apple-touch-icon.png',
    rel: 'apple-touch-icon',
    source: 'fallback',
  },
  {
    url: '/apple-touch-icon-precomposed.png',
    rel: 'apple-touch-icon-precomposed',
    source: 'fallback',
  },
];

const BLOCKED_PROTOCOLS = new Set(['about:', 'javascript:']);

const tryCreateUrl = (value: string, base?: string) => {
  try {
    return base ? new URL(value, base) : new URL(value);
  } catch {
    return null;
  }
};

const getLargestSize = (sizes?: string): number => {
  if (!sizes) {
    return 0;
  }

  if (sizes.toLowerCase().includes('any')) {
    return 1024;
  }

  return sizes
    .split(/\s+/)
    .map((entry) => {
      const match = entry.match(/^(\d+)x(\d+)$/i);

      if (!match) {
        return 0;
      }

      return Math.max(Number(match[1]), Number(match[2]));
    })
    .reduce((largest, current) => Math.max(largest, current), 0);
};

const inferTypeFromUrl = (value?: string): string => {
  const parsed = value ? tryCreateUrl(value) : null;
  const pathname = parsed?.pathname?.toLowerCase() || value?.toLowerCase() || '';

  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.ico')) return 'image/x-icon';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.avif')) return 'image/avif';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg'))
    return 'image/jpeg';

  return '';
};

const scoreFaviconCandidate = (candidate: IFaviconCandidate): number => {
  const rel = candidate.rel?.toLowerCase() || '';
  const purpose = candidate.purpose?.toLowerCase() || '';
  const type = (candidate.type || inferTypeFromUrl(candidate.url)).toLowerCase();
  const size = getLargestSize(candidate.sizes);

  let score = 0;

  if (candidate.source === 'electron') score += 120;
  if (candidate.source === 'link') score += 90;
  if (candidate.source === 'manifest') score += 70;
  if (candidate.source === 'meta') score += 50;
  if (candidate.source === 'fallback') score += 10;

  if (rel.includes('apple-touch-icon-precomposed')) score += 100;
  else if (rel.includes('apple-touch-icon')) score += 95;
  else if (rel.includes('shortcut icon')) score += 90;
  else if (/\bicon\b/.test(rel)) score += 85;
  else if (rel.includes('mask-icon')) score += 45;
  else if (rel.includes('fluid-icon')) score += 35;

  if (type.includes('svg')) score += 60;
  else if (type.includes('png')) score += 50;
  else if (type.includes('icon')) score += 45;
  else if (type.includes('webp')) score += 40;
  else if (type.includes('avif')) score += 35;
  else if (type.includes('gif')) score += 25;
  else if (type.includes('jpeg')) score += 20;

  if (purpose.includes('any')) score += 20;
  if (purpose.includes('maskable')) score += 12;

  score += Math.min(size, 512) / 4;

  return score;
};

export const isDataUrl = (value?: string): boolean =>
  !!value && value.startsWith('data:');

export const isFetchableFaviconUrl = (value?: string): boolean => {
  const parsed = value ? tryCreateUrl(value) : null;

  return !!parsed && ['http:', 'https:'].includes(parsed.protocol);
};

export const isRenderableFaviconUrl = (value?: string): boolean => {
  if (isDataUrl(value)) {
    return true;
  }

  const parsed = value ? tryCreateUrl(value) : null;

  return !!parsed && !BLOCKED_PROTOCOLS.has(parsed.protocol);
};

export const faviconFallbackForUrl = (
  pageUrl?: string,
  size = 64,
): string => {
  const parsed = pageUrl ? tryCreateUrl(pageUrl) : null;

  if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
    return '';
  }

  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(parsed.toString())}&sz=${size}`;
};

export const resolveFaviconUrl = (
  favicon?: string,
  cache?: Map<string, string>,
  pageUrl?: string,
): string => {
  if (!favicon) {
    return faviconFallbackForUrl(pageUrl);
  }

  if (isDataUrl(favicon)) {
    return favicon;
  }

  const cached = cache?.get(favicon);

  if (cached) {
    return cached;
  }

  if (!isRenderableFaviconUrl(favicon)) {
    return faviconFallbackForUrl(pageUrl);
  }

  return favicon;
};

export const normalizeFaviconCandidateUrl = (
  pageUrl: string,
  candidate?: string | null,
): string => {
  const trimmed = candidate?.trim();

  if (!trimmed) {
    return '';
  }

  if (isDataUrl(trimmed)) {
    return trimmed;
  }

  const resolved = tryCreateUrl(trimmed, pageUrl) || tryCreateUrl(trimmed);

  if (!resolved || BLOCKED_PROTOCOLS.has(resolved.protocol)) {
    return '';
  }

  return resolved.toString();
};

export const getFaviconCandidates = (
  pageUrl: string,
  candidates: IFaviconCandidate[] = [],
): IFaviconCandidate[] => {
  const merged = new Map<string, IFaviconCandidate & { score: number }>();
  const normalizedCandidates = candidates.concat(COMMON_FAVICON_CANDIDATES);

  normalizedCandidates.forEach((candidate) => {
    const url = normalizeFaviconCandidateUrl(pageUrl, candidate.url);

    if (!url) {
      return;
    }

    const normalizedCandidate = {
      ...candidate,
      url,
      type: candidate.type || inferTypeFromUrl(url),
    };
    const score = scoreFaviconCandidate(normalizedCandidate);
    const existing = merged.get(url);

    if (!existing || score > existing.score) {
      merged.set(url, { ...normalizedCandidate, score });
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...candidate }) => candidate);
};
