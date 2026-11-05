'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDeleteAccount } from '@lilia/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { runAccountDeletion } from '@/lib/account-deletion';
import { useAuthSession } from '@/lib/auth-session';

/** Même texte que l'application : le client lit les mêmes conséquences partout. */
const CONSEQUENCES =
  'Cette action est irréversible. Vos informations personnelles, adresses, favoris, avis et points de fidélité seront supprimés. Vos commandes passées sont conservées de façon anonyme, pour la comptabilité des vendeurs.';

export function DeleteAccount() {
  const router = useRouter();
  const { token, logout } = useAuthSession();
  const deleteAccount = useDeleteAccount(token);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    void runAccountDeletion({
      remove: () => deleteAccount.mutateAsync(),
      logout,
      onDeleted: () => {
        toast.success('Votre compte a été supprimé');
        router.push('/');
      },
      onRefused: (message) => {
        setConfirming(false);
        toast.error(message);
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-3 min-h-11 w-full text-sm font-medium text-ink-500 hover:text-danger transition-colors"
      >
        Supprimer mon compte
      </button>
      <ConfirmDialog
        open={confirming}
        title="Supprimer mon compte ?"
        description={CONSEQUENCES}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Garder mon compte"
        pending={deleteAccount.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
