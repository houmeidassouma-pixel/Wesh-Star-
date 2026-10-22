# Stripe recurring subscriptions

Added:
- Stripe Checkout in subscription mode for all configured Wesh Star IA plans.
- Automatic recurring billing through Stripe.
- Signed Stripe webhook endpoint.
- Local profile synchronization for active/past_due/inactive subscriptions.
- Customer/subscription IDs stored locally.
- Stripe customer billing portal.
- Monthly subscription buttons in pricing.
- No Stripe SDK dependency; server calls Stripe's HTTPS API directly.
- Existing local generation, credits, storage, GPU, Natural Scene, Autopilot and Wesh Star IA Direct payment paths remain in the project.
