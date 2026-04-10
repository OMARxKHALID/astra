import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileView from "./ProfileView";

export const metadata = {
  title: "Profile | Astra",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ProfileView user={session.user} />;
}
