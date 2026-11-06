import { redirect } from "next/navigation";

export default function ProductAliasRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/loja/produto/${encodeURIComponent(params.id)}`);
}
