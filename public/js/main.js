import { ViewManager } from "./ViewManager.js";
import { createEventHandlers } from "./network/eventHandler.js";
import { createGameEventHandler } from "./network/gameEventHandler.js";
import { createRouter } from "./router.js";
import { createEmitter } from "./network/emitters.js";
import { createReciever } from "./network/reciever.js";
import { MainView } from "./views/MainView.js";
import { GameView } from "./views/GameView.js";
import { AdminView } from "./views/AdminView.js";
import { ErrorView } from "./views/ErrorView.js";
import { ActiveGamesView } from "./views/ActiveGamesView.js";
import { createActions } from "./interaction.js";
import {wireSocketToBus} from "./network/wireHandlers.js";
import { createDispatcher } from "./game/dispatch.js";
import { createLocalGameController } from "./game/localGame.js";
import { MatchmakingView } from "./views/MatchmakingView.js";
import { hasSavedPlayerName } from "./game/state.js";

//Create App root uwu
const root = document.getElementById("app");
const appConfig = window.__QTTT_CONFIG__ ?? {
  devMode:
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1",
  dbAvailable: false,
  multiplayerEnabled: false,
  dbStatusText: "Database unavailable"
};


//make vm first (router will call vm.show). 'Show' acutally mounts and displays what user sees.
const vm = new ViewManager(root, {});
vm.connect(); //subscribed to state changes.

const wire = wireSocketToBus();
const turnOffEventHandlers = createEventHandlers();

//create emitter. This holds all methods that talk to server and recieve acknowledgements.
const emitter = createEmitter();
//create reciever. This holds all methods that request data from server.
const reciever = createReciever();
const localGame = createLocalGameController({ appConfig, reciever });

//This logic handles routing to different views based on URL patterns. Also randles refresh internally.
//This is getting roomId from url
const router = createRouter({
  routes: [
    { name: "main",  pattern: /^\/(?:main\/?)?$/ },
    { name: "matchmaking", pattern: /^\/matchmaking\/?$/ },
    { name: "mp", pattern: /^\/game\/mp\/(?<id>[^/]+)\/?$/ },
    { name: "local", pattern: /^\/game\/local\/?$/ },
    { name: "active-games", pattern: /^\/games\/active\/?$/ },
    { name: "admin", pattern: /^\/admin\/dev-db\/?$/ },
  ],
  onRoute: ({ name, params }) => {
    if (name === "main") vm.show(MainView);
    if (name === "matchmaking") {
      if (!appConfig.multiplayerEnabled) {
        vm.show(ErrorView, {
          title: "Multiplayer is unavailable",
          message: "PostgreSQL is currently offline, so only local games are available right now."
        });
        return;
      }

      if (!hasSavedPlayerName()) {
        vm.show(ErrorView, {
          title: "Player name required",
          message: "Save a clean player name before starting multiplayer matchmaking."
        });
        return;
      }

      vm.show(MatchmakingView);
    }
    if (name === "local") vm.show(GameView , { local: true });
    if (name === "mp") {
      if (!appConfig.multiplayerEnabled) {
        vm.show(ErrorView, {
          title: "Multiplayer is unavailable",
          message: "PostgreSQL is currently offline, so only local games are available right now."
        });
        return;
      }

      if (!hasSavedPlayerName()) {
        vm.show(ErrorView, {
          title: "Player name required",
          message: "Save a clean player name before joining a multiplayer room."
        });
        return;
      }

      vm.show(GameView, { roomId: params.id, eventHandlerFactory: createGameEventHandler });
    }
    if (name === "active-games") {
      if (!appConfig.multiplayerEnabled) {
        vm.show(ErrorView, {
          title: "Active games are unavailable",
          message: "PostgreSQL is currently offline, so the active-games list cannot be loaded."
        });
        return;
      }

      if (!hasSavedPlayerName()) {
        vm.show(ErrorView, {
          title: "Player name required",
          message: "Save a clean player name before browsing active multiplayer rooms."
        });
        return;
      }

      vm.show(ActiveGamesView);
    }
    if (name === "admin") {
      if (!appConfig.devMode) {
        router.replace("/");
        return;
      }
      vm.show(AdminView);
    }
    if (name === "not_found") router.replace("/");
  },
});

const action = createActions({emitter: emitter, router: router, localGame, appConfig});//Handles all user interactions (clicking, typing)
const dispatch = createDispatcher(action.handleAction); //Validates actions


//Add action as a dependency as this will called when buttons are clicked, you get me.
vm.deps.action = action;
vm.deps.emitter = emitter;
vm.deps.reciever = reciever; // Some views will auto call these to receive data from server.
vm.deps.dispatch = dispatch; // Game views will need to dispatch actions based on user interaction.
vm.deps.localGame = localGame;
vm.deps.appConfig = appConfig;



//Initial routing on refresh
router.onRoute(router.currentUrl);
