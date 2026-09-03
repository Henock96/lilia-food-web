import { AdminOnly } from '@/components/admin-only';

/**
 * Gestion des comptes — ADMIN uniquement.
 *
 * Le garde est ici, dans un layout, plutôt que dans chaque page : une page
 * ajoutée sous `/utilisateurs` est protégée par défaut, au lieu de dépendre
 * d'un composant qu'on aurait pu oublier d'envelopper. Même raison que
 * `@Roles('ADMIN')` porté au niveau de la classe côté backend — qui reste, lui,
 * la seule autorisation réelle.
 */
export default function UtilisateursLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminOnly>{children}</AdminOnly>;
}
