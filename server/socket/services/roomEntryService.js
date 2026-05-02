import C from "../../game/constants.js";

export function createRoomEntryService({
  sock,
  player,
  roomManager,
  broadcast
}) {
  const resolvePlayerSession = () => roomManager.resolvePlayerSession(player);
  const resolvePlayerRoom = () => roomManager.resolvePlayerRoom(player);

  async function getLivePlayerRoomState() {
    const session = await resolvePlayerSession();
    if (!session?.room) {
      return null;
    }

    const room = session.room;
    const mark = room.getPlayerMark(player) ?? session.mark ?? null;
    const role = mark ? "player" : session.role ?? "spectator";

    return { room, mark, role };
  }

  async function getOccupiedRoomResponse() {
    const activeState = await getLivePlayerRoomState();
    if (!activeState?.room || !activeState.mark) {
      return null;
    }

    return {
      status: "occupied",
      roomId: activeState.room.roomId,
      mark: activeState.mark,
      role: "player",
      message: "Finish your current match before starting another one.",
      state: broadcast.serializeRoomState(activeState.room)
    };
  }

  async function createRoom({ roomName = "", type = "mp", ruleset = C.RULESETS.HOUSE } = {}) {
    const occupiedRoom = await getOccupiedRoomResponse();
    if (occupiedRoom) {
      return occupiedRoom;
    }

    if (type === "mp" && roomManager.isRoomCapacityReached("mp")) {
      return { status: "error", message: "Server too busy, try again later" };
    }

    const roomId = roomManager.createRoom({ playerX: player, type, roomName, ruleset });
    if (!roomId) {
      return { status: "error", message: "couldn't create a room" };
    }

    sock.join(roomId);
    void broadcast.persistPresence(player, { roomId, role: "player", mark: "X" });
    void broadcast.persistRoom(roomManager.getRoom(roomId));

    return { status: "ok", roomId, name: roomName, mark: "X" };
  }

  async function enterRoom(roomId) {
    const occupiedRoom = await getOccupiedRoomResponse();
    if (occupiedRoom && occupiedRoom.roomId !== roomId) {
      return occupiedRoom;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
      return { status: "nogame", message: "Room not found" };
    }

    const existingMark = room.getPlayerMark(player);
    if (existingMark) {
      sock.join(roomId);
      return {
        status: "ok",
        roomId,
        mark: existingMark,
        role: "player",
        state: broadcast.serializeRoomState(room)
      };
    }

    if (room.needSecondPlayer() && room.getStatus() === C.ROOM_STATUS.WAITING) {
      room.addSecondPlayer(player);
      roomManager.addPlayerToRoom(player, room, "O");
      sock.join(roomId);
      void broadcast.persistPresence(player, { roomId, role: "player", mark: "O" });
      void broadcast.persistRoom(room);

      return {
        status: "ok",
        roomId,
        mark: "O",
        role: "player",
        state: broadcast.serializeRoomState(room)
      };
    }

    room.addSpectator(player);
    sock.join(roomId);
    void broadcast.persistPresence(player, { roomId, role: "spectator", mark: null });
    void broadcast.persistRoom(room);

    return {
      status: "ok",
      roomId,
      mark: null,
      role: "spectator",
      state: broadcast.serializeRoomState(room)
    };
  }

  async function joinReadyRoom({ requestedRoomType, ruleset = C.RULESETS.HOUSE } = {}) {
    const occupiedRoom = await getOccupiedRoomResponse();
    if (occupiedRoom) {
      return {
        ...occupiedRoom,
        status: "ok",
        message: "Player already in a room"
      };
    }

    if (requestedRoomType === "mp" && roomManager.isRoomCapacityReached("mp")) {
      return { status: "error", message: "Server too busy, try again later" };
    }

    if (requestedRoomType === "local") {
      return createLocalRoom(ruleset);
    }

    return quickMatch(ruleset);
  }

  async function createLocalRoom(ruleset) {
    const roomId = roomManager.createRoom({ playerX: player, type: "local", ruleset });
    const room = roomManager.getRoom(roomId);
    sock.join(roomId);
    void broadcast.persistPresence(player, { roomId, role: "player", mark: "X" });
    void broadcast.persistRoom(room);

    return {
      status: "ok",
      kind: "WAIT",
      roomId,
      mark: "X",
      state: broadcast.serializeRoomState(room),
      message: "Joined local"
    };
  }

  async function quickMatch(ruleset) {
    const matchResult = roomManager.quickMatch(player, { type: "mp", ruleset });
    if (!matchResult?.roomId) {
      return { status: "error", message: "Unable to create or join a room right now" };
    }

    const { kind, roomId } = matchResult;
    const room = roomManager.getRoom(roomId);
    if (!room) {
      return { status: "error", message: "Room not found" };
    }

    if (kind === "JOIN") {
      sock.join(roomId);
      roomManager.addPlayerToRoom(player, room, "O");
      void broadcast.persistPresence(player, { roomId, role: "player", mark: "O" });
      broadcast.emitRoomState(room);

      return {
        roomId,
        kind,
        status: "ok",
        mark: "O",
        state: broadcast.serializeRoomState(room),
        message: "joined room"
      };
    }

    if (kind === "WAIT") {
      sock.join(roomId);
      void broadcast.persistPresence(player, { roomId, role: "player", mark: "X" });
      void broadcast.persistRoom(room);

      return {
        roomId,
        kind,
        status: "ok",
        mark: "X",
        state: broadcast.serializeRoomState(room),
        message: "created room"
      };
    }

    return { status: "error" };
  }

  async function clientReady(roomId) {
    const room = await resolvePlayerRoom();
    if (!room) {
      const directRoom = roomManager.getRoom(roomId);
      if (!directRoom) return { status: "ok" };
      return {
        status: "spectator",
        state: broadcast.serializeRoomState(directRoom),
        mark: null,
        role: "spectator"
      };
    }

    const mark = room.getPlayerMark(player);
    if (!mark) {
      return {
        status: "spectator",
        state: broadcast.serializeRoomState(room),
        mark: null,
        role: "spectator"
      };
    }

    room.readyPlayer(mark);
    void broadcast.persistRoom(room);

    if (!room.areBothPlayersReady()) {
      return { status: "waiting", state: broadcast.serializeRoomState(room), mark };
    }

    if (room.hasGameStarted()) {
      return { status: "ok", state: broadcast.serializeRoomState(room), mark };
    }

    if (room.getStatus() === C.ROOM_STATUS.STARTING) {
      return { status: "starting", state: broadcast.serializeRoomState(room), mark };
    }

    await broadcast.startRoomCountdown(room);
    return { status: "starting", state: broadcast.serializeRoomState(room), mark };
  }

  return {
    clientReady,
    createRoom,
    enterRoom,
    getLivePlayerRoomState,
    getOccupiedRoomResponse,
    joinReadyRoom,
    resolvePlayerRoom,
    resolvePlayerSession
  };
}
