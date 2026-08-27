'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import {
  User, Mail, Phone, LogOut, Edit2, ChevronRight,
  Package, MapPin, Plus, Trash2, Check, X, Star,
  ShoppingBag, Clock, Shield, Gift, Copy, Zap, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import {
  useProfile, useUpdateProfile,
  useMyOrders,
  useAdresses, useCreateAdresse, useSetDefaultAdresse, useDeleteAdresse,
  useQuartiers,
  useReferralStats, useLoyaltyTransactions,
} from '@lilia/api-client';
import { formatCurrency, formatDateTime, formatOrderStatus, getOrderStatusColor, getInitials, cn } from '@lilia/utils';
import { pageVariants } from '@lilia/motion';
import { toast } from 'sonner';

export default function ProfilPage() {
  const router = useRouter();
  const { user: storeUser, token, signOut: storeSignOut, setUser } = useAuthStore();

  const { data: profile } = useProfile(token);
  const updateProfile = useUpdateProfile(token);
  const { data: orders = [] } = useMyOrders(token);
  const { data: adresses = [], isLoading: adressesLoading } = useAdresses(token);
  const createAdresse = useCreateAdresse(token);
  const setDefault = useSetDefaultAdresse(token);
  const deleteAdresse = useDeleteAdresse(token);
  const { data: quartiers = [] } = useQuartiers();
  const { data: referralStats } = useReferralStats(token);
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
  const [savingAddress, setSavingAddress] = useState(false);

  // Sign out
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Loyalty
  const [showLoyalty, setShowLoyalty] = useState(false);

  function copyReferralCode() {
    if (!referralStats?.referralCode) return;
    navigator.clipboard.writeText(referralStats.referralCode);
    toast.success('Code copié !');
  }

  function openEdit() {
    setEditNom(user?.nom ?? '');
    setEditPhone(user?.phone ?? '');
    setEditMode(true);
  }

  async function handleSaveProfile() {
    try {
      const res = await updateProfile.mutateAsync({
        nom: editNom.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      if (res.user) setUser(res.user);
      toast.success('Profil mis à jour');
      setEditMode(false);
    } catch {
      toast.error('Impossible de mettre à jour le profil');
    }
  }

  async function handleSaveAddress() {
    if (!newRue.trim()) return;
    setSavingAddress(true);
    try {
      await createAdresse.mutateAsync({ rue: newRue.trim(), ville: 'Brazzaville', country: 'Congo', quartierId: newQuartierId || undefined });
      setShowAddressForm(false);
      setNewRue('');
      setNewQuartierId('');
      toast.success('Adresse enregistrée');
    } catch {
      toast.error('Impossible d\'enregistrer l\'adresse');
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    try {
      await signOut(auth);
      storeSignOut();
      toast.success('Déconnexion réussie');
      router.push('/');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setSignOutLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="skeleton h-40 rounded-3xl mb-6" />
        <div className="skeleton h-32 rounded-2xl mb-4" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  // Stats from orders
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const completedOrders = orders.filter((o) => o.status === 'LIVRER').length;
  const recentOrders = orders.slice(0, 3);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-2xl mx-auto px-4 sm:px-6 py-10 min-h-screen"
    >
      {/* ── Hero card ─────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-tomato-600 to-tomato-700 rounded-3xl p-6 mb-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.nom ?? ''}
                width={80}
                height={80}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-4 border-white/30 shadow-lg">
                <span className="text-3xl font-bold text-white">{getInitials(user.nom)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-bold text-white truncate">{user.nom ?? 'Utilisateur'}</h1>
            <p className="text-white text-sm truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
                {user.role === 'CLIENT' ? 'Client' : user.role}
              </span>
              {memberSince && (
                <span className="flex items-center gap-1 text-white text-xs">
                  <Clock className="w-3 h-3" />
                  Membre depuis {memberSince}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={openEdit}
            className="flex-shrink-0 w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-colors border border-white/30"
          >
            <Edit2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Commandes', value: totalOrders, icon: ShoppingBag },
            { label: 'Livrées', value: completedOrders, icon: Check },
            { label: 'Dépensé', value: formatCurrency(totalSpent), icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
              <Icon className="w-4 h-4 text-white mx-auto mb-1" />
              <p className="text-white font-bold text-sm leading-none">{value}</p>
              <p className="text-white text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit profile modal ────────────────────────────── */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-cream-200 p-5 mb-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink-900">Modifier le profil</h3>
              <button onClick={() => setEditMode(false)} className="p-1.5 hover:bg-cream-200 rounded-lg transition-colors">
                <X className="w-4 h-4 text-ink-500" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full text-sm border border-cream-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-tomato-500/20 focus:border-tomato-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+242 06 XXX XX XX"
                  className="w-full text-sm border border-cream-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-tomato-500/20 focus:border-tomato-500 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2.5 text-sm text-ink-700 border border-cream-300 rounded-xl hover:bg-cream-100 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="flex-1 py-2.5 text-sm bg-tomato-600 text-white rounded-xl hover:bg-tomato-700 transition-colors font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {updateProfile.isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Enregistrer</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Infos personnelles ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 mb-4">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-cream-100">
          <Shield className="w-3.5 h-3.5 text-ink-500" />
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Informations</span>
        </div>
        {[
          { icon: User, label: 'Nom', value: user.nom ?? '—' },
          { icon: Mail, label: 'Email', value: user.email },
          { icon: Phone, label: 'Téléphone', value: user.phone ?? 'Non renseigné' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 bg-cream-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-ink-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-500">{label}</p>
              <p className="text-sm font-medium text-ink-900 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Adresses ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-cream-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-cream-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Mes adresses</span>
          </div>
          <button
            onClick={() => setShowAddressForm((v) => !v)}
            className="flex items-center gap-1 text-xs text-tomato-700 font-medium hover:text-tomato-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </div>

        <AnimatePresence>
          {showAddressForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 bg-cream-100 border-b border-cream-200 overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <select
                  value={newQuartierId}
                  onChange={(e) => setNewQuartierId(e.target.value)}
                  className="w-full text-sm border border-cream-300 bg-white text-ink-900 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-tomato-500/20 focus:border-tomato-500 transition-all"
                >
                  <option value="">Quartier (optionnel)</option>
                  {quartiers.map((q) => (
                    <option key={q.id} value={q.id}>{q.nom}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newRue}
                  onChange={(e) => setNewRue(e.target.value)}
                  placeholder="Rue / Précision (ex: Rue Mfilou, face pharmacie)"
                  className="w-full text-sm border border-cream-300 bg-white text-ink-900 placeholder:text-ink-500 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-tomato-500/20 focus:border-tomato-500 transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddressForm(false); setNewRue(''); setNewQuartierId(''); }}
                    className="flex-1 py-2 text-sm text-ink-500 border border-cream-300 rounded-xl bg-white hover:bg-cream-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={!newRue.trim() || savingAddress}
                    className="flex-1 py-2 text-sm bg-tomato-600 text-white font-medium rounded-xl hover:bg-tomato-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                  >
                    {savingAddress ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Check className="w-3.5 h-3.5" /> Enregistrer</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {adressesLoading && (
          <div className="px-4 py-4 flex flex-col gap-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        )}

        {!adressesLoading && adresses.length === 0 && (
          <div className="px-4 py-6 text-center">
            <MapPin className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Aucune adresse enregistrée</p>
          </div>
        )}

        {adresses.map((adresse, i) => (
          <div
            key={adresse.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3.5',
              i < adresses.length - 1 ? 'border-b border-cream-100' : '',
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
              adresse.isDefault ? 'bg-tomato-100' : 'bg-cream-100',
            )}>
              <MapPin className={cn('w-3.5 h-3.5', adresse.isDefault ? 'text-tomato-700' : 'text-ink-500')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-900 truncate">{adresse.rue}</p>
                {adresse.isDefault && (
                  <span className="flex-shrink-0 text-xs bg-tomato-100 text-tomato-700 px-1.5 py-0.5 rounded-full font-medium">
                    Défaut
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500">{adresse.ville}{adresse.quartier ? ` — ${adresse.quartier.nom}` : ''}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!adresse.isDefault && (
                <button
                  onClick={() => setDefault.mutate(adresse.id)}
                  className="p-1.5 hover:bg-tomato-100 text-ink-500 hover:text-tomato-700 rounded-lg transition-colors"
                  title="Définir par défaut"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => deleteAdresse.mutate(adresse.id)}
                className="p-1.5 hover:bg-rose-50 text-ink-500 hover:text-rose-500 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Points de fidélité ──────────────────────────── */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 mb-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-bold text-base">Points de fidélité</span>
          </div>
          <button
            onClick={() => setShowLoyalty((v) => !v)}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors font-medium"
          >
            {showLoyalty ? 'Masquer' : 'Historique'}
          </button>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold leading-none">{(referralStats?.loyaltyPoints ?? user?.loyaltyPoints ?? 0)}</span>
          <span className="text-orange-200 text-sm mb-1">points</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-orange-100">Valeur</p>
            <p className="font-bold text-sm">{((referralStats?.loyaltyPoints ?? 0) * 5).toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-orange-100">Comment gagner</p>
            <p className="font-bold text-sm">1 pt / 100 FCFA</p>
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
              <div className="bg-white/10 rounded-xl divide-y divide-white/10">
                {loyaltyTxs.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 text-xs">
                    <span className="text-orange-100 truncate flex-1 mr-2">{tx.reason}</span>
                    <span className={`font-bold shrink-0 ${tx.points > 0 ? 'text-white' : 'text-orange-300'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points} pts
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
              className="mt-3 text-center text-xs text-orange-200"
            >
              Aucune transaction pour l&apos;instant
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Parrainage ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Gift className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-ink-900 text-sm">Programme de parrainage</p>
            <p className="text-xs text-ink-500">Invitez vos amis et gagnez des points</p>
          </div>
        </div>

        {referralStats?.referralCode && (
          <div className="bg-cream-100 rounded-xl p-3 flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs text-ink-500 mb-0.5">Votre code</p>
              <p className="text-lg font-bold text-ink-900 tracking-widest">{referralStats.referralCode}</p>
            </div>
            <button
              onClick={copyReferralCode}
              className="flex items-center gap-1.5 px-3 py-2 bg-tomato-600 hover:bg-tomato-700 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copier
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-cream-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-ink-900">{referralStats?.totalReferrals ?? 0}</p>
            <p className="text-xs text-ink-500 mt-0.5">Amis parrainés</p>
          </div>
          <div className="bg-cream-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{referralStats?.rewardedReferrals ?? 0}</p>
            <p className="text-xs text-ink-500 mt-0.5">Récompenses reçues</p>
          </div>
        </div>

        <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 space-y-1">
          <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 shrink-0" /> Votre ami commande → vous gagnez <strong>+500 pts</strong> (2 500 FCFA)</div>
          <div className="flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 shrink-0" /> Votre ami reçoit <strong>+200 pts</strong> bonus à l&apos;inscription</div>
        </div>
      </div>

      {/* ── Commandes récentes ───────────────────────────── */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-cream-200 mb-4 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-cream-100">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-ink-500" />
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Commandes récentes</span>
            </div>
            <Link href="/commandes" className="text-xs text-tomato-700 font-medium hover:text-tomato-700">
              Tout voir
            </Link>
          </div>
          {recentOrders.map((order, i) => (
            <Link
              key={order.id}
              href={`/commandes/${order.id}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 hover:bg-cream-100 transition-colors',
                i < recentOrders.length - 1 ? 'border-b border-cream-100' : '',
              )}
            >
              <div className="w-8 h-8 bg-cream-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 text-ink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">
                  {order.restaurant?.nom ?? 'Restaurant'}
                </p>
                <p className="text-xs text-ink-500">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink-900">{formatCurrency(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getOrderStatusColor(order.status)}`}>
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-300" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Liens rapides ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 mb-6">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-cream-100">
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Navigation</span>
        </div>
        <Link href="/commandes" className="flex items-center gap-3 px-4 py-3.5 hover:bg-cream-100 transition-colors group">
          <div className="w-8 h-8 bg-tomato-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-3.5 h-3.5 text-tomato-700" />
          </div>
          <span className="text-sm font-medium text-ink-900 flex-1">Mes commandes</span>
          <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
        </Link>
        <Link href="/restaurants" className="flex items-center gap-3 px-4 py-3.5 hover:bg-cream-100 transition-colors group">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-sm font-medium text-ink-900 flex-1">Explorer les restaurants</span>
          <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
        </Link>
      </div>

      {/* ── Déconnexion ──────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        disabled={signOutLoading}
        className="w-full flex items-center justify-center gap-2 py-3.5 border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-sm rounded-2xl transition-colors"
      >
        {signOutLoading ? (
          <span className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
        Se déconnecter
      </button>
    </motion.div>
  );
}
