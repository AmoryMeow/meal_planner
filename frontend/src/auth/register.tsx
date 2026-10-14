import React, { useState } from "react";
import { Link } from "react-router-dom";

import { useColors, Input, Button } from "@package/ui";

import { AuthCard } from "./auth-card";

export const Register = () => {
  const colors = useColors();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      return;
    }

    setConfirmPasswordError("");
    // TODO: Implement registration logic
    // console.log("Registration attempt:", formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

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
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Create a password"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm your password"
          required
          error={confirmPasswordError}
        />

        <Button variant="primary" type="submit">
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
