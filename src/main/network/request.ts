import * as http from 'http';
import * as https from 'https';
import { ResponseDetails } from '~/common/rpc/network';

const DEFAULT_HEADERS: http.OutgoingHttpHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.8',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

export const requestURL = (
  url: string,
  redirects = 0,
): Promise<ResponseDetails> =>
  new Promise((resolve, reject) => {
    let requestUrl: URL;

    try {
      requestUrl = new URL(url);
    } catch {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    if (!['http:', 'https:'].includes(requestUrl.protocol)) {
      reject(
        new Error(
          `Unsupported protocol for requestURL: ${requestUrl.protocol}`,
        ),
      );
      return;
    }

    const requester = requestUrl.protocol === 'https:' ? https : http;

    const req = requester.request(
      requestUrl,
      { headers: DEFAULT_HEADERS },
      (res) => {
        // Handle redirects manually
        const status = res.statusCode || 0;
        if (
          [301, 302, 303, 307, 308].includes(status) &&
          res.headers.location &&
          redirects < 5
        ) {
          // Consume and ignore body before following redirect
          res.resume();
          const next = new URL(
            String(res.headers.location),
            requestUrl,
          ).toString();
          requestURL(next, redirects + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks: Buffer[] = [];

        res.on('data', (chunk) =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
        );
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({
            statusCode: status,
            data: buf.toString('binary'),
            headers: res.headers,
          });
        });
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.end();
  });
