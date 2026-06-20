import { DeskDisplay } from "@/components/DeskDisplay";
import { FlipClockScreen } from "@/components/FlipClockScreen";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <DeskDisplay />
    </div>
  );
}
