import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta: Meta<typeof Avatar> = {
  component: Avatar,
  title: "Atoms/Avatar",
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    isActive: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "John Doe",
    size: "md",
    isActive: false,
  },
};

export const Active: Story = {
  args: {
    name: "Jane Smith",
    size: "md",
    isActive: true,
  },
};

export const Small: Story = {
  args: {
    name: "Alice Brown",
    size: "sm",
    isActive: false,
  },
};

export const Large: Story = {
  args: {
    name: "Bob Wilson",
    size: "lg",
    isActive: true,
  },
};

export const WithImage: Story = {
  args: {
    name: "Jane Doe",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
    size: "md",
    isActive: false,
  },
};

export const SingleName: Story = {
  args: {
    name: "Madonna",
    size: "md",
    isActive: false,
  },
};

export const LongName: Story = {
  args: {
    name: "Christopher Alexander Montgomery",
    size: "md",
    isActive: true,
  },
};
