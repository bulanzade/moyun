/// <reference types="vite/client" />

interface LocalFontMetadata {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

// Local Font Access API（部分浏览器支持）
interface Window {
  queryLocalFonts?: () => Promise<LocalFontMetadata[]>;
}
