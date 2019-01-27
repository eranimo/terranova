import styled from 'styled-components';

export const FullSizeBlock = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;


export const FullOverlay = styled.div`
  position: fixed;
  z-index: 100;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(39, 52, 61, 0.5);
`;
