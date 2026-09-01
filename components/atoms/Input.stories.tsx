import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  component: Input,
  title: "Atoms/Input",
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    error: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Player Name",
    placeholder: "Enter your name...",
  },
};

export const WithError: Story = {
  args: {
    label: "Email",
    placeholder: "Enter email...",
    error: "Invalid email address",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled Input",
    placeholder: "This is disabled",
    disabled: true,
    value: "Cannot edit",
  },
};

export const LongValue: Story = {
  args: {
    label: "Description",
    placeholder: "Enter description...",
    value: "This is a very long value that should wrap in the input field",
  },
};

export const Empty: Story = {
  args: {
    label: "Empty Input",
    placeholder: "Type something...",
  },
};

export const WithValidation: Story = {
  args: {
    label: "Score",
    type: "number",
    placeholder: "Enter a score...",
    min: 0,
    max: 180,
  },
};
