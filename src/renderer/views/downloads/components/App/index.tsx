import * as React from 'react';
import { observer } from 'mobx-react-lite';

import store from '../../store';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import { Container, Content, LeftContent } from '~/renderer/components/Pages';
import styled from 'styled-components';
import { GlobalNavigationDrawer } from '~/renderer/components/GlobalNavigationDrawer';
import { ICON_DOWNLOAD } from '~/renderer/constants/icons';
import { IDownloadItem } from '~/interfaces';
import DownloadRow from '../DownloadRow';
import { Page, Title, SubTitle, List } from './style';


const GlobalNoScroll = createGlobalStyle`
  html, body {
    height: 100%;
    margin: 0;
    overflow: hidden;
  }
  #app {
    height: 100%;
  }
`;

const LocalContent = styled(Content)`
  overflow: hidden;
`;

const App = observer(() => {
  React.useEffect(() => { document.title = 'Downloads Manager'; }, []);
  return (
    <ThemeProvider theme={{ ...store.theme }}>
        <GlobalNoScroll />
      <Container>
        <GlobalNavigationDrawer />
        <LocalContent>
          <LeftContent>
            <Page>
              <Title>Downloads</Title>
              <SubTitle>Items you download will appear here.</SubTitle>
              <List>
                {store.downloads.map((item: IDownloadItem) => (
                  <DownloadRow key={item.id} item={item} />
                ))}
              </List>
            </Page>
          </LeftContent>
        </LocalContent>
      </Container>
    </ThemeProvider>
  );
});

export default App;
