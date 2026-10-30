import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useColors, Input, Button } from "@package/ui";

import { AuthCard } from "./auth-card";
import { useRegistrationMutation } from "./queries";

export const Register = () => {
  const colors = useColors();
  const navigate = useNavigate();
  const registration = useRegistrationMutation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    registration.reset();

    if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      return;
    }

    setConfirmPasswordError("");
    registration.mutate(
      {
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        password: formData.password,
        password_confirm: formData.confirmPassword,
      },
      { onSuccess: () => navigate("/login", { replace: true }) }
    );
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData(previous => ({ ...previous, [name]: value }));
    registration.reset();

    if (name === "password" || name === "confirmPassword") {
      setConfirmPasswordError("");
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Join us to start planning your meals">
      <form
        onSubmit={handleSubmit}
        css={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div css={{ display: "flex", gap: 12 }}>
          <Input
            label="First Name"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="First name"
            disabled={registration.isPending}
            error={registration.apiFieldErrors.first_name}
            required
            flex
          />
          <Input
            label="Last Name"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Last name"
            disabled={registration.isPending}
            error={registration.apiFieldErrors.last_name}
            required
            flex
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email"
          disabled={registration.isPending}
          error={registration.apiFieldErrors.email}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Create a password"
          disabled={registration.isPending}
          error={registration.apiFieldErrors.password}
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm your password"
          disabled={registration.isPending}
          required
          error={confirmPasswordError || registration.apiFieldErrors.password_confirm}
        />

        {registration.submitError && (
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
            {registration.submitError}
          </div>
        )}

        <Button variant="primary" type="submit" loading={registration.isPending}>
          Create Account
        </Button>
      </form>

      <div css={{ textAlign: "center", marginTop: 24 }}>
        <p css={{ fontSize: 14, color: colors.textSecondary }}>
          Already have an account?{" "}
          <Link
            to="/login"
            css={{
              color: colors.primary,
              textDecoration: "none",
              fontWeight: 600,
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};
