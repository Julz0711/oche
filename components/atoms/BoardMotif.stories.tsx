import type { Meta, StoryObj } from "@storybook/react";
import { BoardMotif } from "./BoardMotif";

const meta: Meta<typeof BoardMotif> = {
  component: BoardMotif,
  title: "Atoms/BoardMotif",
  tags: ["autodocs"],
  argTypes: {
    name: { control: "select", options: ["board", "scoresheet", "echo"] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Board: Story = {
  args: { name: "board", className: "w-64 h-64 text-wire" },
};

export const Scoresheet: Story = {
  args: { name: "scoresheet", className: "w-64 h-64 text-double" },
};

export const Echo: Story = {
  args: { name: "echo", className: "w-64 h-64 text-treble" },
};
