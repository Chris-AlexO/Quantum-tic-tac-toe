import { getState, subscribe } from "./game/state.js";

export class ViewManager
{

    constructor(container = document.body, deps)
    {
        this.container = container;
        this.activeView = null;
        this._unsubscribe = null;
        this._lastState = null;
        this.views = new Map();

        this.root = container;
        this.current = null;
        this.deps = deps;
        this.navigationToken = 0;

    }

    async show(View, props={})
    {
        const token = ++this.navigationToken;
        this.current?.unmount(this.root);
        this.root.replaceChildren();

        const nextView = new View({ ...this.deps, ...(props ?? {}) });
        this.current = nextView;
        await nextView.mount(this.root);

        if (token !== this.navigationToken || this.current !== nextView) {
            nextView.unmount(this.root);
            return;
        }

        nextView.updateView?.(getState());

    }

    connect()
    {
        if(this._unsubscribe) return;
        this._unsubscribe = subscribe(this._handleStateUpdate.bind(this));
    }

    _handleStateChange(newState)
    {
        if(this.activeView && this.activeView.updateView && newState !== this._lastState)
        {
            this.activeView?.updateView?.(newState);
            this._lastState = newState;
        }
    }

    _handleStateUpdate(newState)
    {
        if(this.current)
        {
            this.current.updateView?.(newState);
            this._lastState = newState;
        }
    }



    switchView(view)
    {
        if(this.activeView  && this.activeView!==view){
        this.activeView.container.style.display = 'none';}

        view.api;
        view.container.style.display = 'block';
        this.activeView = view;
        this.activeView?.updateView?.(getState());
        //console.log(`activated: ${this.activeView.container.className}`);
    }

}
