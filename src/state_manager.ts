import {Injectable, Type} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import {BehaviorSubject, Subject} from 'rxjs/Rx';

import {Action, Node, State} from './filnux_module';
import {ROOT_STORE, Store, StoreOptions} from './store';

export class DispatchAction<T> implements Action<Node> {
  get type() {
    return this.action.type;
  }
  constructor(private path: string[], public action: Action<T>) {}
  reduce(root: State): State {
    let node = root;
    let created = false;
    for (const child of this.path) {
      if (!(child in node)) {
        created = true;
        node[child] = {};
      }
      node = node[child];
    }
    Object.assign(node, this.action.reduce(created ? null : node));
    return root;
  }
}
