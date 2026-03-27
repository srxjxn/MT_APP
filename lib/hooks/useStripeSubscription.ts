import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';
import { subscriptionKeys } from './useSubscriptions';
import { paymentKeys } from './usePayments';
import { ensureStripeCustomer } from '../stripe/ensureCustomer';

/**
 * Creates a Stripe Subscription for a local subscription that has a stripe_price_id.
 * First student: redirects to Stripe Checkout in the browser (Apple 3.1.1 compliant).
 * Sibling: auto-charges saved payment method via create-stripe-subscription edge function.
 * Retry/alreadyActive: returns alreadyActive for local activation.
 */
export function useStripeSubscription() {
  const queryClient = useQueryClient();
  const userProfile = useAuthStore((s) => s.userProfile);

  return useMutation({
    mutationFn: async ({
      subscription_id,
      stripe_price_id,
    }: {
      subscription_id: string;
      stripe_price_id: string;
    }): Promise<{ redirected?: boolean; siblingAdded?: boolean; alreadyActive?: boolean }> => {
      if (!userProfile) throw new Error('User not logged in');

      // 1. Ensure Stripe customer exists
      const customerId = await ensureStripeCustomer(userProfile);

      if (!userProfile.stripe_customer_id) {
        useAuthStore.getState().setUserProfile({
          ...userProfile,
          stripe_customer_id: customerId,
        });
      }

      // 2. Try create-stripe-subscription first (handles retry, sibling, and already-active paths)
      const { data, error } = await supabase.functions.invoke('create-stripe-subscription', {
        body: {
          customer_id: customerId,
          price_id: stripe_price_id,
          subscription_id,
          user_id: userProfile.id,
        },
      });

      if (error) {
        const detail = data?.error || error.message;
        throw new Error('Failed to create subscription: ' + detail);
      }

      // Already active — caller will activate locally
      if (data?.alreadyActive) {
        return { alreadyActive: true };
      }

      // Sibling added — auto-charged, no redirect needed
      if (data?.siblingAdded) {
        return { siblingAdded: true };
      }

      // First student path: redirect to Stripe Checkout in the browser
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            customer_id: customerId,
            mode: 'subscription',
            price_id: stripe_price_id,
            subscription_id,
            user_id: userProfile.id,
            org_id: userProfile.org_id,
          },
        }
      );

      if (checkoutError) {
        const detail = checkoutData?.error || checkoutError.message;
        throw new Error('Failed to create checkout session: ' + detail);
      }

      if (!checkoutData?.checkoutUrl) {
        throw new Error('No checkout URL returned');
      }

      // Open Stripe Checkout in an in-app browser session
      const result = await WebBrowser.openAuthSessionAsync(
        checkoutData.checkoutUrl,
        'modern-tennis://billing'
      );
      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Payment cancelled');
      }

      return { redirected: true };
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
      subscription_id,
      cancel_immediately = false,
    }: {
      stripe_subscription_id: string;
      subscription_id: string;
      cancel_immediately?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('cancel-stripe-subscription', {
        body: {
          stripe_subscription_id,
          subscription_id,
          cancel_immediately,
        },
      });

      if (error) {
        const detail = data?.error || error.message;
        throw new Error('Failed to cancel subscription: ' + detail);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
