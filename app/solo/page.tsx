import type { Metadata } from "next";
import SoloGame from "./SoloGame";
export const metadata: Metadata = {
  title: "House Rules · Oche",
  description:
    "A solo darts roguelike. Real throws, evolving builds, and weekly challenges with friends.",
};
export default function SoloPage() {
  return <SoloGame />;
}
