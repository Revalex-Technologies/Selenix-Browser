import styled from 'styled-components';

export const Page = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* prevent outer page scrollbar */
`;

export const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
`;

export const SubTitle = styled.div`
  opacity: 0.72;
  margin-bottom: 24px;
`;

export const List = styled.div`
  max-width: 1024px;
  flex: 1;
  overflow: auto; /* scroll inside list only when items overflow */
  padding-bottom: 32px;
`;
