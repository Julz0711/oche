import type { Meta, StoryObj } from "@storybook/react";
import { Pips } from "./Pips";

const meta: Meta<typeof Pips> = {
  component: Pips,
  title: "Atoms/Pips",
  tags: ["autodocs"],
  argTypes: {
    accent: { control: "select", options: ["wire", "double", "treble", "sisal"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoOfThree: Story = {
  args: { value: 2, target: 3, accent: "wire" },
};

export const AllWon: Story = {
  args: { value: 5, target: 5, accent: "double" },
};

export const NoneYet: Story = {
  args: { value: 0, target: 9, accent: "treble" },
};
