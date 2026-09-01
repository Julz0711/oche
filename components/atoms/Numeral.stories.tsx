import type { Meta, StoryObj } from "@storybook/react";
import { Numeral } from "./Numeral";

const meta: Meta<typeof Numeral> = {
  component: Numeral,
  title: "Atoms/Numeral",
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
    },
    variant: {
      control: "select",
      options: ["default", "accent", "danger", "success"],
    },
    tabular: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "180",
    size: "md",
    variant: "default",
    tabular: true,
  },
};

export const Accent: Story = {
  args: {
    value: "180",
    size: "md",
    variant: "accent",
    tabular: true,
  },
};

export const Danger: Story = {
  args: {
    value: "180",
    size: "md",
    variant: "danger",
    tabular: true,
  },
};

export const Success: Story = {
  args: {
    value: "180",
    size: "md",
    variant: "success",
    tabular: true,
  },
};

export const Small: Story = {
  args: {
    value: "12",
    size: "sm",
    variant: "default",
    tabular: true,
  },
};

export const Large: Story = {
  args: {
    value: "999",
    size: "3xl",
    variant: "accent",
    tabular: true,
  },
};

export const ExtremeContent: Story = {
  args: {
    value: "9999",
    size: "4xl",
    variant: "default",
    tabular: true,
  },
};

export const NonTabular: Story = {
  args: {
    value: "123",
    size: "2xl",
    variant: "default",
    tabular: false,
  },
};
