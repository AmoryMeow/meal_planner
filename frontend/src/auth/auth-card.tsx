import React from "react";

import { useColors, hexToRgba, useIsMobile } from "@package/ui";

export interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthCard = ({ title, subtitle, children }: AuthCardProps) => {
  const colors = useColors();
  const isMobile = useIsMobile();

  return (
    <div
      css={{
        minHeight: "100dvh",
        background: colors.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "20px 16px" : "40px 24px",
      }}
    >
      <div
        css={{
          width: "100%",
          maxWidth: 400,
          background: colors.surface,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          padding: isMobile ? "32px 24px" : "40px 32px",
          boxShadow: `0 4px 24px ${hexToRgba(colors.border, 0.15)}`,
        }}
      >
        <div css={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            css={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.textPrimary,
              marginBottom: 8,
            }}
          >
            {title}
          </h1>
          <p
            css={{
              fontSize: 16,
              color: colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
};
