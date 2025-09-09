import styled, { css } from 'styled-components';
import { ITheme } from '~/interfaces';
import { BLUE_300 } from '~/renderer/constants';

export const StyledAddressBar = styled.div`
  height: 26px;
  flex: 1;
  border-radius: 4px;
  margin: 0 7px;
  display: flex;
  align-items: center;
  position: relative;

  font-size: 15px;
  overflow: hidden;

  ${({ theme, focus }: { theme: ITheme; focus: boolean }) => css`
    background-color: ${theme['addressbar.backgroundColor']};
    border: 1px solid
      ${theme.isCompact
        ? theme['toolbar.lightForeground']
          ? 'rgba(255, 255, 255, 0.12)'
          : 'transparent'
        : focus
        ? `${BLUE_300} !important`
        : 'transparent'};
    color: ${theme['addressbar.textColor']};
    box-shadow: ${focus && !theme.isCompact
      ? `0 0 0 1px ${BLUE_300}`
      : `0px 0px 5px 0px rgba(0,0,0,0.1)`};

    ${!theme.isCompact &&
    css`
      &:hover, &:focus, &:focus-visible, &:focus-within { background-color: ${theme['toolbar.lightForeground'] ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)'} !important; } !important; }; };
      }
    `}
  `};
  
  --danger-color: #ff6b6b;
`;

export const InputContainer = styled.div`
  flex: 1;
  position: relative;
  height: 100%;
  margin-left: 2px;
  overflow: hidden;
`;

export const Text = styled.div`
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translateY(calc(-50%));
  flex: 1;
  color: inherit;
  margin-top: -1px;
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow: hidden;
  font-size: 14px;
  ${({ visible }: { visible: boolean; theme: ITheme }) => css`
    display: ${visible ? 'flex' : 'none'};
  `};
`;

export const Input = styled.input`
  outline: none;
  min-width: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  border: none;
  padding: 0;
  margin: 0;
  color: black;
  font-family: inherit;
  word-spacing: inherit;
  font-size: 14px;

  ${({ visible, theme }: { visible: boolean; theme: ITheme }) => css`
    color: ${visible ? 'inherit' : 'transparent'};

    &::placeholder {
      color: ${theme['searchBox.lightForeground']
        ? 'rgba(255, 255, 255, 0.54)'
        : 'rgba(0, 0, 0, 0.54)'};
    }

    ${theme['searchBox.lightForeground'] &&
    css`
      ::selection {
        background: rgba(145, 185, 230, 0.99);
        color: black;
        height: 100px;
      }
    `}
  `};
`;



export const SecurityButton = styled.div<{expanded?: boolean; danger?: boolean;}>`
  &:hover {
    background-color: rgba(255,255,255,0.14);
  }

  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  height: 26px;
  min-width: 34px;
  border-radius: 4px;
  margin-left: 0; /* hug the address bar edge */
  transition: 0.2s background-color, max-width 180ms ease, padding 180ms ease;
  user-select: none;
  -webkit-app-region: no-drag;
  position: relative;
  z-index: 1;
  background-clip: padding-box;
  cursor: pointer;

  ${({ theme, danger }: { theme: ITheme; danger?: boolean }) => css`
    background-color: transparent; /* transparent until hover */
    color: ${danger ? '#ff6b6b' : (theme['toolbar.lightForeground']
      ? 'rgba(255, 255, 255, 0.86)'
      : 'rgba(0, 0, 0, 0.86)')};

    &:active { background-color: ${theme['toolbar.lightForeground'] ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)'} !important; } !important; } !important; };
    }
  `};

  .icon {
    width: 16px;
    height: 16px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: 16px 16px;
    will-change: filter;
    transform: translateX(-1px); /* tiny left nudge */
  }

  .label {
    color: inherit;
    max-width: ${'${'}(p: any) => (p.expanded ? '200px' : '0')${'}'};
    overflow: hidden;
    white-space: nowrap;
    text-overflow: clip;
    transition: max-width 180ms ease;
    font-size: 12px;
  }

  &.expanded {
    /* keep footprint stable */
  }

  &.danger { color: #ff6b6b; }
  &.danger svg { filter: none; }
  &.danger svg path { fill: currentColor; }
`;
