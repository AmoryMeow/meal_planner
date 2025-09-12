import { useColors, hexToRgba, useIsMobile } from "@package/ui";
import { ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";

type MenuType = {
  label: string;
  link: string;
  icon?: ReactNode;
};

const config: MenuType[] = [
  { link: "/", label: "Home", icon: <span aria-hidden>📅</span> },
  { link: "/dishes", label: "Dishes", icon: <span aria-hidden>🍽️</span> },
  { link: "/list", label: "List", icon: <span aria-hidden>🛒</span> },
  { link: "/groups", label: "Groups", icon: <span aria-hidden>👥</span> },
  { link: "/profile", label: "Profile", icon: <span aria-hidden>👤</span> },
];

type Props = {
  variant: "top" | "bottom";
};

export const Menu = ({ variant }: Props) => {
  const { pathname } = useLocation();
  const colors = useColors();
  const isMobile = useIsMobile();

  const isTopDesktop = variant === "top" && !isMobile;
  const isBottomMobile = variant === "bottom" && isMobile;

  return (
    <nav
      css={
        variant === "top"
          ? {
              background: colors.surface,
              borderTop: `1px solid ${colors.divider}`,
              borderBottom: `1px solid ${colors.divider}`,
              zIndex: 900,
              position: "sticky",
              top: "var(--header-h)",
              display: isMobile ? "none" : "block",
            }
          : {
              background: colors.surface,
              borderTop: `1px solid ${colors.divider}`,
              borderBottom: `1px solid ${colors.divider}`,
              zIndex: 900,
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              display: isMobile ? "flex" : "none",
              height: "var(--nav-h)",
            }
      }
      aria-label="Main navigation"
    >
      <div
        css={{
          maxWidth: isTopDesktop ? 1200 : "none",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: isTopDesktop ? "center" : "space-around",
          padding: isTopDesktop ? "4px 20px" : "2px 8px",
          gap: isTopDesktop ? 12 : 0,
          width: isTopDesktop ? "auto" : "100%",
        }}
      >
        {config.map(item => {
          const active =
            item.link === "/" ? pathname === "/" : pathname.startsWith(item.link);

          return (
            <Link
              key={item.link}
              to={item.link}
              css={{
                flex: isTopDesktop ? "0 1 auto" : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isTopDesktop ? 6 : 4,
                padding: isTopDesktop ? "6px 12px" : "6px 4px",
                borderRadius: isTopDesktop ? 12 : 8,
                textDecoration: "none",
                color: active ? colors.textPrimary : colors.textSecondary,
                background: active
                  ? `linear-gradient(135deg, ${hexToRgba(colors.primary, 0.15)}, ${hexToRgba(colors.primary, 0.1)})`
                  : "transparent",
                fontWeight: active ? 700 : 500,
                fontSize: isTopDesktop ? 14 : 13,
                letterSpacing: "-0.01em",
                minHeight: isTopDesktop ? 32 : 28,
                position: "relative",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                "&::after":
                  active && isTopDesktop
                    ? {
                        content: '""',
                        position: "absolute",
                        bottom: 2,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "75%",
                        height: 2,
                        background: colors.primary,
                        borderRadius: 1,
                        pointerEvents: "none",
                      }
                    : {},
                "&:hover": {
                  background: active
                    ? `linear-gradient(135deg, ${hexToRgba(colors.primary, 0.2)}, ${hexToRgba(colors.primary, 0.15)})`
                    : `linear-gradient(135deg, ${hexToRgba(colors.primary, 0.1)}, ${hexToRgba(colors.primary, 0.05)})`,
                  transform: "translateY(-1px)",
                  boxShadow: `0 2px 8px ${hexToRgba(colors.primary, 0.15)}`,
                },
                "&:active": {
                  transform: "translateY(0)",
                },
              }}
            >
              <span
                aria-hidden
                css={{
                  fontSize: isTopDesktop ? 16 : 14,
                  filter: active ? "none" : "grayscale(0.3)",
                  transition: "filter 0.2s ease",
                }}
              >
                {item.icon}
              </span>
              <span
                css={{
                  display: isBottomMobile ? "none" : "inline",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
