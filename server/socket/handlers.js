import { serializeRoomState } from "../game/serializers.js";
import * as gameLogic from "../game/gameLogic.js";
import crypto from "crypto";
import Player from "../game/Player.js";
import C from "../game/constants.js";

export function registerSocketHandlers({ io, roomManager, repository, runRepositoryTask }) {
  io.use((socket, next) => {
    const { playerId, roomId, mark } = socket.handshake.auth || {};
    socket.playerId = playerId || crypto.randomUUID();
    socket.initialRoomId = roomId || null;
    socket.mark = mark;
    next();
  });

  io.on("connection", async (sock) => {
    console.log(`${Date.now()} someone connected: sock.playerId`);

    const player = new Player(sock.playerId, sock.id, sock.playerName ?? "", "");
    await roomManager.hydratePlayerFromPersistence?.(player);
    player.setOnline();

    sock.emit("identity", {
      playerId: sock.playerId,
      playerName: player.getName()
    });

    const persistRoom = room => runRepositoryTask?.(() => repository?.syncRoom?.(room));
    const persistPresence = (targetPlayer, context) =>
      runRepositoryTask?.(() => repository?.syncPlayerPresence?.(targetPlayer, context));
    const clearPresence = playerId =>
      runRepositoryTask?.(() => repository?.clearPlayerPresence?.(playerId));

    const getRoomChannelId = room => room.getId?.() ?? room.roomId;
    const emitRoomState = room => {
      io.to(getRoomChannelId(room)).emit("roomStateUpdated", {
        state: serializeRoomState(room)
      });
      void persistRoom(room);
    };

    const startRoomCountdown = async room => {
      const socketIdX = room.getPlayerSocketID("X");
      const socketIdO = room.getPlayerSocketID("O");

      room.beginCountdown(async () => {
        room.startGame(() => {
          emitRoomState(room);
        });
        void persistRoom(room);

        const payloadX = { state: serializeRoomState(room), mark: "X" };
        const payloadO = { state: serializeRoomState(room), mark: "O" };

        const [acksX, acksO] = await Promise.all([
          io.to(socketIdX).timeout(3000).emitWithAck("roomReady", payloadX),
          io.to(socketIdO).timeout(3000).emitWithAck("roomReady", payloadO)
        ]);

        const [ackX] = acksX;
        const [ackO] = acksO;
        console.log("X ack:", ackX, "O ack:", ackO);
      });

      io.to(getRoomChannelId(room)).emit("roomStarting", {
        state: serializeRoomState(room)
      });
      void persistRoom(room);
    };

    const resolvePlayerRoom = () => roomManager.resolvePlayerRoom(player);
    const resolvePlayerSession = () => roomManager.resolvePlayerSession(player);
    const getLivePlayerRoomState = async () => {
      const session = await resolvePlayerSession();
      if (!session?.room) {
        return null;
      }

      const room = session.room;
      const mark = room.getPlayerMark(player) ?? session.mark ?? null;
      const role = mark ? "player" : session.role ?? "spectator";

      return {
        room,
        mark,
        role,
      };
    };

    const getOccupiedRoomResponse = async () => {
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
        state: serializeRoomState(activeState.room)
      };
    };

    const enterRoom = async roomId => {
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
          state: serializeRoomState(room)
        };
      }

      if (room.needSecondPlayer() && room.getStatus() === C.ROOM_STATUS.WAITING) {
        room.addSecondPlayer(player);
        roomManager.addPlayerToRoom(player, room, "O");
        sock.join(roomId);
        void persistPresence(player, { roomId, role: "player", mark: "O" });
        void persistRoom(room);

        return {
          status: "ok",
          roomId,
          mark: "O",
          role: "player",
          state: serializeRoomState(room)
        };
      }

      room.addSpectator(player);
      sock.join(roomId);
      void persistPresence(player, { roomId, role: "spectator", mark: null });
      void persistRoom(room);

      return {
        status: "ok",
        roomId,
        mark: null,
        role: "spectator",
        state: serializeRoomState(room)
      };
    };

    sock.on("name", async (payload, ack) => {
      const name = payload?.name ?? "";
      player.setName(name);
      const room = await resolvePlayerRoom();
      const mark = room?.getPlayerMark(player) ?? null;
      void persistPresence(player, {
        roomId: room?.roomId ?? null,
        role: room ? (mark ? "player" : "spectator") : null,
        mark
      });
      return ack?.({ status: "ok" });
    });

    sock.on("resumeOrHello", async (payload, ack) => {
      const requestedRoomId = payload?.roomId ?? null;
      const activeState = await getLivePlayerRoomState();
      const room = activeState?.room ?? null;

      if (!room) {
        return ack?.({ status: "hello", roomId: null });
      }

      if (requestedRoomId && requestedRoomId !== room.roomId) {
        return ack?.({ status: "hello", roomId: null });
      }

      const mark = room.rejoinRoom(player);
      if (!mark) {
        return ack?.({ status: "hello", roomId: null });
      }

      console.log("clearing timeouts and intervals for", player.playerId);
      room.endTimeout(player);
      sock.join(room.getId());
      player.setOnline();
      void persistPresence(player, {
        roomId: room.roomId,
        role: "player",
        mark
      });
      void persistRoom(room);

      return ack?.({
        status: "ok",
        roomId: room.getId?.(),
        state: serializeRoomState(room),
        mark: room.getPlayerMark(player)
      });
    });



    sock.on("getState", async (payload, ack) => {
      const { roomId } = payload || {};
      const room = roomManager.getRoom(roomId);

      if (!room) {
        return ack?.({ status: "nogame", message: "Room not found" });
      }

      const mark = room.getPlayerMark(player);
      return ack?.({
        status: "ok",
        state: serializeRoomState(room),
        mark,
        role: mark ? "player" : "spectator"
      });
    });

    sock.on("createRoom", async (data, ack) => {
      const roomName = data?.roomName ?? "";
      const type = data?.type ?? "mp";
      const ruleset = data?.ruleset ?? C.RULESETS.HOUSE;

      const occupiedRoom = await getOccupiedRoomResponse();
      if (occupiedRoom) {
        return ack?.(occupiedRoom);
      }

      if (type === "mp" && roomManager.isRoomCapacityReached("mp")) {
        return ack?.({
          status: "error",
          message: "Server too busy, try again later"
        });
      }

      const roomId = roomManager.createRoom({ playerX: player, type, roomName, ruleset });

      if (!roomId) {
        return ack?.({ status: "error", message: "couldn't create a room" });
      }

      sock.join(roomId);
      void persistPresence(player, { roomId, role: "player", mark: "X" });
      void persistRoom(roomManager.getRoom(roomId));

      return ack?.({
        status: "ok",
        roomId,
        name: roomName,
        mark: "X"
      });
    });

    sock.on("joinSpecificRoom", async (payload, ack) => {
      const { roomId } = payload || {};
      const result = await enterRoom(roomId);
      if (result.status !== "ok") {
        return ack?.(result.status === "occupied"
          ? result
          : { status: "error", message: "No room with that id" });
      }

      return ack?.(result);
    });

    sock.on("enterRoom", async (payload, ack) => {
      const { roomId } = payload || {};
      const result = await enterRoom(roomId);

      if (result.status !== "ok") {
        return ack?.(result);
      }

      return ack?.(result);
    });

    sock.on("joinReadyRoom", async (data, ack) => {
      const { requestedRoomType, ruleset = C.RULESETS.HOUSE } = data || {};
      const occupiedRoom = await getOccupiedRoomResponse();

      if (occupiedRoom) {
        return ack?.({
          ...occupiedRoom,
          status: "ok",
          message: "Player already in a room"
        });
      }

      if (requestedRoomType === "mp" && roomManager.isRoomCapacityReached("mp")) {
        return ack?.({
          status: "error",
          message: "Server too busy, try again later"
        });
      }

      if (requestedRoomType === "local") {
        const roomId = roomManager.createRoom({ playerX: player, type: "local", ruleset });
        sock.join(roomId);
        void persistPresence(player, { roomId, role: "player", mark: "X" });
        void persistRoom(roomManager.getRoom(roomId));
        return ack?.({
          status: "ok",
          roomId,
          mark: "X",
          message: "Joined local"
        });
      }

      const { kind, roomId } = roomManager.quickMatch(player, { type: "mp", ruleset });
      const room = roomManager.getRoom(roomId);

      if (kind === "JOIN") {
        sock.join(roomId);
        roomManager.addPlayerToRoom(player, room, "O");
        void persistPresence(player, { roomId, role: "player", mark: "O" });
        void persistRoom(room);

        return ack?.({
          roomId,
          status: "ok",
          mark: "O",
          message: "joined room"
        });
      }

      if (kind === "WAIT") {
        sock.join(roomId);
        void persistPresence(player, { roomId, role: "player", mark: "X" });
        void persistRoom(room);

        return ack?.({
          roomId,
          status: "ok",
          mark: "X",
          message: "created room"
        });
      }

      return ack?.({ status: "error" });
    });

    sock.on("clientReady", async (data, ack) => {
      const room = await resolvePlayerRoom();
      if (!room) {
        const directRoom = roomManager.getRoom(data?.roomId);
        if (!directRoom) return ack?.({ status: "ok" });
        return ack?.({
          status: "spectator",
          state: serializeRoomState(directRoom),
          mark: null,
          role: "spectator"
        });
      }

      const mark = room.getPlayerMark(player);
      if (!mark) {
        return ack?.({
          status: "spectator",
          state: serializeRoomState(room),
          mark: null,
          role: "spectator"
        });
      }
      room.readyPlayer(mark);
      void persistRoom(room);

      if (!room.areBothPlayersReady()) {
        return ack?.({ status: "waiting", state: serializeRoomState(room), mark });
      }

      if (room.hasGameStarted()) {
        return ack?.({ status: "ok", state: serializeRoomState(room), mark });
      }

      if (room.getStatus() === C.ROOM_STATUS.STARTING) {
        return ack?.({ status: "starting", state: serializeRoomState(room), mark });
      }

      await startRoomCountdown(room);
      return ack?.({ status: "starting", state: serializeRoomState(room), mark });
    });

    sock.on("move", async (data, ack) => {
  if (!data) return ack?.({ status: "error" });

  const { bigSquare } = data;
  const room = await resolvePlayerRoom();

  if (!room) {
    return ack?.({ status: "error", message: "Room not found" });
  }

  const game = room.getGame();
  const mark = room.getPlayerMark(player);

  const moveData = gameLogic.validateMove(game, bigSquare, mark);
  if (moveData.status === "error") {
    return ack?.(moveData);
  }

  const moves = game.getMoves();
  const isFirstHalf = moves.length % 2 === 0;
  const symbolNumber = Math.floor(moves.length / 2) + 1;
  const symbol = `${mark}${symbolNumber}`;

  game.makeMove(bigSquare, symbol);

  const board = game.getBoard();
  board.board = gameLogic.updateBoard(board, bigSquare, symbol);
  game.appendBoard();

  const symbolIndex = game.getSymbolIndex();

  if (isFirstHalf) {
    // first placement of this quantum symbol
    symbolIndex.set(symbol, [bigSquare]);

    emitRoomState(room);

    return ack?.({ status: "ok" });
  }

  // second placement of this quantum symbol
  const existingSquares = symbolIndex.get(symbol) ?? [];
  existingSquares.push(bigSquare);
  symbolIndex.set(symbol, existingSquares);

  const totalMoves = game.getMoves().length;
  const previousMove = game.getMove(totalMoves - 2);
  const bigSquareOfTwin = previousMove.square;

  const cycleResult = gameLogic.checkForCycle(
    game.getMoves(),
    bigSquare,
    bigSquareOfTwin,
    symbol
  );

  // switch turn only after the pair is complete
  game.setTurn(mark === "X" ? "O" : "X");

  if (cycleResult.cycleFound) {
    game.setCyclePath(cycleResult.cyclePath);
    game.setCollapseChoices(
      room.ruleset === C.RULESETS.GOFF
        ? existingSquares.map(choiceSquare => [choiceSquare, symbol])
        : Array.from(new Map(cycleResult.cyclePath.map(([square, choiceSymbol]) => [
            `${square}:${choiceSymbol}`,
            [square, choiceSymbol]
          ])).values())
    );
    game.setNextAction("collapse");

    io.to(getRoomChannelId(room)).emit("cycleFound", {
      state: serializeRoomState(room)
    });
    void persistRoom(room);

    return ack?.({ status: "ok" });
  }

  emitRoomState(room);

  return ack?.({ status: "ok" });
});

    sock.on("collapse", async (data, ack) => {
      const { square, playerSymbol } = data || {};

      const room = await resolvePlayerRoom();
      if (!room) {
        return ack?.({ status: "error", message: "room not found" });
      }

      const roomId = room.getId?.() ?? room.roomId;
      const game = room.getGame();
      const board = game.getBoard();
      const path = game.getCyclePath();

      if (!Array.isArray(path)) {
        return ack?.({ status: "error", message: "No cycle to collapse" });
      }

      const collapsibleSquares = path.map(([sq]) => sq);
      if (!collapsibleSquares.includes(square)) {
        return ack?.({
          status: "error",
          message: `square ${square} is not collapsible`
        });
      }

      const collapseChoices = Array.isArray(game.getCollapseChoices?.())
        ? game.getCollapseChoices()
        : [];
      if (!collapseChoices.some(([choiceSquare, choiceSymbol]) => choiceSquare === square && choiceSymbol === playerSymbol)) {
        return ack?.({ status: "error", message: "That collapse choice is not valid" });
      }

      const symbolIndex = game.getSymbolIndex();
      const turn = game.getTurn();

      const collapsedBoard = gameLogic.collapseEntanglement(
        symbolIndex,
        board.getBoardArray(),
        square,
        playerSymbol,
        { ruleset: room.ruleset }
      );

      const finalBoard = gameLogic.checkIfOneSquareRemains(collapsedBoard, turn, {
        ruleset: room.ruleset
      });
      board.board = finalBoard;

      const winnerResult = gameLogic.checkWinner(finalBoard, {
        ruleset: room.ruleset
      });
      game.appendBoard();

      const winningLines = winnerResult.winningLines;
      const winningCombos = winnerResult.winningCombos;

      if (winningLines.length) {
        game.setWinner(winnerResult.resolvedWinner ?? "draw");
        game.setWinningLine(winningCombos);
        game.setNextAction("winner");
        room.clearPendingRequests();
        room.status = C.ROOM_STATUS.FINISHED;
        game.stopTimer();
      } else {
        game.setWinner(null);
        game.setNextAction("move");
        game.setCyclePath(null);
        game.setCollapseChoices(null);
      }

      emitRoomState(room);

      return ack?.({ status: "ok", message: "collapse" });
    });

    sock.on("rematchRequest", async (payload, ack) => {
      const room = await resolvePlayerRoom();
      if (!room) {
        return ack?.({ status: "error", message: "room not found" });
      }

      const mark = room.getPlayerMark(player);
      const result = room.requestRematch(mark);
      if (result.status !== "ok") {
        return ack?.(result);
      }

      io.to(getRoomChannelId(room)).emit("rematchRequested", {
        requesterMark: result.requesterMark,
        phase: result.phase,
        state: serializeRoomState(room)
      });
      void persistRoom(room);

      return ack?.({ status: "ok" });
    });

    sock.on("drawRequest", async (_payload, ack) => {
      const room = await resolvePlayerRoom();
      if (!room) {
        return ack?.({ status: "error", message: "room not found" });
      }

      const mark = room.getPlayerMark(player);
      const result = room.requestDraw(mark);
      if (result.status !== "ok") {
        return ack?.(result);
      }

      io.to(getRoomChannelId(room)).emit("drawRequested", {
        requesterMark: result.requesterMark,
        phase: result.phase,
        state: serializeRoomState(room)
      });
      void persistRoom(room);

      return ack?.({ status: "ok" });
    });

    sock.on("drawRespond", async (payload, ack) => {
      const room = await resolvePlayerRoom();
      if (!room) {
        return ack?.({ status: "error", message: "room not found" });
      }

      const mark = room.getPlayerMark(player);
      const result = room.respondToDraw(mark, payload?.accept);
      if (result.status !== "ok") {
        return ack?.(result);
      }

      io.to(getRoomChannelId(room)).emit("drawStatus", {
        status: result.accepted ? "accepted" : "declined",
        requesterMark: result.requesterMark,
        responderMark: result.responderMark,
        phase: result.phase,
        state: serializeRoomState(room)
      });
      void persistRoom(room);

      return ack?.({ status: "ok" });
    });

    sock.on("rematchRespond", async (payload, ack) => {
      const room = await resolvePlayerRoom();
      if (!room) {
        return ack?.({ status: "error", message: "room not found" });
      }

      const mark = room.getPlayerMark(player);
      const result = room.respondToRematch(mark, payload?.accept);
      if (result.status !== "ok") {
        return ack?.(result);
      }

      if (!result.accepted) {
        io.to(getRoomChannelId(room)).emit("rematchStatus", {
          status: "declined",
          requesterMark: result.requesterMark,
          responderMark: result.responderMark,
          phase: result.phase,
          state: serializeRoomState(room)
        });
        void persistRoom(room);

        return ack?.({ status: "ok" });
      }

      room.rematchGame();
      room.readyPlayer("X");
      room.readyPlayer("O");
      await startRoomCountdown(room);

      io.to(getRoomChannelId(room)).emit("rematchStatus", {
        status: "accepted",
        requesterMark: result.requesterMark,
        responderMark: result.responderMark,
        phase: result.phase,
        state: serializeRoomState(room)
      });
      void persistRoom(room);

      return ack?.({ status: "ok" });
    });

    sock.on("disconnect", async () => {
      console.log("disconnected:", sock.id, "player:", sock.playerId);

      const room = await resolvePlayerRoom();
      if (!room) return;

      roomManager.removeFromQueue(player);

      const mark = room.getPlayerMark(player);
      const roomId = room.getId?.() ?? room.roomId;

      const playerOfflineCallback = () => {
        player.setOffline();
        void persistPresence(player, { roomId, role: mark ? "player" : "spectator", mark });
        io.to(roomId).emit("playerOffline", { mark });
        void persistRoom(room);
        console.log(
          `${Date.now()} someone disconnected: ${player.playerId}, they were in room ${roomId} as ${mark}`
        );
      };

      const playerLeftCallback = () => {
        io.to(roomId).emit("playerLeft", { mark });
        void persistRoom(room);
      };

      const playerTimeoutWarningCallback = () => {
        io.to(roomId).emit("playerTimeoutWarning", { mark });
      };

      room.startPlayerOfflineTimeout(player, playerOfflineCallback);
      room.startTimeout(player, playerLeftCallback);
      room.startTimeoutInterval(player, playerTimeoutWarningCallback);
      void persistRoom(room);
    });
  });
}
