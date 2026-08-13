import {
  AsyncRequestIdentity,
  BuilderAsyncController,
  RequestIdentityRegistry,
} from "../model/asyncRequestIdentity";

describe("AsyncRequestIdentity", () => {
  it("invalidates older requests and releases only the current latch", () => {
    const identity = new AsyncRequestIdentity();
    const first = identity.begin();
    const second = identity.begin();

    expect(identity.isCurrent(first)).toBe(false);
    expect(identity.isCurrent(second)).toBe(true);
    expect(identity.finish(first)).toBe(false);
    expect(identity.isInFlight).toBe(true);
    expect(identity.finish(second)).toBe(true);
    expect(identity.isInFlight).toBe(false);
  });

  it("makes every pending request stale after invalidation", () => {
    const identity = new AsyncRequestIdentity();
    const request = identity.begin();

    identity.invalidate();

    expect(identity.isCurrent(request)).toBe(false);
    expect(identity.isInFlight).toBe(false);
  });

  it("keeps independent latches for concurrent workflow channels", () => {
    const registry = new RequestIdentityRegistry<"save" | "publish">();
    const save = registry.begin("save");
    const publish = registry.begin("publish");

    expect(registry.isInFlight("save")).toBe(true);
    expect(registry.isCurrent("publish", publish)).toBe(true);
    registry.invalidate("save");
    expect(registry.isCurrent("save", save)).toBe(false);
    expect(registry.isInFlight("publish")).toBe(true);
  });

  it("atomically rejects duplicate intents and releases only the current request", () => {
    const controller = new BuilderAsyncController();
    const requestId = controller.tryBegin("discard");

    expect(requestId).not.toBeNull();
    expect(controller.tryBegin("discard")).toBeNull();
    expect(controller.finish("discard", requestId!)).toBe(true);
    expect(controller.tryBegin("discard")).not.toBeNull();
  });

  it("invalidates selected entity flows and all channels on unmount", () => {
    const controller = new BuilderAsyncController();
    const entity = controller.begin("entity");
    const draft = controller.tryBegin("draftLoad")!;
    const auth = controller.tryBegin("auth")!;

    controller.invalidate("entity", "draftLoad");
    expect(controller.isCurrent("entity", entity)).toBe(false);
    expect(controller.isCurrent("draftLoad", draft)).toBe(false);
    expect(controller.isCurrent("auth", auth)).toBe(true);

    controller.invalidateAll();
    expect(controller.isCurrent("auth", auth)).toBe(false);
    expect(controller.isInFlight("auth")).toBe(false);
  });
});
