import { type CSSObject } from "@emotion/react";

export const CONTENT_MAX_WIDTH = 1200;

export const getContentContainerStyles = (isMobile: boolean): CSSObject => ({
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  boxSizing: "border-box",
  marginRight: "auto",
  marginLeft: "auto",
  paddingRight: isMobile ? 16 : 24,
  paddingLeft: isMobile ? 16 : 24,
});
