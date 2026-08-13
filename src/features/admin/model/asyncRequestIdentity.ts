export class AsyncRequestIdentity {
  private generation = 0;
  private pendingGeneration: number | null = null;

  get isInFlight(): boolean {
    return this.pendingGeneration !== null;
  }

  begin(): number {
    this.generation += 1;
    this.pendingGeneration = this.generation;
    return this.generation;
  }

  invalidate(): void {
    this.generation += 1;
    this.pendingGeneration = null;
  }

  isCurrent(requestId: number): boolean {
    return requestId === this.generation;
  }

  finish(requestId: number): boolean {
    if (!this.isCurrent(requestId)) {
      return false;
    }

    this.pendingGeneration = null;
    return true;
  }
}

export class RequestIdentityRegistry<TChannel extends string> {
  private readonly identities = new Map<TChannel, AsyncRequestIdentity>();

  begin(channel: TChannel): number {
    return this.getIdentity(channel).begin();
  }

  finish(channel: TChannel, requestId: number): boolean {
    return this.getIdentity(channel).finish(requestId);
  }

  invalidate(channel: TChannel): void {
    this.getIdentity(channel).invalidate();
  }

  isCurrent(channel: TChannel, requestId: number): boolean {
    return this.getIdentity(channel).isCurrent(requestId);
  }

  isInFlight(channel: TChannel): boolean {
    return this.getIdentity(channel).isInFlight;
  }

  private getIdentity(channel: TChannel): AsyncRequestIdentity {
    const existing = this.identities.get(channel);
    if (existing) return existing;
    const identity = new AsyncRequestIdentity();
    this.identities.set(channel, identity);
    return identity;
  }
}

export type BuilderAsyncChannel =
  | "entity"
  | "initialEditLoad"
  | "draftLoad"
  | "tabSave"
  | "publish"
  | "auth"
  | "discard";

export class BuilderAsyncController {
  private readonly registry = new RequestIdentityRegistry<BuilderAsyncChannel>();

  begin(channel: BuilderAsyncChannel): number {
    return this.registry.begin(channel);
  }

  tryBegin(channel: BuilderAsyncChannel): number | null {
    if (this.registry.isInFlight(channel)) return null;
    return this.registry.begin(channel);
  }

  finish(channel: BuilderAsyncChannel, requestId: number): boolean {
    return this.registry.finish(channel, requestId);
  }

  invalidate(...channels: BuilderAsyncChannel[]): void {
    channels.forEach((channel) => this.registry.invalidate(channel));
  }

  invalidateAll(): void {
    this.invalidate(
      "entity",
      "initialEditLoad",
      "draftLoad",
      "tabSave",
      "publish",
      "auth",
      "discard",
    );
  }

  isCurrent(channel: BuilderAsyncChannel, requestId: number): boolean {
    return this.registry.isCurrent(channel, requestId);
  }

  isInFlight(channel: BuilderAsyncChannel): boolean {
    return this.registry.isInFlight(channel);
  }
}
