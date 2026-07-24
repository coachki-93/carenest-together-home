import { describe, it, expect } from "vitest";
import { createRecipientResolver, type PushRecipient } from "./recipients";

const FAMILY = "fam_1";

const sub = (user_id: string): PushRecipient => ({
  endpoint: `https://push.example/${user_id}`,
  p256dh: "p",
  auth: "a",
  user_id,
});

function ids(rs: PushRecipient[]): string[] {
  return rs.map((r) => r.user_id).sort();
}

function makeResolver(level: "exceptions" | "all" = "exceptions") {
  // `admin` is unused because _seed populates all caches.
  const r = createRecipientResolver({ from: (() => ({})) as never });
  r._seed(FAMILY, {
    subs: [sub("u_owner"), sub("u_care"), sub("u_mat")],
    members: [
      { user_id: "u_owner", role: "owner" },
      { user_id: "u_care", role: "caregiver" },
      { user_id: "u_mat", role: "caregiver", material_responsible: true },
    ],
    ownerNotifyLevel: level,
  });
  return r;
}

describe("createRecipientResolver", () => {
  it("level=exceptions, start → owner excluded", async () => {
    const r = makeResolver("exceptions");
    expect(ids(await r.getRecipients(FAMILY, "start"))).toEqual(["u_care", "u_mat"]);
  });
  it("level=exceptions, reminder → owner excluded", async () => {
    const r = makeResolver("exceptions");
    expect(ids(await r.getRecipients(FAMILY, "reminder"))).toEqual(["u_care", "u_mat"]);
  });
  it("level=exceptions, missed → owner included (always-on)", async () => {
    const r = makeResolver("exceptions");
    expect(ids(await r.getRecipients(FAMILY, "missed"))).toEqual([
      "u_care",
      "u_mat",
      "u_owner",
    ]);
  });
  it("level=exceptions, oxygen → owner included (always-on)", async () => {
    const r = makeResolver("exceptions");
    expect(ids(await r.getRecipients(FAMILY, "oxygen"))).toEqual([
      "u_care",
      "u_mat",
      "u_owner",
    ]);
  });
  it("level=exceptions, stock → owner + material_responsible only", async () => {
    const r = makeResolver("exceptions");
    expect(ids(await r.getRecipients(FAMILY, "stock"))).toEqual(["u_mat", "u_owner"]);
  });
  it("level=all, stock → still role-independent", async () => {
    const r = makeResolver("all");
    expect(ids(await r.getRecipients(FAMILY, "stock"))).toEqual(["u_mat", "u_owner"]);
  });
  it("level=all, start → owner included", async () => {
    const r = makeResolver("all");
    expect(ids(await r.getRecipients(FAMILY, "start"))).toEqual([
      "u_care",
      "u_mat",
      "u_owner",
    ]);
  });
  it("excludeUserId drops the actor", async () => {
    const r = makeResolver("exceptions");
    expect(
      ids(await r.getRecipients(FAMILY, "critical", { excludeUserId: "u_care" })),
    ).toEqual(["u_mat", "u_owner"]);
  });
  it("sub with no matching family_members row is dropped", async () => {
    const r = createRecipientResolver({ from: (() => ({})) as never });
    r._seed(FAMILY, {
      subs: [sub("u_owner"), sub("u_ghost")],
      members: [{ user_id: "u_owner", role: "owner" }],
      ownerNotifyLevel: "exceptions",
    });
    expect(ids(await r.getRecipients(FAMILY, "missed"))).toEqual(["u_owner"]);
  });
});
