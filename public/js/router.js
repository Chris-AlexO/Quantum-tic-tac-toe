export function createRouter({ routes, onRoute }) {
  
  function match(pathname) {
    for (const r of routes) {
      const m = pathname.match(r.pattern);
      if (m) return { name: r.name, params: m.groups ?? {} };
    }
    return { name: "not_found", params: {} };
  }

  function go(path, state = {}) {
    if (path === location.pathname) {
      onRoute(match(location.pathname));
      return;
    }
    history.pushState(state, "", path);
    onRoute(match(location.pathname));
  }

  async function awaitThenGo(path, promise) {
    const state = await promise();
    go(path, state);

  }

  function replace(path, state = {}) {
    if (path === location.pathname) {
      onRoute(match(location.pathname));
      return;
    }
    history.replaceState(state, "", path);
    onRoute(match(location.pathname));
  }

  window.addEventListener("popstate", () => {
    onRoute(match(location.pathname));
  });


   const currentUrl = match(location.pathname);

  // initial render. so every refresh the url is read and correct view shown.
  //onRoute();

  return { go, replace, onRoute, currentUrl };
}
