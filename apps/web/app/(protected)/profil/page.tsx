'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import {
  User, Mail, Phone, LogOut, Edit2, ChevronRight,
  Package, MapPin, Plus, Trash2, Check, X, Star,
  ShoppingBag, Clock, Shield, Camera,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import {
  useProfile, useUpdateProfile,
  useMyOrders,
  useAdresses, useCreateAdresse, useSetDefaultAdresse, useDeleteAdresse,
} from '@lilia/api-client';
import { formatCurrency, formatDateTime, formatOrderStatus, getOrderStatusColor, getInitials, cn } from '@lilia/utils';
import { pageVariants, cardVariants } from '@lilia/motion';
import { toast } from 'sonner';

export default function ProfilPage() {
  const router = useRouter();
  const { user: storeUser, token, signOut: storeSignOut, setUser } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useProfile(token);
  const updateProfile = useUpdateProfile(token);
  const { data: orders = [] } = useMyOrders(token);
  const { data: adresses = [], isLoading: adressesLoading } = useAdresses(token);
  const createAdresse = useCreateAdresse(token);
  const setDefault = useSetDefaultAdresse(token);
  const deleteAdresse = useDeleteAdresse(token);

  const user = profile ?? storeUser;

  // Edit profile
  const [editMode, setEditMode] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // New address
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newRue, setNewRue] = useState('');
  const [newVille, setNewVille] = useState('Brazzaville');
  const [savingAddress, setSavingAddress] = useState(false);

  // Sign out
  const [signOutLoading, setSignOutLoading] = useState(false);

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
      await createAdresse.mutateAsync({ rue: newRue.trim(), ville: newVille.trim(), country: 'Congo' });
      setShowAddressForm(false);
      setNewRue('');
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

  if (!user) return null;

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
      <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-6 mb-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.nom ?? ''}
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
            <p className="text-primary-200 text-sm truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30">
                {user.role === 'CLIENT' ? 'Client' : user.role}
              </span>
              {memberSince && (
                <span className="flex items-center gap-1 text-primary-200 text-xs">
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
              <Icon className="w-4 h-4 text-primary-200 mx-auto mb-1" />
              <p className="text-white font-bold text-sm leading-none">{value}</p>
              <p className="text-primary-200 text-xs mt-0.5">{label}</p>
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
            className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5 mb-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-800">Modifier le profil</h3>
              <button onClick={() => setEditMode(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+242 06 XXX XX XX"
                  className="w-full text-sm border border-zinc-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="flex-1 py-2.5 text-sm bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5"
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
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border divide-y divide-zinc-50 dark:divide-dark-border mb-4">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-zinc-50 dark:border-dark-border">
          <Shield className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Informations</span>
        </div>
        {[
          { icon: User, label: 'Nom', value: user.nom ?? '—' },
          { icon: Mail, label: 'Email', value: user.email },
          { icon: Phone, label: 'Téléphone', value: user.phone ?? 'Non renseigné' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 bg-zinc-50 dark:bg-dark-surface rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Adresses ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border mb-4 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-50 dark:border-dark-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Mes adresses</span>
          </div>
          <button
            onClick={() => setShowAddressForm((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors"
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
              className="px-4 py-3 bg-zinc-50 dark:bg-dark-surface border-b border-zinc-100 dark:border-dark-border overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newRue}
                  onChange={(e) => setNewRue(e.target.value)}
                  placeholder="Rue / Quartier (ex: Moungali, Rue Mfilou)"
                  className="w-full text-sm border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
                <input
                  type="text"
                  value={newVille}
                  onChange={(e) => setNewVille(e.target.value)}
                  placeholder="Ville"
                  className="w-full text-sm border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddressForm(false)}
                    className="flex-1 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={!newRue.trim() || savingAddress}
                    className="flex-1 py-2 text-sm bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
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
            <MapPin className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Aucune adresse enregistrée</p>
          </div>
        )}

        {adresses.map((adresse, i) => (
          <div
            key={adresse.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3.5',
              i < adresses.length - 1 ? 'border-b border-zinc-50' : '',
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
              adresse.isDefault ? 'bg-primary-50' : 'bg-zinc-50',
            )}>
              <MapPin className={cn('w-3.5 h-3.5', adresse.isDefault ? 'text-primary-500' : 'text-zinc-400')} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{adresse.rue}</p>
                {adresse.isDefault && (
                  <span className="flex-shrink-0 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                    Défaut
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{adresse.ville}{adresse.quartier ? ` — ${adresse.quartier.nom}` : ''}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!adresse.isDefault && (
                <button
                  onClick={() => setDefault.mutate(adresse.id)}
                  className="p-1.5 hover:bg-primary-50 text-zinc-400 hover:text-primary-600 rounded-lg transition-colors"
                  title="Définir par défaut"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => deleteAdresse.mutate(adresse.id)}
                className="p-1.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Commandes récentes ───────────────────────────── */}
      {recentOrders.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border mb-4 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-50 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Commandes récentes</span>
            </div>
            <Link href="/commandes" className="text-xs text-primary-600 font-medium hover:text-primary-700">
              Tout voir
            </Link>
          </div>
          {recentOrders.map((order, i) => (
            <Link
              key={order.id}
              href={`/commandes/${order.id}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors',
                i < recentOrders.length - 1 ? 'border-b border-zinc-50' : '',
              )}
            >
              <div className="w-8 h-8 bg-zinc-50 dark:bg-dark-surface rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {order.restaurant?.nom ?? 'Restaurant'}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-800">{formatCurrency(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getOrderStatusColor(order.status)}`}>
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Liens rapides ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-100 divide-y divide-zinc-50 mb-6">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-zinc-50 dark:border-dark-border">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Navigation</span>
        </div>
        <Link href="/commandes" className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors group">
          <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-3.5 h-3.5 text-primary-500" />
          </div>
          <span className="text-sm font-medium text-zinc-800 flex-1">Mes commandes</span>
          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
        </Link>
        <Link href="/restaurants" className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition-colors group">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-sm font-medium text-zinc-800 flex-1">Explorer les restaurants</span>
          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
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
