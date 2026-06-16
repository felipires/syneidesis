import { json, type RequestHandler } from '@sveltejs/kit';
import { sync, type SyncPayload } from '$lib/server/db';

/** The single sync exchange: client pushes its `pending` rows + its last pull
    cursor; server reconciles (last-write-wins) and returns anything newer.

    ⚠️ AUTH REQUIRED BEFORE DEPLOY: this endpoint currently trusts any caller and
    returns ALL rows (including private). It is safe only on localhost / single
    user. Gate it behind the single-user session before exposing the app publicly. */
export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { since?: string; changes?: SyncPayload };
	const result = await sync(body.since, body.changes ?? {});
	return json(result);
};
