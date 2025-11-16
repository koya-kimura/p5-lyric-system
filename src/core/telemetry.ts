const CHANNEL_NAME = "lyrics-system::telemetry";
const STORAGE_KEY = "lyrics-system::telemetry";

type TelemetryRole = "control" | "perform";

export type TelemetryEvent = {
  type: "fps";
  role: TelemetryRole;
  fps: number;
  timestamp: number;
};

type TelemetryPacket = TelemetryEvent & {
  senderId: string;
};

type TelemetryListener = (event: TelemetryEvent) => void;

const createSenderId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `telemetry-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

export class TelemetryChannel {
  private readonly channel: BroadcastChannel | null;
  private readonly listeners = new Set<TelemetryListener>();
  private readonly senderId: string;

  constructor() {
    this.senderId = createSenderId();

    this.channel = typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

    this.channel?.addEventListener("message", (event) => {
      const packet = this.parsePacket(event.data);
      if (!packet || packet.senderId === this.senderId) {
        return;
      }
      this.dispatch(packet);
    });

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY || !event.newValue) {
          return;
        }
        try {
          const payload = JSON.parse(event.newValue) as { packet?: TelemetryPacket };
          const packet = payload.packet;
          if (!packet || packet.senderId === this.senderId) {
            return;
          }
          this.dispatch(packet);
        } catch (error) {
          console.warn("Failed to parse telemetry payload", error);
        }
      });
    }
  }

  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reportFrameRate(role: TelemetryRole, fps: number): void {
    const sanitizedFps = Number.isFinite(fps) ? Math.max(0, fps) : 0;
    const packet: TelemetryPacket = {
      type: "fps",
      role,
      fps: sanitizedFps,
      timestamp: Date.now(),
      senderId: this.senderId,
    };

    this.dispatch(packet);
    try {
      this.channel?.postMessage(packet);
    } catch (error) {
      console.warn("Failed to broadcast telemetry", error);
    }

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ packet }));
      } catch (error) {
        console.warn("Failed to persist telemetry", error);
      }
    }
  }

  private parsePacket(payload: unknown): TelemetryPacket | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    const packet = payload as Partial<TelemetryPacket>;
    if (packet.type !== "fps" || packet.role !== "control" && packet.role !== "perform") {
      return null;
    }
    if (typeof packet.fps !== "number" || typeof packet.timestamp !== "number" || typeof packet.senderId !== "string") {
      return null;
    }
    return packet as TelemetryPacket;
  }

  private dispatch(packet: TelemetryPacket): void {
    const event: TelemetryEvent = {
      type: packet.type,
      role: packet.role,
      fps: packet.fps,
      timestamp: packet.timestamp,
    };
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }
}
