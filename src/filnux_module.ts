import {Inject, ModuleWithProviders, NgModule, OnDestroy, Type} from '@angular/core';
import {Compiler, InjectionToken, Injector, NgModuleFactory, NgModuleFactoryLoader, NgModuleRef} from '@angular/core';

import {ReduxDevtoolsExtension, ReduxDevtoolsOptions} from './redux_devtools_extension';
import {StateManager} from './state_manager';
import {Store} from './store';
import {REDUX_DEVTOOLS_EXTENSION} from './tokens';

// States are just objects. This is here for syntactic sugar.
export type State = Object;

export abstract class Action<S> {
  get type(): string {
    return this.constructor.name;
  }
  abstract reduce<S extends State>(state: S): S;
}

export interface Reducer<S extends State, A extends Action<S>> {
  (state: S, action: A): S;
}

/**
 * A wrapper around each module's state, stored in a tree matching the feature
 * module tree.
 */
export interface Node {
  stores?: Map<string, Store<any>>;
  children?: Map<Type<any>, Node>;
}

@NgModule({providers: [ReduxDevtoolsExtension]})
export class FilnuxModule implements OnDestroy {
  static forRoot(root: Type<any>, devtoolsOptions: ReduxDevtoolsOptions = {}):
      ModuleWithProviders {
    StateManager.setRootContext(root);
    return {
      ngModule: FilnuxModule,
      providers: [{
        provide: REDUX_DEVTOOLS_EXTENSION,
        useValue: Object.assign({serialize: {options: true}}, devtoolsOptions)
      }]
    };
  }

  constructor(private reduxDevtoolsExtension: ReduxDevtoolsExtension) {}

  ngOnDestroy() {
    //   this.features.forEach(
    //       feature => this.reducerManager.removeFeature(feature));
  }

  /**
   * Gets the reducer for a given StoreConfig that uses the actions defined in
   * the config.
   */
  private getReducer(storeConfig: StoreConfig): Reducer<State, Action> {
    if (storeConfig.reducer) {
      return storeConfig.reducer;
    }
    if (storeConfig.actions) {
      return this.parseActions(storeConfig.actions, storeConfig.initialState);
    }
    return x => x;
  }

  /**
   * Parse a StoreConfig.action parameter and return a created reducer from the
   * given parameters.
   * @param actionTypes The parameter to parse.
   * @param initialState The initial state to pass to the created reducers.
   */
  private parseActions(actionTypes: Object|Type<Action>[], initialState: State):
      Reducer<State, Action> {
    if (actionTypes instanceof Array) {
      // TODO: Optimize by building a map of types to actions maybe.
      return (state: State, action: Action): State => {
        state = Object.assign({}, state || (initialState ? initialState : {}));
        for (const actionType of actionTypes) {
          if (action instanceof actionType) {
            return action.reduce(state);
          }
        }
        return state;
      };
    } else {
      // Build a reducer. First, collapse the tree to be one-deep.
      for (const key of Object.keys(actionTypes)) {
        actionTypes[key] = this.parseActions(
            actionTypes[key], initialState && initialState[key]);
      }
      // Then return a reducer that iterates through, calling the reducers.
      return (state: State, action: Action): State => {
        state = Object.assign({}, state || (initialState ? initialState : {}));
        for (const key of Object.keys(state)) {
          state[key] = actionTypes[key](state[key], action);
        }
        return state;
      };
    }
  }
}