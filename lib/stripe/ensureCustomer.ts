import { supabase } from '../supabase';

/**
 * Ensures the current user has a Stripe Customer ID.
 * Creates one via edge function if not already set.
 * Returns the customer_id.
 */
export async function ensureStripeCustomer(userProfile: {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  stripe_customer_id: string | null;
}): Promise<string> {
  if (userProfile.stripe_customer_id) {
    return userProfile.stripe_customer_id;
  }

  const { data, error } = await supabase.functions.invoke('create-stripe-customer', {
    body: {
      email: userProfile.email,
      name: `${userProfile.first_name} ${userProfile.last_name}`,
      user_id: userProfile.id,
    },
  });

  if (error) throw new Error('Failed to create Stripe customer: ' + error.message);
  if (!data?.customer_id) throw new Error('No customer_id returned from Stripe');

  return data.customer_id;
}
