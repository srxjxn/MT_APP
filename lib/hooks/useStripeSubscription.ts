import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { subscriptionKeys } from './useSubscriptions';
import { paymentKeys } from './usePayments';
import { ensureStripeCustomer } from '../stripe/ensureCustomer';

/**
 * Creates a Stripe Subscription for a local subscription that has a stripe_price_id.
 * Flow: ensureCustomer → create-stripe-subscription → initPaymentSheet → presentPaymentSheet
 */
export function useStripeSubscription() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async ({
      subscription_id,
      stripe_price_id,
    }: {
      subscription_id: string;
      stripe_price_id: string;
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

      // 2. Create Stripe Subscription via edge function
      const { data, error } = await supabase.functions.invoke('create-stripe-subscription', {
        body: {
          customer_id: customerId,
          price_id: stripe_price_id,
          subscription_id,
        },
      });

      if (error) throw new Error('Failed to create subscription: ' + error.message);
      if (!data?.clientSecret) throw new Error('No client secret returned');

      // 3. Initialize PaymentSheet for first payment
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'Modern Tennis',
        customerId,
        style: 'alwaysLight',
      });

      if (initError) throw new Error(initError.message);

      // 4. Present PaymentSheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          throw new Error('Payment cancelled');
        }
        throw new Error(presentError.message);
      }

      // Subscription is now active — webhook will sync status
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

/**
 * Cancels a Stripe Subscription (at period end by default).
 */
export function useCancelStripeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stripe_subscription_id,
      cancel_immediately = false,
    }: {
      stripe_subscription_id: string;
      cancel_immediately?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('cancel-stripe-subscription', {
        body: {
          stripe_subscription_id,
          cancel_immediately,
        },
      });

      if (error) throw new Error('Failed to cancel subscription: ' + error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
