export class NoopGameRepository {
  syncRoom() {}

  syncPlayerPresence() {}

  clearPlayerPresence() {}

  saveLocalGameSnapshot() {
    return { status: "noop" };
  }

  getLocalGameSnapshot() {
    return null;
  }

  clearLocalGameSnapshot() {
    return { status: "noop" };
  }

  getRoomSnapshot() {
    return null;
  }

  listActiveRooms() {
    return [];
  }

  close() {}
}
