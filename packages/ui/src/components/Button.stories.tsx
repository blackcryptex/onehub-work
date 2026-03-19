import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Core/Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: "Primary" } };
export const Secondary: Story = { args: { children: "Secondary", variant: "secondary" } };
export const Ghost: Story = { args: { children: "Ghost", variant: "ghost" } };
