import { EditorialHeader } from "@/components/editorial-header";

export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EditorialHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
