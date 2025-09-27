
import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';

export const Container = styled.div`
  position: absolute;
  top: 48px;
  right: 48px;
  width: 320px;
  border-radius: 12px;
  background-color: ${({ theme }: { theme?: ITheme }) =>
    theme && theme['dialog.backgroundColor'] ? theme['dialog.backgroundColor'] : '#fff'};
  box-shadow: 0 12px 32px rgba(0,0,0,0.25);
  overflow: hidden;
`;

export const Title = styled.div`
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
`;

export const Label = styled.div.withConfig({ shouldForwardProp: (p) => p !== 'visible' })<{ visible?: boolean }>`
  padding: 16px;
  ${({ theme }: { theme?: ITheme; visible?: boolean }) => css`
    color: ${theme && theme['dialog.lightForeground'] ? '#fff' : '#000'};
  `}
`;

export const StyledApp = styled(Container).withConfig({ shouldForwardProp: (p) => p !== '$visible' })<{ $visible?: boolean }>`
  ${({ $visible = true }) => css`
    display: ${$visible ? 'block' : 'none'};
  `}
`;
export const Buttons = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
export const Spacer = styled.div`
  flex: 1;
`;
