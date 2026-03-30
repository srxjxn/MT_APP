import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { paymentKeys } from './usePayments';
import { subscriptionKeys } from './useSubscriptions';
import { studentPackageKeys } from './useStudentPackages';
import { PaymentType, PaymentPlatform } from '../types';
import { ensureStripeCustomer } from '../stripe/ensureCustomer';

/**
 * Records an external payment (cash, check, etc.) in the database.
 * This is used when payment is made outside of Stripe.
 */
export function useRecordExternalPayment() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const userId = useAuthStore((s) => s.userProfile?.id);

  return useMutation({
    mutationFn: async ({
      amount_cents,
      payment_type,
      payment_platform,
      subscription_id,
      description,
    }: {
      amount_cents: number;
      payment_type: PaymentType;
      payment_platform: PaymentPlatform;
      subscription_id?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          org_id: orgId!,
          user_id: userId!,
          amount_cents,
          payment_type,
          payment_platform,
          payment_status: 'completed',
          subscription_id: subscription_id ?? null,
          description: description ?? null,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

/**
 * Processes a one-time payment via Stripe Checkout (browser redirect).
 * 1. Ensures Stripe Customer exists (lazy creation)
 * 2. Creates a Checkout Session via edge function with mode: 'payment'
 * 3. Opens the checkout URL in Safari
 * 4. Returns { redirected: true } — side effects happen server-side via webhook
 */
export function useStripeCheckoutPayment() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async ({
      amount_cents,
      payment_type,
      subscription_id,
      description,
      post_action,
    }: {
      amount_cents: number;
      payment_type: PaymentType;
      subscription_id?: string;
      description?: string;
      post_action?: Record<string, unknown>;
    }) => {
      if (!userProfile) throw new Error('User not logged in');

      // 1. Ensure Stripe customer exists
      const customerId = await ensureStripeCustomer(userProfile);

      if (!userProfile.stripe_customer_id) {
        useAuthStore.getState().setUserProfile({
          ...userProfile,
          stripe_customer_id: customerId,
        });
      }

      // 2. Create Checkout Session via edge function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          customer_id: customerId,
          user_id: userProfile.id,
          org_id: orgId,
          mode: 'payment',
          amount_cents,
          payment_type,
          subscription_id: subscription_id ?? undefined,
          description: description ?? undefined,
          post_action: post_action ?? undefined,
        },
      });

      if (error) throw new Error('Failed to create checkout session: ' + error.message);
      if (!data?.checkoutUrl) throw new Error('No checkout URL returned');

      // 3. Open in in-app browser session
      const result = await WebBrowser.openAuthSessionAsync(
        data.checkoutUrl,
        'modern-tennis://billing'
      );
      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Payment cancelled');
      }

      return { redirected: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.invalidateQueries({ queryKey: studentPackageKeys.all });
    },
  });
}
