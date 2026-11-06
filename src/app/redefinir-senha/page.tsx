import { redirect } from "next/navigation";

export default function ResetPasswordAliasRedirect({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const tokenParam = searchParams.token
    ? `?token=${encodeURIComponent(searchParams.token)}`
    : "";
  redirect(`/loja/redefinir-senha${tokenParam}`);
}
