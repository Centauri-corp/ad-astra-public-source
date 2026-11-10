import { notFound } from "next/navigation";
import { previewEnabled } from "@/lib/preview-policy";
import { Workspace } from "@/components/workspace";
import { deploymentStatus } from "@/lib/deployment-status";
export default function Page() {
  if (!previewEnabled(process.env)) notFound();
  return (
    <Workspace sourceCommit={deploymentStatus(process.env).sourceCommit} />
  );
}
