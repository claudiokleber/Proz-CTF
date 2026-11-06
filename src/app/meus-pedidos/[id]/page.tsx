import { redirect } from "next/navigation";

export default function OrderAliasRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/loja/meus-pedidos/${encodeURIComponent(params.id)}`);
}
