import { notFound } from "next/navigation";
import { previewEnabled } from "@/lib/preview-policy";
import { Workspace } from "@/components/workspace";
export default function Page() {
  if (!previewEnabled(process.env)) notFound();
  return <Workspace />;
}
