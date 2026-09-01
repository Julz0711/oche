import type { Meta, StoryObj } from "@storybook/react";
import {
  Heart,
  Star,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Icon } from "./Icon";

const meta: Meta<typeof Icon> = {
  component: Icon,
  title: "Atoms/Icon",
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "number",
    },
    color: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Heart_Icon: Story = {
  args: {
    icon: Heart,
    size: 24,
    color: "currentColor",
  },
};

export const Star_Icon: Story = {
  args: {
    icon: Star,
    size: 24,
    color: "currentColor",
  },
};

export const Small: Story = {
  args: {
    icon: Check,
    size: 16,
    color: "currentColor",
  },
};

export const Large: Story = {
  args: {
    icon: AlertCircle,
    size: 48,
    color: "currentColor",
  },
};

export const WithColor: Story = {
  args: {
    icon: X,
    size: 24,
    color: "#C8102E",
  },
};

export const Menu_Icon: Story = {
  args: {
    icon: Menu,
    size: 24,
    color: "currentColor",
  },
};

export const ChevronDown_Icon: Story = {
  args: {
    icon: ChevronDown,
    size: 20,
    color: "currentColor",
  },
};
