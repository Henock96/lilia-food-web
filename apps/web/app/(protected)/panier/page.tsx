'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, Tag,
  MapPin, Phone, ChevronDown, Check, Store, Bike, Plus as PlusIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useCreateOrder,
  useAdresses,
  useCreateAdresse,
  useProfile,
  useQuartiers,
  apiClient,
} from '@lilia/api-client';
import type { ValidatePromoDto, PromoValidationResult } from '@lilia/types';
import { formatCurrency, cn } from '@lilia/utils';
import { pageVariants, containerVariants, cardVariants } from '@lilia/motion';
import { toast } from 'sonner';

export default function PanierPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { data: cart, isLoading } = useCart(token);
  const updateItem = useUpdateCartItem(token);
  const removeItem = useRemoveCartItem(token);
  const createOrder = useCreateOrder(token);
  const { data: adresses = [] } = useAdresses(token);
  const createAdresse = useCreateAdresse(token);
  const { data: profile } = useProfile(token);
  const { data: quartiers = [] } = useQuartiers();

  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'MTN_MOMO' | 'CASH_ON_DELIVERY'>('MTN_MOMO');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isDelivery, setIsDelivery] = useState(true);
  const [selectedAdresseId, setSelectedAdresseId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Pre-fill phone from profile
  const profilePhone = profile?.phone ?? null;
  useEffect(() => {
    if (profilePhone) setContactPhone((prev) => prev || profilePhone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilePhone]);

  // Auto-select default address
  useEffect(() => {
    if (adresses.length > 0 && !selectedAdresseId) {
      const def = adresses.find((a) => a.isDefault) ?? adresses[0];
      if (def) setSelectedAdresseId(def.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adresses.length]);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newRue, setNewRue] = useState('');
  const [newQuartierId, setNewQuartierId] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="skeleton h-8 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  const subTotal = items.reduce(
    (sum, item) => sum + (item.variant?.prix ?? 0) * item.quantite,
    0,
  );
  const deliveryFee = isDelivery ? 1000 : 0;
  const serviceFee = Math.round(subTotal * 0.1);
  const discount = promoResult?.discountAmount ?? 0;
  const total = subTotal + deliveryFee + serviceFee - discount;

  async function handleValidatePromo() {
    if (!promoCode.trim() || !cart?.items[0]) return;
    setPromoLoading(true);
    const restaurantId = cart.items[0].product?.restaurantId ?? '';
    try {
      const result = await apiClient<PromoValidationResult>('/promo/validate', {
        method: 'POST',
        token,
        body: JSON.stringify({ code: promoCode, restaurantId, subTotal, deliveryFee } satisfies ValidatePromoDto),
      });
      setPromoResult(result);
      if (result.valid) {
        toast.success(`Code appliqué ! -${formatCurrency(result.discountAmount ?? 0)}`);
      } else {
        toast.error(result.error ?? 'Code invalide');
      }
    } catch {
      toast.error('Code promo invalide');
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleSaveAddress() {
    if (!newRue.trim()) return;
    setSavingAddress(true);
    try {
      const adresse = await createAdresse.mutateAsync({
        rue: newRue.trim(),
        ville: 'Brazzaville',
        country: 'Congo',
        quartierId: newQuartierId || undefined,
      });
      setSelectedAdresseId(adresse.id);
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

  async function handleCheckout() {
    if (isDelivery && !selectedAdresseId) {
      toast.error('Veuillez sélectionner une adresse de livraison');
      return;
    }
    setCheckoutLoading(true);
    try {
      const result = await createOrder.mutateAsync({
        paymentMethod,
        isDelivery,
        adresseId: isDelivery ? (selectedAdresseId ?? undefined) : undefined,
        notes: notes || undefined,
        contactPhone: contactPhone.trim() || undefined,
        promoCode: promoResult?.valid ? promoCode : undefined,
      });
      toast.success('Commande passée avec succès !');
      router.push(`/commandes/${result.id}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message;
      toast.error(msg ?? 'Impossible de passer la commande');
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-h-screen"
    >
      <h1 className="text-2xl font-bold text-zinc-900 mb-8" style={{ fontFamily: 'var(--font-display)' }}>
        Mon panier
      </h1>

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-800 text-lg">Votre panier est vide</p>
            <p className="text-zinc-500 text-sm mt-1">Ajoutez des plats depuis un restaurant</p>
          </div>
          <a
            href="/restaurants"
            className="mt-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-2xl hover:bg-primary-600 transition-colors"
          >
            Voir les restaurants
          </a>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — items + delivery details */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Items */}
            <motion.div variants={containerVariants} initial="initial" animate="animate" className="flex flex-col gap-3">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={cardVariants}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    layout
                    className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4 flex items-center gap-4"
                  >
                    {item.product?.imageUrl && (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.nom}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{item.product?.nom}</p>
                      {item.variant?.label && (
                        <p className="text-xs text-zinc-400">{item.variant.label}</p>
                      )}
                      <p className="font-bold text-primary-600 text-sm mt-0.5">
                        {formatCurrency((item.variant?.prix ?? 0) * item.quantite)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantite === 1) {
                            removeItem.mutate(item.id);
                          } else {
                            updateItem.mutate({ itemId: item.id, quantite: item.quantite - 1 });
                          }
                        }}
                        className="w-7 h-7 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center transition-colors"
                      >
                        {item.quantite === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                      </button>
                      <span className="w-6 text-center font-semibold text-sm text-zinc-900">{item.quantite}</span>
                      <button
                        onClick={() => updateItem.mutate({ itemId: item.id, quantite: item.quantite + 1 })}
                        className="w-7 h-7 bg-primary-100 hover:bg-primary-200 rounded-full flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary-600" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Delivery mode */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Mode de réception</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsDelivery(true)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                    isDelivery
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300',
                  )}
                >
                  <Bike className="w-5 h-5" />
                  Livraison
                </button>
                <button
                  onClick={() => setIsDelivery(false)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                    !isDelivery
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300',
                  )}
                >
                  <Store className="w-5 h-5" />
                  Retrait
                </button>
              </div>
            </div>

            {/* Address selection (delivery only) */}
            <AnimatePresence>
              {isDelivery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl border border-zinc-100 p-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-zinc-700">Adresse de livraison</p>
                    <button
                      onClick={() => setShowAddressForm((v) => !v)}
                      className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      Nouvelle adresse
                    </button>
                  </div>

                  {/* Saved addresses */}
                  {adresses.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      {adresses.map((adresse) => (
                        <button
                          key={adresse.id}
                          onClick={() => setSelectedAdresseId(adresse.id)}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                            selectedAdresseId === adresse.id
                              ? 'border-primary-300 bg-primary-50'
                              : 'border-zinc-200 hover:border-zinc-300',
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                            selectedAdresseId === adresse.id ? 'border-primary-500' : 'border-zinc-300',
                          )}>
                            {selectedAdresseId === adresse.id && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{adresse.rue}</p>
                            <p className="text-xs text-zinc-500">{adresse.ville}{adresse.quartier ? ` — ${adresse.quartier.nom}` : ''}</p>
                          </div>
                          {adresse.isDefault && (
                            <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                              Défaut
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {adresses.length === 0 && !showAddressForm && (
                    <p className="text-sm text-zinc-400 text-center py-2">
                      Aucune adresse enregistrée — ajoutez-en une
                    </p>
                  )}

                  {/* New address form */}
                  <AnimatePresence>
                    {showAddressForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-2 pt-3 border-t border-zinc-100 overflow-hidden"
                      >
                        <select
                          value={newQuartierId}
                          onChange={(e) => setNewQuartierId(e.target.value)}
                          className="w-full text-sm border border-zinc-200 bg-white text-zinc-900 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
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
                          className="w-full text-sm border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowAddressForm(false); setNewRue(''); setNewQuartierId(''); }}
                            className="flex-1 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Contact phone */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Numéro de contact (optionnel)</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+242 06 XXX XX XX"
                className="w-full text-sm border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Note pour le restaurant</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sans piment, sans oignon..."
                rows={2}
                className="w-full text-sm border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
              />
            </div>
          </div>

          {/* Right — promo, payment, total */}
          <div className="flex flex-col gap-4">
            {/* Promo code */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Code promo</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="BIENVENUE500"
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                  />
                </div>
                <button
                  onClick={handleValidatePromo}
                  disabled={!promoCode || promoLoading}
                  className="px-3 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-60"
                >
                  {promoLoading ? '...' : 'OK'}
                </button>
              </div>
              {promoResult?.valid && (
                <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                  ✓ {promoResult.description}
                </p>
              )}
            </div>

            {/* Paiement */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Mode de paiement</p>
              <div className="flex flex-col gap-2">
                {(['MTN_MOMO', 'CASH_ON_DELIVERY'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-sm transition-all text-left',
                      paymentMethod === method
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
                    )}
                  >
                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', paymentMethod === method ? 'border-primary-500' : 'border-zinc-300')}>
                      {paymentMethod === method && <div className="w-2 h-2 bg-primary-500 rounded-full" />}
                    </div>
                    {method === 'MTN_MOMO' ? '📱 MTN Mobile Money' : '💵 Cash à la livraison'}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-4">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Sous-total</span>
                  <span>{formatCurrency(subTotal)}</span>
                </div>
                {isDelivery && (
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Livraison</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Frais de service </span>
                  <span>{formatCurrency(serviceFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Code promo</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="h-px bg-zinc-100 dark:bg-dark-border my-1" />
                <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Validation hint */}
              {isDelivery && !selectedAdresseId && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-3">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  Sélectionnez une adresse de livraison
                </p>
              )}

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading || isEmpty || (isDelivery && !selectedAdresseId)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all shadow-sm shadow-primary-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Commander
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
