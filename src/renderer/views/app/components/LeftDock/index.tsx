
import { observer } from 'mobx-react-lite';
import * as React from 'react';
import store from '../../store';
import { StyledLeftDock, TabsColumn, AddTabColumn } from './style';
import { Tabs } from '../Tabs';
import { TabsContainer } from '../Tabbar/style';
import { TabGroups } from '../Tabbar';
import { AddTab } from '../Tabbar/style';

import { ICON_ADD } from '~/renderer/constants/icons';
import { ipcRenderer } from 'electron';

const onAddTabClick = () => {
  ipcRenderer.send(`create-tab-${store.windowId}`);
};

export const LeftDock = observer(() => {
  if (store.isCompact || !store.settings.object.leftDockTabs) return null;
  return (
    <StyledLeftDock id="left-dock">
      <TabsContainer
        ref={store.tabs.containerRef} style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}
      >
        <TabGroups />
        <Tabs />
      </TabsContainer>
      <AddTabColumn icon={ICON_ADD} onClick={onAddTabClick} />
    </StyledLeftDock>
  );
});
