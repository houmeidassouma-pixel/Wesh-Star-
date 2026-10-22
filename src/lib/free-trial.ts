import { createAdminClient } from "./account/admin";

/** Lifetime free trial: exactly two successful/reserved generations per account. */
export async function consumeFreeTrial(userId: string): Promise<boolean> {
  const { data } = await createAdminClient().rpc("consume_free_trial", { p_user_id: userId });
  return data === true;
}

export async function refundFreeTrial(userId: string): Promise<void> {
  await createAdminClient().rpc("refund_free_trial", { p_user_id: userId });
}
