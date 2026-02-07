"use client";

import type { HoldingWithPrice } from "@/domains/portfolio/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface RebalanceDeleteDialogProps {
  open: boolean;
  holding: HoldingWithPrice | null;
  deleting: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RebalanceDeleteDialog({
  open,
  holding,
  deleting,
  pending,
  onCancel,
  onConfirm,
}: RebalanceDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (deleting) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (deleting) {
            event.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Remover posição</AlertDialogTitle>
          <AlertDialogDescription>
            {holding
              ? `Tem certeza que deseja remover ${holding.asset.ticker}?`
              : "Tem certeza que deseja remover esta posição?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || deleting}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              "Remover"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
