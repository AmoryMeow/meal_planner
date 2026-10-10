import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useColors, Input, Button } from "@package/ui";

import { AuthCard } from "./auth-card";

export const Login = () => {
  const colors = useColors();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    // console.log("Login attempt:", formData);
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Enter your password"
          required
        />

        <Button variant="primary" type="submit">
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
