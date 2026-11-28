'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  LogOut,
  Edit2,
  ChevronRight,
  Package,
  MapPin,
  Plus,
  Trash2,
  Check,
  X,
  Star,
  ShoppingBag,
  Clock,
  Shield,
  Gift,
  Copy,
  Zap,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthSession, useSessionGuard } from '@/lib/auth-session';
import {
  useProfile,
  useUpdateProfile,
  useMyOrdersPage,
  useAdresses,
  useCreateAdresse,
  useSetDefaultAdresse,
  useDeleteAdresse,
  useQuartiers,
  useReferralStats,
  useLoyaltyTransactions,
  usePublicPlatformSettings,
  pointsToXaf,
} from '@lilia/api-client';
import {
  formatCurrency,
  formatDateTime,
  formatOrderStatus,
  getOrderStatusColor,
  getInitials,
  cn,
} from '@lilia/utils';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { toast } from 'sonner';
import { runVisibleMutation, mutationErrorMessage } from '@/lib/account-feedback';
import { AddressPrecisionHint } from '@/components/checkout/address-precision-hint';
import { DeleteAccount } from '@/components/profile/delete-account';
import { PushToggle } from '@/components/push/push-toggle';

export default function ProfilPage() {
  const router = useRouter();
  const { user: storeUser, token, logout, setUser } = useAuthSession();
  const isCurrentSession = useSessionGuard();

  const { data: profile } = useProfile(token);
  const updateProfile = useUpdateProfile(token);
  const {
    data: ordersPage,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useMyOrdersPage(token);
  const orders = ordersPage?.data ?? [];
  const {
    data: adresses = [],
    isLoading: adressesLoading,
    isError: adressesError,
    isFetching: adressesFetching,
    refetch: refetchAdresses,
  } = useAdresses(token);
  const createAdresse = useCreateAdresse(token);
  const setDefault = useSetDefaultAdresse(token);
  const deleteAdresse = useDeleteAdresse(token);
  const addressGate = useRef(false);
  const clipboardGate = useRef(false);
  const addressBusy =
    setDefault.isPending ||
    deleteAdresse.isPending ||
    setDefault.isPaused ||
    deleteAdresse.isPaused ||
    adressesFetching;
  function changeAddress(id: string, remove: boolean) {
    if (addressBusy) return;
    void runVisibleMutation({
      gate: addressGate,
      isCurrent: isCurrentSession,
      run: () => (remove ? deleteAdresse.mutateAsync(id) : setDefault.mutateAsync(id)),
      onError: (error) =>
        toast.error(
          mutationErrorMessage(
            error,
            remove
              ? 'Impossible de supprimer l’adresse.'
              : 'Impossible de définir l’adresse par défaut.',
          ),
        ),
    });
  }
  const { data: quartiers = [] } = useQuartiers();
  const { data: referralStats } = useReferralStats(token);
  // Le barème vient du serveur. Aucune conversion points → FCFA n'est écrite
  // en dur : le jour où l'administrateur change la valeur du point, cette page
  // afficherait sinon encore l'ancienne.
  const { data: pricing } = usePublicPlatformSettings();
  const { data: loyaltyTxs = [] } = useLoyaltyTransactions(token);

  const user = profile ?? storeUser;

  // Edit profile
  const [editMode, setEditMode] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // New address
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newRue, setNewRue] = useState('');
  const [newQuartierId, setNewQuartierId] = useState('');
  // Repères pour le livreur. Le web n'a pas de carte de sélection : sans
  // position posée, une adresse y sort au mieux en APPROXIMATE, c'est-à-dire
  // au centroïde du quartier — plusieurs centaines de mètres. « Portail bleu
  // face à la pharmacie » est ce qui reste pour combler cet écart, et c'est
  // aussi ce qu'un livreur lit réellement. Le champ existait côté serveur et
  // dans l'app mobile ; ce formulaire ne l'envoyait pas.
  const [newLandmark, setNewLandmark] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  // Sign out
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Loyalty
  const [showLoyalty, setShowLoyalty] = useState(false);

  function copyReferralCode() {
    if (!referralStats?.referralCode) return;
    const code = referralStats.referralCode;
    void runVisibleMutation({
      gate: clipboardGate,
      isCurrent: isCurrentSession,
      run: () => navigator.clipboard.writeText(code),
      onSuccess: () => toast.success('Code copié !'),
      onError: () => toast.error('Impossible de copier le code. Copiez-le manuellement.'),
    });
  }

  function openEdit() {
    setEditNom(user?.nom ?? '');
    setEditPhone(user?.phone ?? '');
    setEditMode(true);
  }

  async function handleSaveProfile() {
    if (!isCurrentSession() || updateProfile.isPending) return;
    try {
      const res = await updateProfile.mutateAsync({
        nom: editNom.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      if (!isCurrentSession()) return;
      if (res.user) setUser(res.user);
      toast.success('Profil mis à jour');
      setEditMode(false);
    } catch {
      if (!isCurrentSession()) return;
      toast.error('Impossible de mettre à jour le profil');
    }
  }

  async function handleSaveAddress() {
    if (!isCurrentSession() || savingAddress || createAdresse.isPending) return;
    if (!newRue.trim()) return;
    setSavingAddress(true);
    try {
      // Quartier obligatoire : sans lui l'adresse n'est situable par rien
      // (le web n'a pas de carte de sélection, le repli serveur s'appuie sur
      // le centroïde du quartier).
      if (!newQuartierId) {
        toast.error('Choisissez votre quartier');
        return;
      }
      await createAdresse.mutateAsync({
        rue: newRue.trim(),
        ville: 'Brazzaville',
        country: 'Congo',
        quartierId: newQuartierId,
        // Omis plutôt qu'envoyé vide : le serveur distingue « pas de repère »
        // d'une chaîne vide, et une chaîne vide s'afficherait comme un repère
        // au livreur.
        ...(newLandmark.trim() ? { landmark: newLandmark.trim() } : {}),
      });
      if (!isCurrentSession()) return;
      setShowAddressForm(false);
      setNewRue('');
      setNewQuartierId('');
      setNewLandmark('');
      toast.success('Adresse enregistrée');
    } catch {
      if (!isCurrentSession()) return;
      toast.error("Impossible d'enregistrer l'adresse");
    } finally {
      if (isCurrentSession()) setSavingAddress(false);
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    try {
      const completed = await logout();
      if (!completed) return;
      toast.success('Déconnexion réussie');
      router.push('/');
    } catch {
      if (!isCurrentSession()) return;
      toast.error('Erreur lors de la déconnexion');
    } finally {
      if (isCurrentSession()) setSignOutLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="skeleton mb-6 h-40 rounded-3xl" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)]">
          <div className="skeleton h-52 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Stats from orders
  const totalOrders = ordersLoading
    ? '…'
    : ordersError || !ordersPage
      ? 'Indisponible'
      : ordersPage.meta.total;
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const completedOrders = orders.filter((o) => o.status === 'LIVRER').length;
  const recentOrders = orders.slice(0, 3);
  const loyaltyPoints = referralStats?.loyaltyPoints ?? user.loyaltyPoints ?? 0;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-14 sm:px-6 lg:px-8">
        <Breadcrumbs links={[{ label: 'Accueil', href: '/' }]} current="Mon profil" />
        <h1 className="font-display text-ink-900 mb-6 text-3xl font-extrabold tracking-tight sm:text-5xl">
          Mon profil
        </h1>

        <header className="border-ink-100 mb-6 rounded-2xl border bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div className="shrink-0">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.nom ?? ''}
                  width={80}
                  height={80}
                  className="size-16 rounded-2xl object-cover sm:size-20"
                />
              ) : (
                <div className="bg-tomato-50 grid size-16 place-items-center rounded-2xl sm:size-20">
                  <span className="font-display text-tomato-700 text-2xl font-extrabold">
                    {getInitials(user.nom)}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 pt-1">
              <p className="font-display text-ink-900 text-2xl leading-tight font-extrabold wrap-anywhere">
                {user.nom ?? 'Utilisateur'}
              </p>
              <p className="text-ink-500 text-sm wrap-anywhere">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="bg-tomato-50 text-tomato-700 rounded-full px-2.5 py-1 text-xs font-semibold">
                  {user.role === 'CLIENT' ? 'Client' : user.role}
                </span>
                {memberSince && (
                  <span className="text-ink-500 flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    Membre depuis {memberSince}
                  </span>
                )}
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={openEdit}
              aria-expanded={editMode}
              aria-controls={editMode ? 'profile-edit' : undefined}
              className="border-ink-100 text-tomato-700 hover:border-tomato-200 hover:bg-tomato-50 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors"
            >
              <Edit2 className="size-4" aria-hidden />
              Modifier le profil
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              { label: 'Commandes', value: totalOrders, icon: ShoppingBag },
              {
                label: 'Livrées (page récente)',
                value: ordersLoading ? '…' : ordersError || !ordersPage ? '—' : completedOrders,
                icon: Check,
              },
              {
                label: 'Montant (page récente)',
                value: ordersLoading
                  ? '…'
                  : ordersError || !ordersPage
                    ? '—'
                    : formatCurrency(totalSpent),
                icon: Star,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-[#faf7f2] px-3 py-3"
              >
                <Icon className="text-tomato-700 size-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-display text-ink-900 font-extrabold">{value}</p>
                  <p className="text-ink-500 text-sm">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)] lg:gap-8">
          <div className="min-w-0">
            {/* ── Edit profile modal ────────────────────────────── */}
            <AnimatePresence>
              {editMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  id="profile-edit"
                  className="border-ink-100 mb-4 rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-ink-900 text-xl font-extrabold">
                      Modifier le profil
                    </h2>
                    <button
                      onClick={() => setEditMode(false)}
                      aria-label="Fermer le formulaire"
                      className="hover:bg-cream-100 grid size-11 place-items-center rounded-full transition-colors"
                    >
                      <X className="text-ink-500 h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label
                        htmlFor="profile-name"
                        className="text-ink-900 mb-1.5 block text-sm font-semibold"
                      >
                        Nom complet
                      </label>

                      <input
                        id="profile-name"
                        type="text"
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        placeholder="Votre nom"
                        className="border-cream-300 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="profile-phone"
                        className="text-ink-900 mb-1.5 block text-sm font-semibold"
                      >
                        Téléphone
                      </label>

                      <input
                        id="profile-phone"
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+242 06 XXX XX XX"
                        className="border-cream-300 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setEditMode(false)}
                        className="text-ink-700 border-cream-300 hover:bg-cream-100 flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                        className="bg-tomato-600 hover:bg-tomato-700 flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                      >
                        {updateProfile.isPending ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Notifications push ───────────────────────────── */}
            <PushToggle />

            {/* ── Infos personnelles ────────────────────────────── */}
            <div className="border-ink-100 divide-ink-100 mb-4 divide-y rounded-2xl border bg-white">
              <div className="border-cream-100 flex items-center gap-2 border-b px-4 py-3">
                <Shield className="text-ink-500 h-3.5 w-3.5" />
                <h2 className="font-display text-ink-900 text-xl font-extrabold">Informations</h2>
              </div>
              {[
                { icon: User, label: 'Nom', value: user.nom ?? '—' },
                { icon: Mail, label: 'Email', value: user.email },
                { icon: Phone, label: 'Téléphone', value: user.phone ?? 'Non renseigné' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="bg-cream-100 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl">
                    <Icon className="text-ink-500 h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-500 text-xs">{label}</p>
                    <p className="text-ink-900 text-sm font-medium wrap-anywhere">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Adresses ─────────────────────────────────────── */}
            <div className="border-ink-100 mb-4 overflow-hidden rounded-2xl border bg-white">
              <div className="border-cream-100 flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPin className="text-ink-500 h-3.5 w-3.5" />
                  <h2 className="font-display text-ink-900 text-xl font-extrabold">Mes adresses</h2>
                </div>
                <button
                  onClick={() => setShowAddressForm((v) => !v)}
                  aria-expanded={showAddressForm}
                  className="bg-tomato-50 text-tomato-700 hover:bg-tomato-100 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </button>
              </div>

              <AnimatePresence>
                {showAddressForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-cream-100 border-ink-100 overflow-hidden border-b px-4 py-3"
                  >
                    <div className="flex flex-col gap-2">
                      <select
                        value={newQuartierId}
                        onChange={(e) => setNewQuartierId(e.target.value)}
                        className="border-cream-300 text-ink-900 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                      >
                        <option value="">Quartier (obligatoire)</option>
                        {quartiers.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.nom}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newRue}
                        onChange={(e) => setNewRue(e.target.value)}
                        placeholder="Rue / Précision (ex: Rue Mfilou, face pharmacie)"
                        className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newLandmark}
                        onChange={(e) => setNewLandmark(e.target.value)}
                        maxLength={300}
                        placeholder="Repères pour le livreur (ex: portail bleu, face à la pharmacie)"
                        className="border-cream-300 text-ink-900 placeholder:text-ink-500 focus:ring-tomato-500/20 focus:border-tomato-500 w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowAddressForm(false);
                            setNewRue('');
                            setNewQuartierId('');
                            setNewLandmark('');
                          }}
                          className="text-ink-500 border-cream-300 hover:bg-cream-100 flex-1 rounded-xl border bg-white py-2 text-sm transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleSaveAddress}
                          disabled={!newRue.trim() || savingAddress}
                          className="bg-tomato-600 hover:bg-tomato-700 flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
                        >
                          {savingAddress ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" /> Enregistrer
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {adressesLoading && (
                <div className="flex flex-col gap-2 px-4 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="skeleton h-12 rounded-xl" />
                  ))}
                </div>
              )}

              {adressesError && (
                <div role="alert" className="px-4 py-4 text-sm text-rose-700">
                  <p>Impossible de charger vos adresses.</p>
                  <button
                    type="button"
                    disabled={adressesFetching}
                    onClick={() => void refetchAdresses()}
                    className="mt-2 underline disabled:opacity-50"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {!adressesLoading && !adressesError && adresses.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <MapPin className="text-ink-300 mx-auto mb-2 h-8 w-8" />
                  <p className="text-ink-500 text-sm">Aucune adresse enregistrée</p>
                </div>
              )}

              {adresses.map((adresse, i) => (
                <div
                  key={adresse.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3.5',
                    i < adresses.length - 1 ? 'border-cream-100 border-b' : '',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl',
                      adresse.isDefault ? 'bg-tomato-100' : 'bg-cream-100',
                    )}
                  >
                    <MapPin
                      className={cn(
                        'h-3.5 w-3.5',
                        adresse.isDefault ? 'text-tomato-700' : 'text-ink-500',
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-ink-900 truncate text-sm font-medium">{adresse.rue}</p>
                      {adresse.isDefault && (
                        <span className="bg-tomato-100 text-tomato-700 flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium">
                          Défaut
                        </span>
                      )}
                    </div>
                    <p className="text-ink-500 text-xs">
                      {adresse.ville}
                      {adresse.quartier ? ` — ${adresse.quartier.nom}` : ''}
                    </p>
                    <AddressPrecisionHint adresse={adresse} />
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!adresse.isDefault && (
                      <button
                        disabled={addressBusy || adressesError}
                        onClick={() => changeAddress(adresse.id, false)}
                        className="hover:bg-tomato-100 text-ink-500 hover:text-tomato-700 rounded-lg p-1.5 transition-colors"
                        title="Définir par défaut"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      disabled={addressBusy || adressesError}
                      onClick={() => changeAddress(adresse.id, true)}
                      className="text-ink-500 rounded-lg p-1.5 transition-colors hover:bg-rose-50 hover:text-rose-500"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Commandes récentes ───────────────────────────── */}
            {recentOrders.length > 0 && (
              <div className="border-ink-100 mb-4 overflow-hidden rounded-2xl border bg-white">
                <div className="border-cream-100 flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="text-ink-500 h-3.5 w-3.5" />
                    <h2 className="font-display text-ink-900 text-xl font-extrabold">
                      Commandes récentes
                    </h2>
                  </div>
                  <Link
                    href="/commandes"
                    className="text-tomato-700 hover:text-ink-900 text-xs font-medium"
                  >
                    Tout voir
                  </Link>
                </div>
                {recentOrders.map((order, i) => (
                  <Link
                    key={order.id}
                    href={`/commandes/${order.id}`}
                    className={cn(
                      'hover:bg-cream-100 flex items-center gap-3 px-4 py-3.5 transition-colors',
                      i < recentOrders.length - 1 ? 'border-cream-100 border-b' : '',
                    )}
                  >
                    <div className="bg-cream-100 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl">
                      <ShoppingBag className="text-ink-500 h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-900 truncate text-sm font-medium">
                        {order.restaurant?.nom ?? 'Restaurant'}
                      </p>
                      <p className="text-ink-500 text-xs">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p className="text-ink-900 text-sm font-semibold">
                          {formatCurrency(order.total)}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getOrderStatusColor(order.status)}`}
                        >
                          {formatOrderStatus(order.status)}
                        </span>
                      </div>
                      <ChevronRight className="text-ink-300 h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <aside className="min-w-0" aria-label="Avantages et raccourcis du compte">
            {/* ── Points de fidélité ──────────────────────────── */}
            <div className="border-tomato-100 bg-tomato-50 text-ink-900 mb-4 rounded-2xl border p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="text-tomato-700 size-5" aria-hidden />
                  <h2 className="font-display text-ink-900 text-xl font-extrabold">
                    Points de fidélité
                  </h2>
                </div>
                <button
                  onClick={() => setShowLoyalty((v) => !v)}
                  className="text-tomato-700 hover:bg-tomato-100 inline-flex min-h-11 items-center rounded-full bg-white px-3 text-sm font-semibold transition-colors"
                >
                  {showLoyalty ? 'Masquer' : 'Historique'}
                </button>
              </div>

              <div className="mb-3 flex items-end gap-2">
                <span className="text-4xl leading-none font-bold">{loyaltyPoints}</span>
                <span className="text-ink-500 mb-1 text-sm">points</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white p-2.5 text-center">
                  <p className="text-ink-700">Valeur</p>
                  <p className="text-sm font-bold">
                    {formatCurrency(pointsToXaf(loyaltyPoints, pricing))}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2.5 text-center">
                  <p className="text-ink-700">Comment gagner</p>
                  <p className="text-sm font-bold">
                    {pricing?.loyaltyPointsPerOrder ?? 1} pt / commande livrée
                  </p>
                </div>
              </div>

              <AnimatePresence>
                {showLoyalty && loyaltyTxs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="divide-ink-100 divide-y rounded-xl bg-white">
                      {loyaltyTxs.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between px-3 py-2.5 text-xs"
                        >
                          <span className="text-ink-700 mr-2 flex-1 truncate">{tx.reason}</span>
                          <span
                            className={`shrink-0 font-bold ${tx.points > 0 ? 'text-success' : 'text-ink-700'}`}
                          >
                            {tx.points > 0 ? '+' : ''}
                            {tx.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {showLoyalty && loyaltyTxs.length === 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-ink-500 mt-3 text-center text-xs"
                  >
                    Aucune transaction pour l&apos;instant
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Parrainage ──────────────────────────────────── */}
            <div className="border-ink-100 mb-4 rounded-2xl border bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                  <Gift className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-display text-ink-900 text-xl font-extrabold">Parrainage</h2>
                  <p className="text-ink-500 text-xs">Invitez vos amis et gagnez des points</p>
                </div>
              </div>

              {referralStats?.referralCode && (
                <div className="bg-cream-100 mb-4 flex items-center justify-between gap-3 rounded-xl p-3">
                  <div>
                    <p className="text-ink-500 mb-0.5 text-xs">Votre code</p>
                    <p className="text-ink-900 text-lg font-bold tracking-widest">
                      {referralStats.referralCode}
                    </p>
                  </div>
                  <button
                    onClick={copyReferralCode}
                    className="bg-tomato-600 hover:bg-tomato-700 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-white transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copier
                  </button>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="bg-cream-100 rounded-xl p-3 text-center">
                  <p className="text-ink-900 text-2xl font-bold">
                    {referralStats?.totalReferrals ?? 0}
                  </p>
                  <p className="text-ink-500 mt-0.5 text-xs">Amis parrainés</p>
                </div>
                <div className="bg-cream-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {referralStats?.rewardedReferrals ?? 0}
                  </p>
                  <p className="text-ink-500 mt-0.5 text-xs">Récompenses reçues</p>
                </div>
              </div>

              <div className="space-y-1 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
                {/* Le filleul ne reçoit plus rien : seul le parrain est récompensé,
              et seulement quand la première commande est LIVRÉE. Annoncer un
              bonus d'inscription était devenu faux. */}
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" /> Votre filleul se fait livrer sa
                  1ʳᵉ commande → vous gagnez{' '}
                  <strong>+{pricing?.referrerBonusPoints ?? 1} pt</strong> (
                  {formatCurrency(pointsToXaf(pricing?.referrerBonusPoints ?? 1, pricing))})
                </div>
                <div className="flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 shrink-0" /> Récompense acquise à la livraison, pas à
                  l&apos;inscription
                </div>
              </div>
            </div>

            {/* ── Liens rapides ────────────────────────────────── */}
            <div className="border-ink-100 divide-ink-100 mb-6 divide-y rounded-2xl border bg-white">
              <div className="border-cream-100 flex items-center gap-2 border-b px-4 py-3">
                <h2 className="font-display text-ink-900 text-xl font-extrabold">Navigation</h2>
              </div>
              <Link
                href="/commandes"
                className="hover:bg-cream-100 group flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <div className="bg-tomato-100 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl">
                  <Package className="text-tomato-700 h-3.5 w-3.5" />
                </div>
                <span className="text-ink-900 flex-1 text-sm font-medium">Mes commandes</span>
                <ChevronRight className="text-ink-300 group-hover:text-ink-500 h-4 w-4 transition-colors" />
              </Link>
              {/* F3-06 — réclamations et réponses du service client. */}
              <Link
                href="/demandes"
                className="hover:bg-cream-100 group flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <span className="text-ink-900 flex-1 text-sm font-medium">Mes demandes</span>
                <ChevronRight className="text-ink-300 group-hover:text-ink-500 h-4 w-4 transition-colors" />
              </Link>
              <Link
                href="/restaurants"
                className="hover:bg-cream-100 group flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="text-ink-900 flex-1 text-sm font-medium">
                  Explorer les restaurants
                </span>
                <ChevronRight className="text-ink-300 group-hover:text-ink-500 h-4 w-4 transition-colors" />
              </Link>
            </div>

            {/* ── Déconnexion ──────────────────────────────────── */}
            <button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 py-3.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              {signOutLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Se déconnecter
            </button>
            <DeleteAccount />
          </aside>
        </div>
      </div>
    </div>
  );
}
