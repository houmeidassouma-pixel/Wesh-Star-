# Monthly quota renewal

Monthly subscription quota is tied to the Stripe billing cycle, not the calendar month.
`profiles.quota_cycle_key` is updated by `invoice.paid` (and subscription events when available).
Usage counters use that key, so unused minutes from the previous billing cycle do not roll over.
The next successful recurring payment starts a fresh quota automatically in the background.

Each dynamic plan has: minutes/month, price/month, daily minutes, enabled state.
A single Studio generation is capped at 10 minutes (600 seconds) for normal users.
