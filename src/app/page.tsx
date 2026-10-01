import { redirect } from "next/navigation";
import { getOptionalSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getOptionalSessionUser();
  if (user) {
    redirect("/tickets");
  } else {
    redirect("/login");
  }
}
