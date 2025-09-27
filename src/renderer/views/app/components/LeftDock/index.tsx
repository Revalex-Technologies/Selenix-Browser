import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';

import { observer } from 'mobx-react-lite';
import * as React from 'react';
import store from '../../store';
import { StyledLeftDock, TabsColumn, AddTabColumn } from './style';
import { Tabs } from '../Tabs';

import { TabGroups } from '../Tabbar';

import { ICON_ADD } from '~/renderer/constants/icons';
import { ipcRenderer } from 'electron';

const onAddTabClick = () => {
  try {
    store.tabs.addTab();
  } catch (e) {
    try {
      (window as any).electron?.ipcRenderer?.send?.(
        `add-tab-${store.windowId}`,
        {},
      );
    } catch {}
  }
};

export const LeftDock = observer(() => {
  if (store.isCompact || !store.settings.object.leftDockTabs) return null;
  return (
    <StyledLeftDock id="left-dock">
      <TabsColumn
        id="left-dock-tabs"
        ref={store.tabs.containerRef}
        style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}
      >
        <TabGroups />
        <Tabs />
      </TabsColumn>
      <AddTabColumn icon={ICON_ADD} onClick={onAddTabClick} />
    </StyledLeftDock>
  );
});
