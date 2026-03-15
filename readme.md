

Different action types:
COLLAPSE_SYMBOL_CLICK
BOARD_CELL_CLICK

All legit board clicks are sent through the dispatch function which checks validity.


To do:
Think about all enum categories being stored as strings
Handle local matchs


Currently I don't think a player can be a player in a game and a spectator in another

I've added code to the 'create room' sock server handler to cap the number of rooms in the environment. Make sure it integrates wll with the rest of the code.

if player tries to start a game, either local or mp, but they are already a player in a game, just send them to the current game asking them to finish it. In a toast or whatever is appropriate.

Not in the game we have a player and host index. This is just basically for the cache we want to use it to retrieve data where possible but also need to be referencing the db where it makes to do so instead of the caxhe if that makes sense. I call getPlayerRoom a few times in the handler for example. REad through all these instances and where appropriate rewrite the RoomManager code to ref the db or someother more apprpriate method to integrate the db when reading data.

We wanna use playerIndex where we can but use the DB for example on connection, app should read from the DB for player info.

For the local game there needs to be an option to just restart the game mid game

In the mp game a player should be able to request a draw or rematch mid game.