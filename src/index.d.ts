declare module '*.svg';
declare module '*.png';
declare module '*.woff2';


declare global {
  interface Window {
    versions?: {
      electron?: string;
      chrome?: string;
      node?: string;
      v8?: string;
    };
  }
}
export {};
