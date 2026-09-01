import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "./Divider";

const meta: Meta<typeof Divider> = {
  component: Divider,
  title: "Atoms/Divider",
  tags: ["autodocs"],
  argTypes: {
    direction: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    color: {
      control: "select",
      options: ["default", "muted"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    direction: "horizontal",
    color: "default",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100px" }}>
        <Story />
      </div>
    ),
  ],
};

export const Vertical: Story = {
  args: {
    direction: "vertical",
    color: "default",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100px", height: "100px" }}>
        <Story />
      </div>
    ),
  ],
};

export const Muted: Story = {
  args: {
    direction: "horizontal",
    color: "muted",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100px" }}>
        <Story />
      </div>
    ),
  ],
};

export const MutedVertical: Story = {
  args: {
    direction: "vertical",
    color: "muted",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100px", height: "100px" }}>
        <Story />
      </div>
    ),
  ],
};
