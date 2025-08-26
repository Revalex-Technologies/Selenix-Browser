import styled from 'styled-components';

export const Buttons = styled.div`
  display: flex;
  align-items: center;
  margin-right: 4px;
  padding-right: ${({ theme }: { theme?: any }) => (theme?.isCompact ? 'var(--overlay-right-inset, 0px)' : '0px')};
  padding-left: ${({ theme }: { theme?: any }) => (theme?.isCompact ? 'var(--overlay-left-inset, 0px)' : '0px')};
  position: relative;
`;

export const Separator = styled.div`
  height: 16px;
  width: 1px;
  margin-left: 4px;
  margin-right: 4px;
  opacity: 0.12;
  background: currentColor;
`;


export const ExtensionsWrapper = styled.div<{present?: boolean}>`
  display: flex;
  align-items: center;
  /* Add a tiny bit of breathing room between the address bar and first extension icon */
  margin-left: ${p => (p.present ? '6px' : '0')};
`;
