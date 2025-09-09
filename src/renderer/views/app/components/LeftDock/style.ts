
import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { ToolbarButton } from '../ToolbarButton';

export const StyledLeftDock = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 248px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(0,0,0,0.1);
  transition: width 0.2s ease;
  ${({ theme }: { theme: ITheme }) => css`
    background-color: ${theme['toolbar.backgroundColor']};
  `}
`;

export const TabsColumn = styled.div`
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 6px 6px 6px 6px;
`;

export const AddTabColumn = styled(ToolbarButton)`
  min-height: 32px;
  min-width: 32px;
  margin: 6px;
`;
