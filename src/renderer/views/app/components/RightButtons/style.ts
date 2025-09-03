import styled from 'styled-components';

export const Buttons = styled.div`
  display: flex;
  align-items: center;
  margin-right: 4px;
  padding-right: ${({ theme }: { theme?: any }) => (theme?.isCompact ? 'var(--overlay-reserved-right, 120px)' : '0px')};
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

  -webkit-app-region: no-drag;

  margin-left: ${({present, theme}: {present?: boolean; theme?: any}) => (theme?.isCompact ? '0' : (present ? '6px' : '0'))};
`;
