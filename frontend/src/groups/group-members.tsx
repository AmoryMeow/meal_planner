import { hexToRgba, useColors } from "@package/ui";

import { type GroupDetails, type GroupMember } from "./api";

export const GroupMembers = ({
  group,
  color = group.color,
}: {
  group: GroupDetails;
  color?: string;
}) => {
  const colors = useColors();

  return (
    <section
      aria-labelledby="group-members-heading"
      css={{
        marginTop: 24,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.surface,
        overflow: "hidden",
      }}
    >
      <header
        css={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <h2
          id="group-members-heading"
          css={{ margin: 0, color: colors.textPrimary, fontSize: 18 }}
        >
          Members
        </h2>
        <span css={{ color: colors.textSecondary, fontSize: 13 }}>
          {group.member_count}
        </span>
      </header>

      <ul css={{ margin: 0, padding: 0, listStyle: "none" }}>
        {group.members.map((member, index) => (
          <li
            key={member.id}
            css={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 64,
              padding: "10px 20px",
              borderTop: index === 0 ? undefined : `1px solid ${colors.divider}`,
            }}
          >
            <MemberAvatar member={member} color={color} />
            <div css={{ minWidth: 0, flex: 1 }}>
              <div
                css={{
                  color: colors.textPrimary,
                  fontSize: 14,
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getMemberName(member)}
              </div>
              {getMemberName(member) !== member.email ? (
                <div
                  css={{
                    marginTop: 2,
                    color: colors.textSecondary,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {member.email}
                </div>
              ) : null}
            </div>
            <span
              css={{
                padding: "4px 8px",
                borderRadius: 999,
                background:
                  member.role === "owner" ? hexToRgba(color, 0.14) : colors.surfaceAlt,
                color:
                  member.role === "owner" ? colors.textPrimary : colors.textSecondary,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            >
              {member.role}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const MemberAvatar = ({ member, color }: { member: GroupMember; color: string }) => {
  const colors = useColors();

  return (
    <span
      aria-hidden="true"
      css={{
        width: 38,
        height: 38,
        flex: "0 0 auto",
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        background: hexToRgba(color, 0.14),
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      {getMemberInitials(member)}
    </span>
  );
};

const getMemberName = (member: GroupMember): string => {
  const fullName = `${member.first_name} ${member.last_name}`.trim();
  return fullName || member.email;
};

const getMemberInitials = (member: GroupMember): string => {
  const nameInitials = [member.first_name, member.last_name]
    .filter(Boolean)
    .map(value => value[0])
    .join("");
  return nameInitials || member.email[0] || "?";
};
