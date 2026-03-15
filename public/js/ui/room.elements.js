
export default function buildRoom(){
    const root = buildElement("div","room");

    const sidebarDiv = buildElement("div", "sidebar"); //Will contain the players' info and a go back button
    const mainTextDiv = buildElement("div", "status-banner");

    //maybe include host info
    const meUI = buildPlayerDisplay();
    const oppUI = buildPlayerDisplay();

    sidebarDiv.append(meUI.root, oppUI.root);

    root.append(mainTextDiv, sidebarDiv);
    
    return {r: root, me: meUI.elements, opp: oppUI.elements, mainText: mainTextDiv};

}


//Build each player icons in the side bar. Their name, picture, status, etc..

function buildPlayerDisplay(){

    const root = buildElement("div", "player-display-container");
    const elements = {};

    elements.label = buildElement("p", "player-label");
    elements.name = buildElement("p", "name");
    elements.connectionStatus = buildElement("p", "meta");
    elements.time = buildElement("p", "meta");
    elements.mark = buildElement("p", "meta");

    root.append(
      elements.label,
      elements.name,
      elements.connectionStatus,
      elements.time,
      elements.mark
    );

    return {root: root, elements: elements};
}


function buildElement(el, className){
    const e = document.createElement(el);

    if(className){
        e.classList.add(className);
    }

    return e;
}
