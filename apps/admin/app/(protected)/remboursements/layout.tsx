import { AdminOnly } from '@/components/admin-only';

/**
 * File des remboursements — ADMIN uniquement.
 *
 * Le garde est dans un layout, pas dans la page : une page ajoutée sous
 * `/remboursements` est protégée par défaut, au lieu de dépendre d'un composant
 * qu'on aurait pu oublier d'envelopper. `/refunds` est `@Roles('ADMIN')` au
 * niveau de la classe côté serveur — qui reste, lui, la seule autorisation
 * réelle.
 */
export default function RemboursementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminOnly>{children}</AdminOnly>;
}
