import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { paymentKeys } from './usePayments';
import { PaymentType, PaymentPlatform } from '../types';

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
 * Placeholder for Stripe payment flow.
 * When @stripe/stripe-react-native is installed and configured,
 * this will create a PaymentIntent via Supabase Edge Function
 * and use the Stripe PaymentSheet to collect payment.
 *
 * For now, it records the payment with platform='stripe'.
 */
export function useStripePayment() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const userId = useAuthStore((s) => s.userProfile?.id);

  return useMutation({
    mutationFn: async ({
      amount_cents,
      payment_type,
      subscription_id,
      description,
    }: {
      amount_cents: number;
      payment_type: PaymentType;
      subscription_id?: string;
      description?: string;
    }) => {
      // TODO: When Stripe is configured, this would:
      // 1. Call Supabase Edge Function to create PaymentIntent
      // 2. Open Stripe PaymentSheet
      // 3. On success, record payment in DB with stripe_payment_intent_id
      //
      // For now, we record it as a pending Stripe payment
      const { data, error } = await supabase
        .from('payments')
        .insert({
          org_id: orgId!,
          user_id: userId!,
          amount_cents,
          payment_type,
          payment_platform: 'stripe',
          payment_status: 'pending',
          subscription_id: subscription_id ?? null,
          description: description ?? 'Stripe payment (pending configuration)',
          paid_at: null,
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
