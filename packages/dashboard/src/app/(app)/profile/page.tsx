import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/serverClient";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = createServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Atualize seu nome para personalizar a experiência.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
          <CardDescription>
            Essas informações são usadas em toda a aplicação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={user.email ?? null}
            displayName={profile?.display_name ?? null}
          />
        </CardContent>
      </Card>
    </section>
  );
}
