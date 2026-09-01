import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "Atoms/Button",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Primary Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    size: "md",
    children: "Secondary Button",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    size: "md",
    children: "Ghost Button",
  },
};

export const Small: Story = {
  args: {
    variant: "primary",
    size: "sm",
    children: "Small",
  },
};

export const Large: Story = {
  args: {
    variant: "primary",
    size: "lg",
    children: "Large Button",
  },
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Disabled Button",
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Loading...",
    disabled: true,
  },
};

export const SecondarySmall: Story = {
  args: {
    variant: "secondary",
    size: "sm",
    children: "Secondary Small",
  },
};

export const SecondaryLarge: Story = {
  args: {
    variant: "secondary",
    size: "lg",
    children: "Secondary Large",
  },
};

export const GhostSmall: Story = {
  args: {
    variant: "ghost",
    size: "sm",
    children: "Ghost Small",
  },
};

export const GhostLarge: Story = {
  args: {
    variant: "ghost",
    size: "lg",
    children: "Ghost Large",
  },
};

export const SecondaryDisabled: Story = {
  args: {
    variant: "secondary",
    size: "md",
    children: "Secondary Disabled",
    disabled: true,
  },
};

export const GhostDisabled: Story = {
  args: {
    variant: "ghost",
    size: "md",
    children: "Ghost Disabled",
    disabled: true,
  },
};
