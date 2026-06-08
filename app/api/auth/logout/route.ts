import { destroySession } from "@/lib/auth";
import { ok, handleError } from "@/lib/security";

export async function POST() {
  try {
    destroySession();
    return ok({ loggedOut: true });
  } catch (e) {
    return handleError(e);
  }
}
