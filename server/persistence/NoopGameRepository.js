export class NoopGameRepository {
  syncRoom() {}

  syncPlayerPresence() {}

  clearPlayerPresence() {}

  getRoomSnapshot() {
    return null;
  }

  listActiveRooms() {
    return [];
  }

  close() {}
}
