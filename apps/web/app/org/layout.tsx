import { OperationsDemoProvider } from "@/app/ui/operations-demo-provider";
import { isDemoMode } from "@/lib/demo-store";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return isDemoMode() ? (
    <OperationsDemoProvider>{children}</OperationsDemoProvider>
  ) : (
    children
  );
}
