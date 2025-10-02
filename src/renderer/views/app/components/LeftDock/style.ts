import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { BOOKMARK_BAR_HEIGHT, TOOLBAR_HEIGHT } from '~/constants/design';
import { ToolbarButton } from '../ToolbarButton';

export const StyledLeftDock = styled.div<{ bookmarkBarVisible?: boolean }>`
  position: absolute;
  top: ${({ bookmarkBarVisible }) =>
    TOOLBAR_HEIGHT + (bookmarkBarVisible ? BOOKMARK_BAR_HEIGHT - 3 : 0)}px;
  left: 0;
  bottom: 0;
  width: 300px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  transition: width 0.2s ease;
  z-index: 200;

  /* overlap any hairline under the bookmarks bar */
  margin-top: ${({ bookmarkBarVisible }) => (bookmarkBarVisible ? -2 : 0)}px;

  ${({ theme }: { theme: ITheme }) => css`
    background-color: ${theme['toolbar.backgroundColor']};
  `}
`;

export const TabsColumn = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  scrollbar-gutter: stable both-edges;
`;

export const AddTabColumn = styled(ToolbarButton)`
  pointer-events: auto;
  align-self: center;
  min-height: 32px;
  min-width: 32px;
  margin: 6px;
`;

export const LeftDockFixes = styled.div`
  /* This selector isn't rendered; it only injects CSS for the ids/classes we own */
  #left-dock-tabs {
    min-height: 0; /* allow child overflow container to shrink; fixes first-tab clipping */
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding-right: 2px; /* keep scrollbar off the content */
  }
`;

export const GroupBox = styled.div`
  border-radius: 12px;
  margin: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  overflow: hidden;
  ${({ theme }: { theme: ITheme }) => css`
    background-color: rgba(0, 0, 0, 0.04);
  `}
`;

export const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`;

export const GroupDot = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  width: 12px;
  height: 12px;
  min-width: 12px;
  min-height: 12px;
  aspect-ratio: 1 / 1;
  box-sizing: content-box;
  border-radius: 50%;
  border: 2px solid currentColor;
  background-clip: padding-box;
  cursor: pointer;
  flex: 0 0 auto;
`;

export const GroupContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 2px;
`;
