import { AuthButton } from "@package/auth";
import { useColors, hexToRgba, useIsMobile } from "@package/ui";

const FeatureCard = ({
  icon,
  title,
  description,
  tags,
}: {
  icon: string;
  title: string;
  description: string;
  tags?: string[];
}) => {
  const colors = useColors();

  return (
    <div
      css={{
        background: colors.surface,
        border: `1px solid ${colors.divider}`,
        borderRadius: 20,
        padding: "24px",
        textAlign: "left",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 25px ${hexToRgba(colors.textPrimary, 0.08)}`,
          borderColor: hexToRgba(colors.primary, 0.3),
        },
      }}
    >
      <div
        css={{
          fontSize: 28,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        {icon}
      </div>
      <h3
        css={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.textPrimary,
          margin: "0 0 8px 0",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <p
        css={{
          fontSize: 14,
          color: colors.textSecondary,
          margin: "0 0 16px 0",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
      {tags && (
        <div css={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map(tag => (
            <span
              key={tag}
              css={{
                background: colors.chip,
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 10px",
                borderRadius: 12,
                border: `1px solid ${colors.divider}`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const Landing = () => {
  const colors = useColors();
  const isMobile = useIsMobile();

  return (
    <div css={{ display: "flex", justifyContent: "center" }}>
      <div
        css={{
          maxWidth: "1200px",
          display: "grid",
          rowGap: "32px",
          margin: "32px 16px",
        }}
      >
        <section
          css={{
            display: "grid",
            rowGap: "16px",
            textAlign: "center",
          }}
        >
          <h1
            css={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: 800,
              margin: "0",
              color: colors.textPrimary,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Welcome to Mealendar
          </h1>
          <p
            css={{
              fontSize: "clamp(16px, 3vw, 20px)",
              color: colors.textSecondary,
              margin: "0",
              lineHeight: 1.5,
            }}
          >
            Plan your meals, discover new recipes, and organize your cooking journey.
          </p>
        </section>
        <section
          css={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 16 : 24,
          }}
        >
          <FeatureCard
            icon="📅"
            title="Plan Your Meals"
            description="Create weekly meal plans and never wonder what to cook again."
            tags={["Weekly Plans", "Calendar View", "Scheduling"]}
          />
          <FeatureCard
            icon="🍽️"
            title="Discover Dishes"
            description="Explore new recipes and save your favorites for easy access."
            tags={["Recipe Collection", "Favorites", "Search"]}
          />
          <FeatureCard
            icon="🛒"
            title="Smart Lists"
            description="Generate shopping lists automatically from your meal plans."
            tags={["Auto-Generated", "Shopping", "Ingredients"]}
          />
        </section>
        <section
          css={{
            background: `linear-gradient(135deg, ${colors.surface}, ${colors.surfaceAlt})`,
            borderRadius: isMobile ? 16 : 20,
            padding: isMobile ? "24px 20px" : "32px 24px",
            textAlign: "center",
            border: `1px solid ${colors.divider}`,
          }}
        >
          <h2
            css={{
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: 700,
              color: colors.textPrimary,
              margin: "0 0 16px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Ready to get started?
          </h2>
          <p
            css={{
              color: colors.textSecondary,
              margin: "0 0 24px 0",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Create an account and plan your first week in 2 minutes.
          </p>

          <div
            css={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <AuthButton variant="primary" onClick={() => {}} label="Sign Up" />
            <AuthButton variant="secondary" onClick={() => {}} label="Sign In" />
          </div>
        </section>
      </div>
    </div>
  );
};
