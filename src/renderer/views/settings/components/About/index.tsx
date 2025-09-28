import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  line-height: 1.6;
`;

const Versions = styled.div`
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 13px;
`;

export const About: React.FC = () => {
  const getSafeVersions = () => {
    try {
      const wv =
        typeof window !== 'undefined' && (window as any)?.versions
          ? (window as any).versions
          : null;
      if (wv) return wv as any;
    } catch {}

    const pv =
      typeof process !== 'undefined' && (process as any)?.versions
        ? (process as any).versions
        : null;

    if (pv) return pv;

    const ua =
      typeof navigator !== 'undefined' && (navigator as any)
        ? (navigator as any)
        : null;
    const result: any = {};
    try {
      const brands = (ua as any)?.userAgentData?.brands || [];
      const chromium = brands.find((b: any) => /Chrom(e|ium)/i.test(b.brand));
      if (chromium?.version) result.chrome = chromium.version;
    } catch {}
    try {
      const m = ua?.userAgent?.match(/Chrom(e|ium)\/([\d.]+)/i);
      if (m && m[2]) result.chrome = result.chrome || m[2];
    } catch {}

    return result;
  };
  const versions = getSafeVersions();
  return (
    <Wrapper>
      {' '}
      <div>
        <p>
          The Wexond team discontinued and later sold their project some time
          ago. I have always admired their work, and this repository is an
          effort to build upon it while staying within legal and licensing
          requirements. Specifically, this project is based on a commit tagged{' '}
          <strong>v5.2.0</strong> in the original repository, which included the
          GPL license file. That version can be found{' '}
          <a
            href="https://github.com/wexond/browser-base/tree/v5.2.0"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
        <p>
          As developers, many of us have attempted to compile Chromium from
          source, only to find the process extremely time-consuming and
          resource-intensive. <strong>Selenix</strong> aims to address that
          challenge by leveraging the foundation provided by Wexond’s project,
          now updated to support modern Node.js and Electron versions.
        </p>
      </div>
      <Versions>
        <div>Electron: {versions.electron || '—'}</div>
        <div>Chromium: {versions.chrome || '—'}</div>
        <div>Node.js: {versions.node || '—'}</div>
        <div>V8: {versions.v8 || '—'}</div>
      </Versions>
    </Wrapper>
  );
};
