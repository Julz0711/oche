import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./Chip";

const meta: Meta<typeof Chip> = {
  component: Chip,
  title: "Atoms/Chip",
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "success", "danger", "accent"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Player 1",
    value: "180",
    variant: "default",
  },
};

export const Success: Story = {
  args: {
    label: "Double Hit",
    value: "50",
    variant: "success",
  },
};

export const Danger: Story = {
  args: {
    label: "Bust",
    value: "0",
    variant: "danger",
  },
};

export const Accent: Story = {
  args: {
    label: "High Score",
    value: "180",
    variant: "accent",
  },
};

export const WithClose: Story = {
  args: {
    label: "Player 1",
    value: "180",
    variant: "default",
    onClose: () => console.log("Close clicked"),
  },
};

export const LongLabel: Story = {
  args: {
    label: "Very Long Player Name Here",
    value: "123456",
    variant: "default",
    onClose: () => console.log("Close clicked"),
  },
};

export const ExtremeContent: Story = {
  args: {
    label: "P123456789012",
    value: "999999",
    variant: "accent",
    onClose: () => console.log("Close clicked"),
  },
};
