
import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { ToolbarButton } from '../ToolbarButton';
import { TOOLBAR_HEIGHT } from '~/constants/design';

export const StyledLeftDock = styled.div`
  position: absolute;
  top: ${TOOLBAR_HEIGHT}px;
  left: 0;
  bottom: 0;
  width: 300px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid rgba(0,0,0,0.1);
  transition: width 0.2s ease;
  z-index: 50;

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


/* --- LeftDock visibility/layout fixes ---
   - Position the dock below the toolbar/titlebar using VIEW_Y_OFFSET
   - Avoid flex min-size clipping the first tab by forcing min-height:0 on scroll container
   - Ensure vertical scroll and proper box sizing
*/
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
