import { useColors, useIsMobile } from "@package/ui";

export const Plan = () => {
  const colors = useColors();
  const isMobile = useIsMobile();

  return (
    <main
      css={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "20px 16px" : "32px 24px",
        paddingBottom: isMobile
          ? "calc(24px + var(--nav-h) + var(--safe-bottom))"
          : "48px",
      }}
    >
      <h1 css={{ color: colors.textPrimary }}>Meal plan</h1>
      <p css={{ color: colors.textSecondary }}>
        Here you can manage your meal plans and recipes.
      </p>
    </main>
  );
};
