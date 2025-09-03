import styled, { css } from 'styled-components';
import { platform } from 'os';

import { ToolbarButton } from '../ToolbarButton';
import {
  TOOLBAR_BUTTON_WIDTH,
  ADD_TAB_BUTTON_WIDTH,
  ADD_TAB_BUTTON_HEIGHT,
} from '~/constants/design';
import { ITheme } from '~/interfaces';

export const StyledTabbar = styled.div`
  height: 100%;
  flex: 1;
  min-width: 0;
  position: relative;
  padding-right: ${({ theme }: { theme?: any }) => (
    theme?.isCompact
      ? 'calc(max(var(--right-buttons-width, 0px), var(--overlay-reserved-right, 120px)) + 8px)'
      : 'calc(var(--overlay-right-inset, 0px) + 16px)'
  )};
  padding-left: ${({ theme }: { theme?: any }) => (theme?.isCompact ? '0px' : 'var(--overlay-left-inset, 0px)') };

  overflow: hidden;
  align-items: center;
  margin-right: ${({ theme }: { theme?: any }) => (theme?.isCompact ? '0px' : '0px')};
  display: flex;
  margin-left: 4px;
`;

export const TabsContainer = styled.div`
  height: 100%;
  width: ${({ theme }: { theme?: any }) =>
    (theme?.isCompact
      ? 'calc(100% - max(var(--right-buttons-width, 0px), var(--overlay-reserved-right, 120px)) - 8px)'
      : `calc(100% - ${TOOLBAR_BUTTON_WIDTH}px - 16px)`)};
  min-width: 0;
  position: relative;
  padding-right: ${({ theme }: { theme?: any }) => (
    theme?.isCompact
      ? 'calc(max(var(--right-buttons-width, 0px), var(--overlay-reserved-right, 120px)) + 8px)'
      : 'calc(var(--overlay-right-inset, 0px) + 16px)'
  )};
  padding-left: ${({ theme }: { theme?: any }) => (theme?.isCompact ? '0px' : 'var(--overlay-left-inset, 0px)') };

  overflow: hidden;
  overflow-x: overlay;
  white-space: nowrap;

  &::-webkit-scrollbar {
    height: 0px;
    display: none;
    background-color: transparent;
    opacity: 0;
  }
`;

export const AddTab = styled(ToolbarButton)`
  position: absolute;
  left: ${({ theme }: { theme?: any }) => (theme?.isCompact ? '0px' : 'var(--overlay-left-inset, 0px)')};
  min-width: ${ADD_TAB_BUTTON_WIDTH}px;
  height: ${ADD_TAB_BUTTON_HEIGHT}px;

  ${({ theme }: { theme: ITheme }) => css`
    top: ${theme.isCompact ? 'auto' : theme.tabMarginTop + 2}px;
  `};
`;
