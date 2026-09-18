import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "./Panel";

const meta: Meta<typeof Panel> = {
  component: Panel,
  title: "Atoms/Panel",
  tags: ["autodocs"],
  argTypes: {
    accent: { control: "select", options: ["wire", "double", "treble", "sisal"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Surface: Story = {
  args: {
    accent: "wire",
    accentBar: true,
    className: "p-5 text-chalk",
    children: "A shared rectangular surface",
  },
};

export const Active: Story = {
  args: {
    accent: "wire",
    active: true,
    className: "p-5 text-chalk",
    children: "Active — raised, with a left accent edge",
  },
};

export const AsButton: Story = {
  args: {
    as: "button",
    accent: "double",
    accentBar: true,
    className: "p-5 text-chalk",
    children: "Tab to me — the focus ring must be fully visible",
  },
};
