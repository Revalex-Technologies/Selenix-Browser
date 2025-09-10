
import { observer } from 'mobx-react-lite';
import * as React from 'react';
import store from '../../store';
import { ToolbarButton } from '../ToolbarButton';
import { ICON_DOCKLEFT } from '~/renderer/constants/icons';
import { ipcRenderer } from 'electron';

export const DockLeftButton = observer(() => {
  if (store.isCompact) return null;

  const toggled = !!store.settings.object.leftDockTabs;

  const onClick = () => {
    store.settings.object.leftDockTabs = !toggled;
    store.settings.save();
    // trigger bounds recompute
    ipcRenderer.send('resize-height');
    // also trigger a renderer resize so tab layout updates immediately
    try { window.dispatchEvent(new Event('resize')); } catch {}
  };

  return (
    <ToolbarButton size={22} style={{ marginLeft: 6 }}
      icon={ICON_DOCKLEFT}
      onClick={onClick}
      toggled={toggled}
    />
  );
});
