import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';

const renderLeftDockChildren = () => {
  const elements: React.ReactNode[] = [];
  const tabs = store.tabs.list;
  let i = 0;

  const openGroupEditor = (groupId: number, anchor: {x:number,y:number}) => {
  const group = store.tabGroups.getGroupById(groupId);
  if (!group) return;
  ipcRenderer.send(`show-tabgroup-dialog-${store.windowId}`, {
    name: group.name,
    id: group.id,
    x: Math.floor(anchor.x),
    y: Math.floor(anchor.y),
  });
};

  while (i < tabs.length) {
    const t = tabs[i];
    const gid = t.tabGroupId ?? -1;

    if (gid === -1) {
      elements.push(<Tab key={t.id} tab={t} />);
      i += 1;
      continue;
    }

    // collect run
    const start = i;
    const color = store.tabGroups?.getGroupById(gid)?.color;
    const name = store.tabGroups?.getGroupById(gid)?.name ?? '';

    while (i < tabs.length && (tabs[i].tabGroupId ?? -1) === gid) i += 1;
    const run = tabs.slice(start, i);

    elements.push(
      <GroupBox key={`g-${gid}-${start}`} data-group-id={gid}>
        <GroupHeader>
          <GroupDot
            aria-label="Edit group color"
            onClick={(e) => {
              e.stopPropagation();
              openGroupEditor(gid, { x: (e as any).clientX, y: (e as any).clientY });
            }}
            style={{ backgroundColor: color }}
          />
          <span className="title">{name}</span>
        </GroupHeader>
        <GroupContent>
          {run.map(rt => <Tab key={rt.id} tab={rt} />)}
        </GroupContent>
      </GroupBox>
    );
  }

  return elements;
};

import { observer } from 'mobx-react-lite';
import * as React from 'react';
import store from '../../store';
import { StyledLeftDock, TabsColumn, AddTabColumn } from './style';
import Tab from '../Tab';
import { GroupBox, GroupHeader, GroupDot, GroupContent } from './style';


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
    <StyledLeftDock id="left-dock" bookmarkBarVisible={store.settings.object.bookmarksBar}>
      <TabsColumn
        id="left-dock-tabs"
        ref={store.tabs.containerRef}
        style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}
      >
        
        {renderLeftDockChildren()}
      </TabsColumn>
      <AddTabColumn icon={ICON_ADD} onClick={onAddTabClick} />
    </StyledLeftDock>
  );
});