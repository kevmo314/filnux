import {Inject, ModuleWithProviders, NgModule, OnDestroy, Type} from '@angular/core';
import {Compiler, InjectionToken, Injector, NgModuleFactory, NgModuleFactoryLoader, NgModuleRef} from '@angular/core';

import {ReduxDevtoolsExtension, ReduxDevtoolsOptions} from './redux_devtools_extension';
import {StateManager} from './state_manager';
import {Store} from './store';
import {StoreConfig} from './store_config';
import {REDUX_DEVTOOLS_EXTENSION, STORE_CONFIG} from './tokens';

// States are just objects. This is here for syntactic sugar.
export type State = Object;

export interface Action {
  type?: string;
  reduce(state: State): State;
}

export interface Reducer<S extends State, A extends Action> {
  (state: S, action: A): S;
}

/**
 * A wrapper around each module's state, stored in a tree matching the feature
 * module tree.
 */
export interface SpecificationNode {
  module: Type<any>;
  reducer: Reducer<State, Action>;
  state: State;
  children: SpecificationNode[];
}

@NgModule({providers: [StateManager, ReduxDevtoolsExtension]})
export class FilnuxModule implements OnDestroy {
  static forRoot(args: StoreConfig): ModuleWithProviders {
    return {
      ngModule: FilnuxModule,
      providers: [
        {
          provide: STORE_CONFIG,
          multi: true,
          useValue: <StoreConfig>Object.assign({children: []}, args)
        },
        Store, {
          provide: REDUX_DEVTOOLS_EXTENSION,
          useValue:
              Object.assign({serialize: {options: true}}, args.devtoolsOptions)
        }
      ]
    };
  }

  static forChild(args: StoreConfig): ModuleWithProviders {
    return {
      ngModule: FilnuxModule,
      providers: [
        {
          provide: STORE_CONFIG,
          multi: true,
          useValue: <StoreConfig>Object.assign({children: []}, args)
        },
        Store
      ]
    };
  }

  private readonly storeConfigMap = new Map<Type<any>, StoreConfig>();

  constructor(
      private stateManager: StateManager,
      private reduxDevtoolsExtension: ReduxDevtoolsExtension,
      @Inject(STORE_CONFIG) private storeConfigs: StoreConfig[]) {
    const childNodes: Set<Type<any>> = new Set<Type<any>>();
    storeConfigs.map(config => config.children || []).forEach(children => {
      for (const child of children) {
        childNodes.add(child);
      }
    });
    const rootCandidates: Type<any>[] =
        storeConfigs.map(config => config.module)
            .filter(module => !childNodes.has(module));
    if (rootCandidates.length === 0) {
      throw new Error(
          'Invalid module tree configuration, no module was identified as the root.');
    } else if (rootCandidates.length > 1) {
      throw new Error(
          'Invalid module tree configuration, at least two modules were not declared as children.');
    }

    for (const storeConfig of storeConfigs) {
      this.storeConfigMap.set(storeConfig.module, storeConfig);
    }

    this.stateManager.initialize(
        this.toSpecificationNode(this.storeConfigMap.get(rootCandidates[0])));
  }

  ngOnDestroy() {
    //   this.features.forEach(
    //       feature => this.reducerManager.removeFeature(feature));
  }

  /**
   * Converts a given StoreConfig to a SpecificationNode.
   */
  private toSpecificationNode(storeConfig: StoreConfig): SpecificationNode {
    return <SpecificationNode>{
      module: storeConfig.module,
      reducer: this.getReducer(storeConfig),
      state: null,
      children: storeConfig.children.map(
          module => this.toSpecificationNode(this.storeConfigMap.get(module)))
    };
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