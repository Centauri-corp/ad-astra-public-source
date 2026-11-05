import { createStripeWebhook } from './handler.mjs';

Deno.serve(createStripeWebhook({ getEnv: (name: string) => Deno.env.get(name) }));
