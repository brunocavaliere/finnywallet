"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertProfileAction } from "./actions";

type ProfileFormProps = {
  email: string | null;
  displayName: string | null;
};

export function ProfileForm({
  email,
  displayName
}: ProfileFormProps) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await upsertProfileAction({
        display_name: nameValue
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <Input id="email" type="email" value={email ?? ""} disabled />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="displayName">
          Nome
        </label>
        <Input
          id="displayName"
          placeholder="Como você quer ser chamado"
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Perfil atualizado.
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
