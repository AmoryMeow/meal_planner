import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  Button,
  getContentContainerStyles,
  hexToRgba,
  useColors,
  useIsMobile,
  useTheme,
} from "@package/ui";

type ProductShotProps = {
  alt: string;
  lightSrc: string;
  darkSrc: string;
  mobileLightSrc?: string;
  mobileDarkSrc?: string;
  eager?: boolean;
  compact?: boolean;
};

type LandingProps = {
  showcase?: boolean;
};

const sourceRepositoryUrl = "https://github.com/AmoryMeow/meal_planner";
const landingAsset = (fileName: string) =>
  `${import.meta.env.BASE_URL}landing/${fileName}`;

const openSourceRepository = () => {
  window.open(sourceRepositoryUrl, "_blank", "noopener,noreferrer");
};

const ProductShot = ({
  alt,
  lightSrc,
  darkSrc,
  mobileLightSrc,
  mobileDarkSrc,
  eager = false,
  compact = false,
}: ProductShotProps) => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const src = theme === "dark" ? darkSrc : lightSrc;
  const mobileSrc = theme === "dark" ? mobileDarkSrc : mobileLightSrc;

  return (
    <div
      css={{
        position: "relative",
        minWidth: 0,
        padding: isMobile ? 5 : 8,
        overflow: "hidden",
        border: `1px solid ${hexToRgba(colors.primary, 0.3)}`,
        borderRadius: isMobile ? 18 : 24,
        background: `linear-gradient(145deg, ${hexToRgba(colors.primary, 0.18)}, ${hexToRgba(colors.accent, 0.1)})`,
        boxShadow: `0 24px 70px ${hexToRgba(colors.textPrimary, 0.15)}`,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(120deg, ${hexToRgba(colors.primary, 0.08)}, transparent 30%)`,
        },
      }}
    >
      <div
        css={{
          position: "relative",
          maxHeight: compact && isMobile ? 500 : "none",
          overflow: "hidden",
          borderRadius: isMobile ? 13 : 17,
          background: "#020617",
        }}
      >
        <picture>
          {mobileSrc ? <source media="(max-width: 720px)" srcSet={mobileSrc} /> : null}
          <img
            src={src}
            alt={alt}
            width={1440}
            height={1000}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            css={{
              display: "block",
              width: "100%",
              height: "auto",
              objectFit: "cover",
              objectPosition: "top",
            }}
          />
        </picture>
      </div>
    </div>
  );
};

type FeatureSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  image: ReactNode;
  reverse?: boolean;
};

const FeatureSection = ({
  eyebrow,
  title,
  description,
  points,
  image,
  reverse = false,
}: FeatureSectionProps) => {
  const colors = useColors();
  const isMobile = useIsMobile();

  const copy = (
    <div css={{ alignSelf: "center", minWidth: 0 }}>
      <p
        css={{
          margin: "0 0 12px",
          color: colors.primary,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>
      <h2
        css={{
          maxWidth: 520,
          margin: 0,
          color: colors.textPrimary,
          fontSize: "clamp(28px, 4vw, 42px)",
          lineHeight: 1.08,
          letterSpacing: "-0.035em",
        }}
      >
        {title}
      </h2>
      <p
        css={{
          maxWidth: 540,
          margin: "18px 0 0",
          color: colors.textSecondary,
          fontSize: isMobile ? 16 : 17,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
      <ul
        css={{
          display: "grid",
          gap: 11,
          margin: "24px 0 0",
          padding: 0,
          listStyle: "none",
        }}
      >
        {points.map(point => (
          <li
            key={point}
            css={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            <span
              aria-hidden="true"
              css={{
                display: "grid",
                width: 20,
                height: 20,
                flex: "0 0 auto",
                marginTop: 1,
                placeItems: "center",
                borderRadius: "50%",
                background: colors.infoBg,
                color: colors.primaryActive,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              ✓
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section
      css={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "minmax(0, 1fr)"
          : "minmax(0, 0.82fr) minmax(0, 1.18fr)",
        gap: isMobile ? 32 : 56,
        alignItems: "center",
        padding: isMobile ? "56px 0" : "88px 0",
        borderTop: `1px solid ${colors.divider}`,
      }}
    >
      {reverse && !isMobile ? image : copy}
      {reverse && !isMobile ? copy : image}
    </section>
  );
};

export const Landing = ({ showcase = false }: LandingProps) => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <main css={{ overflow: "hidden" }}>
      <div css={getContentContainerStyles(isMobile)}>
        <section
          css={{
            position: "relative",
            display: "grid",
            justifyItems: "center",
            padding: isMobile ? "56px 0 48px" : "88px 0 76px",
            textAlign: "center",
            "&::before": {
              content: '""',
              position: "absolute",
              zIndex: 0,
              top: isMobile ? -80 : -180,
              left: "50%",
              width: isMobile ? 520 : 900,
              height: isMobile ? 420 : 620,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${hexToRgba(colors.primary, 0.2)}, transparent 68%)`,
              transform: "translateX(-50%)",
              pointerEvents: "none",
            },
          }}
        >
          <div css={{ position: "relative", zIndex: 1, display: "contents" }}>
            <span
              css={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 20,
                padding: "7px 12px",
                border: `1px solid ${hexToRgba(colors.primary, 0.28)}`,
                borderRadius: 999,
                background: hexToRgba(colors.primary, 0.08),
                color: colors.primaryActive,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span aria-hidden="true">✦</span>
              Meal planning for real life
            </span>

            <h1
              css={{
                maxWidth: 900,
                margin: 0,
                color: colors.textPrimary,
                fontSize: "clamp(42px, 7vw, 76px)",
                fontWeight: 850,
                lineHeight: 1.02,
                letterSpacing: "-0.055em",
              }}
            >
              Plan once. Know what’s for dinner all week.
            </h1>
            <p
              css={{
                maxWidth: 700,
                margin: isMobile ? "22px 0 0" : "28px 0 0",
                color: colors.textSecondary,
                fontSize: "clamp(17px, 2.2vw, 21px)",
                lineHeight: 1.6,
              }}
            >
              Build personal and shared meal plans, keep recipes organized, and turn the
              week into one practical shopping list.
            </p>

            <div
              css={{
                display: "flex",
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "center",
                gap: 12,
                marginTop: 30,
              }}
            >
              <Button
                size="lg"
                fullWidth={isMobile}
                icon={<ArrowIcon />}
                iconPosition="right"
                onClick={showcase ? openSourceRepository : () => navigate("/register")}
              >
                {showcase ? "View source" : "Start planning"}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                fullWidth={isMobile}
                onClick={
                  showcase
                    ? () =>
                        document
                          .getElementById("features")
                          ?.scrollIntoView({ behavior: "smooth" })
                    : () => navigate("/login")
                }
              >
                {showcase ? "Explore features" : "Sign in"}
              </Button>
            </div>

            <p
              css={{
                margin: "16px 0 0",
                color: colors.textMuted,
                fontSize: 13,
              }}
            >
              Personal and shared plans · Mobile friendly · Light and dark themes
            </p>
          </div>
        </section>

        <section
          aria-labelledby="product-preview-heading"
          css={{ paddingBottom: isMobile ? 56 : 96 }}
        >
          <h2 id="product-preview-heading" css={visuallyHiddenStyles}>
            Mealendar weekly meal plan preview
          </h2>
          <ProductShot
            lightSrc={landingAsset("weekly-plan-light.png")}
            darkSrc={landingAsset("weekly-plan-dark.png")}
            mobileLightSrc={landingAsset("weekly-plan-mobile-light.png")}
            mobileDarkSrc={landingAsset("weekly-plan-mobile-dark.png")}
            alt="Mealendar weekly calendar showing personal, family, and friends’ meals"
            eager
            compact
          />
        </section>

        <section
          id="features"
          aria-labelledby="workflow-heading"
          css={{
            display: "grid",
            justifyItems: "center",
            padding: isMobile ? "56px 0" : "84px 0",
            borderTop: `1px solid ${colors.divider}`,
            textAlign: "center",
          }}
        >
          <p
            css={{
              margin: "0 0 12px",
              color: colors.primary,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            One connected workflow
          </p>
          <h2
            id="workflow-heading"
            css={{
              maxWidth: 760,
              margin: 0,
              color: colors.textPrimary,
              fontSize: "clamp(30px, 5vw, 48px)",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            From “what should we cook?” to a ready shopping list.
          </h2>
          <p
            css={{
              maxWidth: 640,
              margin: "18px 0 0",
              color: colors.textSecondary,
              fontSize: isMobile ? 16 : 18,
              lineHeight: 1.65,
            }}
          >
            Recipes, calendars, groups, and ingredients stay connected, so the plan
            changes without creating another spreadsheet.
          </p>
        </section>

        <FeatureSection
          eyebrow="Meals"
          title="Keep every meal ready for the calendar."
          description="Save home recipes, restaurant ideas, and delivery favorites in one searchable collection. Ingredients and servings remain attached to the meal."
          points={[
            "Search and filter by source or tag",
            "Store ingredients, servings, and cooking instructions",
            "Reuse one meal across as many calendar entries as you need",
          ]}
          image={
            <ProductShot
              lightSrc={landingAsset("meals-light.png")}
              darkSrc={landingAsset("meals-dark.png")}
              alt="Mealendar meal library with search, filters, tags, and recipe cards"
            />
          }
        />

        <FeatureSection
          eyebrow="Shared plans"
          title="Coordinate meals without sharing your whole account."
          description="Create a plan for family or friends, invite the people involved, and control which meals are available to the group."
          points={[
            "Personal and group plans stay separate",
            "Owners manage members and invitations",
            "Plan colors make mixed calendars easy to scan",
          ]}
          image={
            <ProductShot
              lightSrc={landingAsset("groups-light.png")}
              darkSrc={landingAsset("groups-dark.png")}
              alt="Mealendar group plan settings with meal sections, members, and invitations"
            />
          }
          reverse
        />

        <FeatureSection
          eyebrow="Shopping list"
          title="Turn the plan into quantities you can actually shop for."
          description="Mealendar calculates ingredients from the current recipes and planned servings, then combines matching products for the selected dates and plans."
          points={[
            "Choose this week, next week, or a custom period",
            "Combine ingredients across several meal plans",
            "Recipe edits are reflected the next time the list is built",
          ]}
          image={
            <ProductShot
              lightSrc={landingAsset("shopping-list-light.png")}
              darkSrc={landingAsset("shopping-list-dark.png")}
              alt="Mealendar shopping list calculated from all selected meal plans"
            />
          }
        />

        <section
          css={{
            position: "relative",
            display: "grid",
            justifyItems: "center",
            margin: isMobile ? "32px 0 56px" : "56px 0 88px",
            padding: isMobile ? "42px 20px" : "64px 48px",
            overflow: "hidden",
            border: `1px solid ${hexToRgba(colors.primary, 0.28)}`,
            borderRadius: isMobile ? 20 : 28,
            background: `linear-gradient(135deg, ${colors.surface}, ${hexToRgba(colors.primary, 0.12)})`,
            textAlign: "center",
            "&::after": {
              content: '""',
              position: "absolute",
              right: -120,
              bottom: -180,
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: hexToRgba(colors.primary, 0.12),
              filter: "blur(24px)",
              pointerEvents: "none",
            },
          }}
        >
          <span
            css={{
              position: "relative",
              zIndex: 1,
              marginBottom: 14,
              color: colors.primaryActive,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Work in progress
          </span>
          <h2
            css={{
              position: "relative",
              zIndex: 1,
              maxWidth: 680,
              margin: 0,
              color: colors.textPrimary,
              fontSize: "clamp(30px, 5vw, 46px)",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            Make next week easier to answer.
          </h2>
          <p
            css={{
              position: "relative",
              zIndex: 1,
              maxWidth: 570,
              margin: "18px 0 28px",
              color: colors.textSecondary,
              fontSize: 16,
              lineHeight: 1.65,
            }}
          >
            {showcase
              ? "Explore the source code today. A hosted full-stack demo is planned for a later deployment."
              : "Create an account, add a few meals, and build your first weekly plan."}
          </p>
          <Button
            size="lg"
            fullWidth={isMobile}
            icon={<ArrowIcon />}
            iconPosition="right"
            onClick={showcase ? openSourceRepository : () => navigate("/register")}
          >
            {showcase ? "View source on GitHub" : "Create an account"}
          </Button>
        </section>
      </div>
    </main>
  );
};

const ArrowIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const visuallyHiddenStyles = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};
