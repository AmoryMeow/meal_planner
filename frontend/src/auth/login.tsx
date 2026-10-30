import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useColors, Input, Button } from "@package/ui";

import { AuthCard } from "./auth-card";
import { useLoginMutation } from "./queries";
import { useAuthSession } from "./session";

export const Login = () => {
  const colors = useColors();
  const location = useLocation();
  const navigate = useNavigate();
  const login = useLoginMutation();
  const { signIn } = useAuthSession();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login.reset();
    login.mutate(
      { email: formData.email.trim(), password: formData.password },
      {
        onSuccess: session => {
          signIn(session);
          navigate(getReturnPath(location.state), { replace: true });
        },
      }
    );
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(previous => ({
      ...previous,
      [name]: value,
    }));
    login.reset();
  };

  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to your account to continue">
      <form
        onSubmit={handleSubmit}
        css={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email"
          disabled={login.isPending}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Enter your password"
          disabled={login.isPending}
          required
        />

        {login.submitError && (
          <div
            role="alert"
            css={{
              color: colors.danger,
              background: colors.dangerBg,
              border: `1px solid ${colors.danger}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            {login.submitError}
          </div>
        )}

        <Button variant="primary" type="submit" loading={login.isPending}>
          Sign In
        </Button>
      </form>

      <div css={{ textAlign: "center", marginTop: 24 }}>
        <p css={{ fontSize: 14, color: colors.textSecondary }}>
          Don't have an account?{" "}
          <Link
            to="/register"
            css={{
              color: colors.primary,
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};

const getReturnPath = (state: unknown): string => {
  if (!isRecord(state) || !isRecord(state.from)) return "/plan";

  const { pathname, search = "", hash = "" } = state.from;
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//")
  ) {
    return "/plan";
  }

  return `${pathname}${typeof search === "string" ? search : ""}${
    typeof hash === "string" ? hash : ""
  }`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
