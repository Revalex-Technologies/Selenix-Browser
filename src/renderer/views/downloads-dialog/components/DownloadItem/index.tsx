import * as React from 'react';
import { observer } from 'mobx-react-lite';
import {
  StyledDownloadItem,
  Title,
  Progress,
  ProgressBackground,
  Info,
  Icon,
  MoreButton,
  Separator,
  SecondaryText,
} from './style';
import { IDownloadItem } from '~/interfaces';
import { shell } from 'electron';

// Lightweight pretty-bytes formatter to avoid ESM/CJS type issues.
const prettyBytes = (input: number): string => {
  if (typeof input !== 'number' || !isFinite(input)) return '0 B';
  const neg = input < 0;
  let num = Math.abs(input);
  if (num < 1) return `${neg ? '-' : ''}${num} B`;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const exponent = Math.min(Math.floor(Math.log10(num) / 3), units.length - 1);
  const value = Number((num / Math.pow(1000, exponent)).toFixed(2));
  return `${neg ? '-' : ''}${value} ${units[exponent]}`;
};


const onClick = (item: IDownloadItem) => () => {
  if (item.completed) {
    shell.openPath(item.savePath);
  }
};

const onMoreClick = (item: IDownloadItem) => (
  e: React.MouseEvent<HTMLDivElement>,
) => {
  e.stopPropagation();
};

export const DownloadItem = observer(({ item }: { item: IDownloadItem }) => {
  let received = prettyBytes(item.receivedBytes);
  const total = prettyBytes(item.totalBytes);

  const receivedSplit = received.split(' ');

  if (receivedSplit[1] === total.split(' ')[1]) {
    received = receivedSplit[0];
  }

  return (
    <StyledDownloadItem onClick={onClick(item)}>
      <Icon></Icon>
      <Info>
        <Title>{item.fileName}</Title>
        {!item.completed && (
          <>
            <ProgressBackground>
              <Progress
                style={{
                  width: `calc((${item.receivedBytes} / ${item.totalBytes}) * 100%)`,
                }}
              ></Progress>
            </ProgressBackground>
            <SecondaryText>{`${received}/${total}`}</SecondaryText>
          </>
        )}
      </Info>
      <Separator></Separator>
      <MoreButton onClick={onMoreClick(item)}></MoreButton>
    </StyledDownloadItem>
  );
});