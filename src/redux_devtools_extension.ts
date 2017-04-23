import {Inject, Injectable, Type} from '@angular/core';
import {parse} from 'jsan';
import {Observable} from 'rxjs/Observable';

import {Action, Reducer, State} from './filnux_module';
import {DispatchAction} from './state_manager';
import {ROOT_STORE} from './store';
import {REDUX_DEVTOOLS_EXTENSION} from './tokens';

type ReduxAction = {
  type: string
};

export interface ReduxDevtoolsOptions {
  name?: string;
  actionCreators?: Object|Object[];
  latency?: number;
  maxAge?: number;
  serialize?: Object|boolean;
  // A bunch of other stuff todo later...
}

interface ReduxDevtoolsConnection {
  subscribe(listener: (message: any) => void);
  unsubscribe();
  // These accept more types, however we can restrict them since we're the only
  // consumers and typechecking is nice.
  send(action: ReduxAction, state: State);
  init(state: State);
  error(message: string);
}

interface LiftedState {
  nextActionId: number;
  actionsById:
      {[id: number]: {action: ReduxAction, timestamp: number, type: string}};
  stagedActionIds: number[];
  skippedActionIds: number[];
  committedState: State;
  currentStateIndex: number;
  computedStates: {state: State, error: any}[];
}

@Injectable()
export class ReduxDevtoolsExtension {
  private conn: ReduxDevtoolsConnection;
  private actions: Map<string, Function> = new Map<string, Function>();
  private initialState: State;
  private committedState: State;
  constructor(@Inject(REDUX_DEVTOOLS_EXTENSION) private args:
                  ReduxDevtoolsOptions) {
    if (typeof window !== 'object' || !window['__REDUX_DEVTOOLS_EXTENSION__']) {
      return;
    }
    this.conn = window['__REDUX_DEVTOOLS_EXTENSION__'].connect(args);
    ROOT_STORE.actions.subscribe(
        ({action, state}: {action: DispatchAction<any>, state: State}) => {
          if (!action) {
            this.conn.init(this.initialState = state);
          } else {
            this.actions.set(action.type, action.action.constructor);
            // Preemptively resolve .type.
            this.conn.send(Object.assign({type: action.type}, action), state);
          }
        });

    const actions = new Observable<any>(subscriber => {
      return this.conn.subscribe((message) => subscriber.next(message));
    });

    const startActions = actions.filter(action => action.type === 'START');
    const stopActions = actions.filter(action => action.type === 'STOP');

    const dispatchActions =
        actions.filter(action => action.type === 'DISPATCH');
    const actionActions = actions.filter(action => action.type === 'ACTION');

    startActions.switchMap(() => dispatchActions.takeUntil(stopActions))
        .subscribe(({payload, state}) => this.dispatch(payload, state));
  }

  /**
   * Attempts to convert a primitive Redux action (which does not have a
   * reduce() function) into an action that our root state can understand. It
   * does this by checking against previously seen actions from the action
   * listener.
   * @param reduxAction The action to resolve.
   * @returns An object subclassing Action that matches the type that
   * reduxAction represents.
   */
  // private resolveAction(reduxAction: ReduxAction): Action {
  //   if (this.actions.has(reduxAction.type)) {
  //     const target: Action<any> =
  //         Object.create(this.actions.get(reduxAction.type), {});
  //     for (const property in reduxAction) {
  //       if (reduxAction.hasOwnProperty(property) && property !== 'type') {
  //         try {
  //           target[property] = reduxAction[property];
  //         } catch (err) {
  //           console.warn(
  //               'Unable to assign property "' + property + '". ' +
  //               'If this is a getter, then this warning can safely be
  //               ignored.');
  //         }
  //       }
  //     }
  //     return target;
  //   }
  //   throw new Error(
  //       'Unable to resolve action "' + reduxAction.type +
  //       '". Was it registered in the module?');
  // }

  private toggleAction(actionId: number, liftedState: LiftedState) {
    const skipped = new Set(liftedState.skippedActionIds);
    if (skipped.has(actionId)) {
      skipped.delete(actionId);
    } else {
      skipped.add(actionId);
    }
    const index = liftedState.stagedActionIds.indexOf(actionId);
    if (index === -1) {
      return liftedState;
    }
    // Set the root state to what it was before the toggled action.
    //   this.stateManager.denormalize(liftedState.computedStates[index -
    //   1].state);
    // Then recompute the states.
    for (let i = index; i < liftedState.stagedActionIds.length; i++) {
      try {
        if (!skipped.has(liftedState.stagedActionIds[i])) {
          // const action = this.resolveAction(
          //     liftedState.actionsById[liftedState.stagedActionIds[i]].action);
          //   this.stateManager.update(action, true);
        }
      } catch (err) {
        this.conn.error(err.message);
      }
      //     liftedState.computedStates[i].state =
      //     this.stateManager.normalize();
    }
    liftedState.skippedActionIds = Array.from(skipped);
    return liftedState;
  }

  private dispatch(payload, state: string): LiftedState {
    switch (payload.type) {
      case 'RESET':
        this.conn.init(this.initialState);
        //     this.stateManager.denormalize(this.initialState);
        return;
      case 'COMMIT':
        //    this.conn.init(this.committedState =
        //    this.stateManager.normalize());
        return;
      case 'ROLLBACK':
        this.conn.init(this.committedState);
        //    this.stateManager.denormalize(this.committedState);
        return;
      case 'JUMP_TO_STATE':
      case 'JUMP_TO_ACTION':
        // this.stateManager.denormalize(<State>parse(state));
        return;
      case 'TOGGLE_ACTION':
        this.conn.send(
            null, this.toggleAction(payload.id, <LiftedState>parse(state)));
        return;
      case 'IMPORT_STATE':
        const computedStates = payload.nextLiftedState.computedStates;
        //  this.stateManager.denormalize(
        //      computedStates[computedStates.length - 1].state);
        this.conn.send(null, payload.nextLiftedState);
        return;
    }
  }
}
