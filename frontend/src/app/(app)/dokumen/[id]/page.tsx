import DokumenDetailPage from "./dokumen-detail";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DokumenDetailPage id={id} />;
}
