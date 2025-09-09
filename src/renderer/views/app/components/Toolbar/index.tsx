import { observer } from 'mobx-react-lite';
import * as React from 'react';

import { StyledToolbar } from './style';
import { NavigationButtons } from '../NavigationButtons';
import { DockLeftButton } from '../DockLeftButton';

import { AddressBar } from '../AddressBar';
import { RightButtons } from '../RightButtons';
import { WindowsControls } from 'react-windows-controls';
import store from '../../store';

const noDragStyle: React.CSSProperties & { WebkitAppRegion?: 'no-drag' | 'drag' } = {
  marginLeft: 'auto',
  WebkitAppRegion: 'no-drag',
  display: 'flex',
  alignItems: 'center',
};


export const Toolbar = observer(() => {
  return (
    <StyledToolbar docked={store.settings.object.leftDockTabs} style={{ paddingRight: store.settings.object.leftDockTabs ? 140 : 0 }}>
      {!store.isCompact && store.settings.object.leftDockTabs && <DockLeftButton />}
      <NavigationButtons />
      <AddressBar />
      <RightButtons />
          {store.settings.object.leftDockTabs && !store.isCompact && (
        <div style={noDragStyle}>
          <WindowsControls
            style={{ height: 32 }}
            onClose={() => window.require('electron').ipcRenderer.send(`window-close-${store.windowId}`)}
            onMinimize={() => window.require('electron').ipcRenderer.send(`window-minimize-${store.windowId}`)}
            onMaximize={() => window.require('electron').ipcRenderer.send(`window-toggle-maximize-${store.windowId}`)}
            dark={store.theme['toolbar.lightForeground']}
          />
        </div>
      )}
    </StyledToolbar>
  );
});
