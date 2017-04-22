import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import {BehaviorSubject, Subject} from 'rxjs/Rx';

import {Action, Node, State} from './filnux_module';
import {Store, StoreOptions} from './store';

interface NormalizedState {
  stores: State
}

export class DispatchAction<T> implements Action<Node> {
  get type() {
    return this.action.type;
  }
  constructor(private context: Type<any>, private key: string, private action: Action<T>) {  }
  reduce(root: Node): Node {
    this.store.state = this.action.reduce(this.store.state);
    return root;
  }
}

export class CreateStoreAction<T> implements Action<Node> {
  readonly type = "[Filnux] Create store";
  constructor(private store: Store<T>) { }
  reduce(root: Node): Node {
    let node = root;
    if (this.store.context) {
      for (const child of StateManager.getContextPath(this.store.context)) {
        if (!node.children) {
          node.children = new Map<Type<any>, Node>();
        }
        if (!node.children.has(child)) {
          node.children.set(child, {} as Node);
        }
        node = node.children.get(child);
      }
    }
    if (!node.stores) {
      node.stores = new Map<string, Store<any>>();
    }
    node.stores.set(this.store.key, this.store);
    return root;
  }
}

/**
 * A global state manager, invokes reducers for incoming actions.
 */
export namespace StateManager {
  const root: Node = {};
  export const actions = new Observable<Action<any>>();
  export const normalized = actions.map(action => {
    return {action, state: normalize()};
  });

  export function error(err: any) {
    console.error(err);
    debugger;
  }

  export function addStore(store: Store<any>) {
    // Then add it to the context node.
    let node = root;
    if (store.context) {
      for (const child of getContextPath(store.context)) {
        if (!node.children) {
          node.children = new Map<Type<any>, Node>();
        }
        if (!node.children.has(child)) {
          node.children.set(child, {} as Node);
        }
        node = node.children.get(child);
      }
    }
    if (!node.stores) {
      node.stores = new Map<string, Store<any>>();
    }
    node.stores.set(store.key, store);
  }

  function getContextPath(context: Type<any>): Type<any>[] {
    return [context];
  }

  /**
   * Returns a normalized state which follows the object pattern more common
   * among Redux implementations for debugging and visualization.
   * @returns A normalized `State`.
   */
  function normalize(node: Node = root): State {
    const state = {};
    if (node.stores) {
      state['__store__'] = {};
      node.stores.forEach((value, key) => {
        state['__store__'][key] = value;
      });
    }
    if (node.children) {
      node.children.forEach((value, key) => {
        state[key.name] = this.normalize(value);
      });
    }
    return state;
  }

  /**
   * Sets the state to a given, normalized state. This is the inverse of
   * `normalize`.
   * @param state The normalized state to reset this tree to.
   */
  function denormalize(state: State, node: Node = this.root) {
    for (const context in state) {
      if (context == '__store__') {
        for (const key in state['__store__']) {
          node.stores.get(key).reset(state['__store__'][key]);
        }
      } else {
        const matchingType =
            Array.from(node.children.keys()).find(key => key.name == context);
        denormalize(state[context], node.children.get(matchingType));
      }
    }
  }
}
