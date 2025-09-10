import styled, { css } from 'styled-components';

import { transparency, ICON_CLOSE } from '~/renderer/constants';
import { ITheme } from '~/interfaces';
import { centerIcon } from '~/renderer/mixins';
import { TAB_PINNED_WIDTH } from '../../constants';

interface CloseProps {
  visible: boolean;
  theme?: ITheme;
}

export const StyledClose = styled.div`
  height: 20px;
  width: 20px;
  margin-left: 2px;
  margin-right: 6px;
  #left-dock & { display: block !important; visibility: visible !important; opacity: 1 !important; background-image: none !important; background: transparent !important; filter: none !important; margin-left: auto !important; cursor: pointer; flex: 0 0 20px; display: flex; align-items: center; justify-content: center;}
  border-radius: 2px;
  background-image: url('${ICON_CLOSE}');
  transition: 0.1s background-color;
  z-index: 10;
  ${centerIcon(16)};
  /* Ensure the close button is always visible in left-dock mode */
  #left-dock & {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    background-image: url('${ICON_CLOSE}') !important;
    background-repeat: no-repeat !important;
    background-position: center center !important;
    background-size: 16px 16px !important;
    margin-left: auto !important;
    cursor: pointer;
    flex: 0 0 20px;
  }

  /* Fallback visual in case icon fails to load */
  #left-dock &::before { content: '×'; font-size: 16px; line-height: 1; display: block; opacity: 0.9; -webkit-font-smoothing: antialiased; }


    ${({ visible, theme }: CloseProps) => css`
      opacity: ${visible ? transparency.icons.inactive : 0};
      display: ${visible ? 'block' : 'none'};
      filter: ${theme['toolbar.lightForeground'] ? 'invert(100%)' : 'none'}; #left-dock & { filter: none !important; }
    `}

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  /* Left dock overrides: turn tabs into a vertical list when inside the left dock */
  

  ${({ theme }) => css`
    /* Left dock overrides */
    #left-dock & { position: static; width: auto; height: auto; transform: none !important; flex: 0 0 auto; }
  `};
`;


interface ActionProps {
  visible: boolean;
  icon: string;
  theme?: ITheme;
}

export const StyledAction = styled.div`
  height: 20px;
  width: 20px;
  margin-left: 2px;
  border-radius: 2px;
  transition: 0.1s background-color;
  z-index: 10;
  ${centerIcon(16)};

  ${({ visible, theme, icon }: ActionProps) => css`
      opacity: ${visible ? transparency.icons.inactive : 0};
      display: ${visible ? 'block' : 'none'};
      filter: ${theme['toolbar.lightForeground'] ? 'invert(100%)' : 'none'}; #left-dock & { filter: none !important; }
      background-image: url('${icon}');
    `}

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

interface PinActionProps {
  visible: boolean;
  icon: string;
  theme?: ITheme;
}

export const StyledPinAction = styled.div`
  height: 12px;
  width: 12px;
  border-radius: 100%;
  transition: 0.1s background-color;
  z-index: 10;
  position: fixed;
  right: 8px;
  top: 8px;
  ${centerIcon(10)};

  ${({ visible, theme, icon }: PinActionProps) => css`
      display: ${visible ? 'block' : 'none'};
      background-color: ${
        theme['toolbar.lightForeground'] ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'
      };
      background-image: url('${icon}');
    `}

  &:hover {
    filter: invert(100%);
  }
`;

interface TabProps {
  selected: boolean;
}

export const StyledTab = styled.div`
  position: absolute;
  height: 100%;
  width: 0;
  left: 0;
  will-change: width, transform;
  -webkit-app-region: no-drag;
  display: flex;
  backface-visibility: hidden;

  ${({ selected }: TabProps) => css`
    z-index: ${selected ? 2 : 1};
  `};

  /* Left dock overrides: vertical-list mode */
  #left-dock & { position: static; width: auto; height: auto; transform: none !important; flex: 0 0 auto; }
`;

interface TitleProps {
  isIcon: boolean;
  selected: boolean;
  theme?: ITheme;
}

export const StyledTitle = styled.div`
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: 0.2s margin-left;
  margin-left: 8px;
  min-width: 0;
  flex: 1;
  min-width: 0;

  ${({ isIcon, selected, theme }: TitleProps) => css`
    margin-left: ${!isIcon ? 0 : 12}px;
    color: ${selected
      ? theme['tab.selected.textColor']
      : theme['tab.textColor']};
  `};
`;

export const StyledIcon = styled.div`
  height: 16px;
  min-width: 16px;
  transition: 0.2s opacity, 0.2s min-width;
  ${centerIcon()};
  ${({ isIconSet }: { isIconSet: boolean }) => css`
    min-width: ${isIconSet ? 0 : 16},
    opacity: ${isIconSet ? 0 : 1};
  `};
`;

export const StyledContent = styled.div`
  /* ensure the trailing buttons remain visible */
  #left-dock & { overflow: visible !important; }
  gap: 6px;
  overflow: hidden;
  z-index: 2;
  align-items: center;
  display: flex;
  margin-left: 10px;
  flex: 1;
  min-width: 0;
`;

interface TabContainerProps {
  pinned: boolean;
  theme?: ITheme;
  hasTabGroup: boolean;
  selected?: boolean;
}

export const TabContainer = styled.div`
  /* ensure nothing inside gets clipped in left dock */
  #left-dock & { overflow: visible !important; }
  position: relative;

  width: 100%;
  align-items: center;
  overflow: hidden;
  display: flex;
  backface-visibility: hidden;
  transition: 0.1s background-color;
  position: relative;
  border-bottom: transparent !important;
  border: 2px solid;

  ${({ pinned, theme, hasTabGroup, selected }: TabContainerProps) => css`
    max-width: ${pinned ? `${TAB_PINNED_WIDTH}px` : '100%'};
    margin-top: ${theme.tabMarginTop}px;
    height: ${theme.tabHeight}px;
    border-radius: ${theme.isCompact && !hasTabGroup ? '4px' : 'auto'};
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    box-shadow: ${selected ? '0px 0px 6px 0px rgba(0,0,0,0.12)' : 'none'};
  `};

  ${({ theme }) => css`
    #left-dock & { max-width: 100% !important; margin-top: 0 !important; border: none !important; box-sizing: border-box; padding: 0; }
  `};

  /* Left dock overrides: list layout */
  #left-dock & { max-width: 100% !important; margin-top: 0 !important; border: none !important; box-sizing: border-box; padding: 0; }
`;


  /* Left dock overrides: list layout */
  

export const EdgeMask = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background: ${({ theme }: { theme: ITheme }) => theme['toolbar.backgroundColor']};
  left: -1px;
  pointer-events: none;
`;
