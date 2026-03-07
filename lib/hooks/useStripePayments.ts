import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { paymentKeys } from './usePayments';
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
 * Processes a Stripe payment using the PaymentSheet flow.
 * 1. Ensures Stripe Customer exists (lazy creation)
 * 2. Creates a PaymentIntent via edge function (with metadata for server-side recording)
 * 3. Presents the native Stripe PaymentSheet
 * 4. Payment record is created server-side by the stripe-webhook
 */
export function useStripePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const userProfile = useAuthStore((s) => s.userProfile);

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
      if (!userProfile) throw new Error('User not logged in');

      // 1. Ensure Stripe customer exists
      const customerId = await ensureStripeCustomer(userProfile);

      // Update local store if customer was just created
      if (!userProfile.stripe_customer_id) {
        useAuthStore.getState().setUserProfile({
          ...userProfile,
          stripe_customer_id: customerId,
        });
      }

      // 2. Create PaymentIntent via edge function (with metadata)
      const { data: intentData, error: intentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            amount_cents,
            description: description ?? undefined,
            customer_id: customerId,
            user_id: userProfile.id,
            org_id: orgId,
            payment_type,
            subscription_id: subscription_id ?? undefined,
          },
        }
      );

      if (intentError) throw new Error('Failed to create payment: ' + intentError.message);
      if (!intentData?.clientSecret) throw new Error('No client secret returned');

      const { clientSecret } = intentData;

      // 3. Initialize PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Modern Tennis',
        customerId,
        style: 'alwaysLight',
      });

      if (initError) throw new Error(initError.message);

      // 4. Present PaymentSheet — native UI
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          throw new Error('Payment cancelled');
        }
        throw new Error(presentError.message);
      }

      // Payment record is created server-side by the stripe-webhook
      // on payment_intent.succeeded event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}
