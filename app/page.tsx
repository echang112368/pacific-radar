import { AuthGate } from "./auth-gate";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const initialNotice =
    query.deleted === "true"
      ? "Your account and sign-in data were permanently deleted."
      : query.verified === "true"
        ? "Email verified. Your controller account is ready."
        : null;

  return <AuthGate initialNotice={initialNotice} />;
}
