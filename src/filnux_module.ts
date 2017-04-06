import {Inject, ModuleWithProviders, NgModule, OnDestroy, Type} from '@angular/core';
import {Compiler, InjectionToken, Injector, NgModuleFactory, NgModuleFactoryLoader, NgModuleRef} from '@angular/core';

import {ReduxDevtoolsExtension, ReduxDevtoolsOptions} from './redux_devtools_extension';
import {RootState} from './root_state';
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

export interface SpecificationNode {
  module: Type<any>;
  reducer: Reducer<State, Action>;
  state: State;
  children: SpecificationNode[];
}

@NgModule({providers: [RootState, ReduxDevtoolsExtension]})
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

  constructor(
      private rootState: RootState,
      // Inject this so it gets instantiated.
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
    if (rootCandidates.length !== 1) {
      throw new Error('Invalid module tree configuration.');
    }

    this.rootState.initialize(
        this.toSpecificationNode(this.getStoreConfig(rootCandidates[0])));
  }

  ngOnDestroy() {
    //   this.features.forEach(
    //       feature => this.reducerManager.removeFeature(feature));
  }

  getStoreConfig(node: Type<any>): StoreConfig {
    return this.storeConfigs.find(config => config.module === node);
  }

  toSpecificationNode(storeConfig: StoreConfig): SpecificationNode {
    return <SpecificationNode>{
      module: storeConfig.module,
      reducer: this.getReducer(storeConfig),
      state: null,
      children: storeConfig.children.map(
          module => this.toSpecificationNode(this.getStoreConfig(module)))
    };
  }

  getReducer(storeConfig: StoreConfig): Reducer<State, Action> {
    if (storeConfig.reducer) {
      return storeConfig.reducer;
    }
    if (storeConfig.actions) {
      return this.parseActions(storeConfig.actions, storeConfig.initialState);
    }
    return x => x;
  }

  parseActions(actionTypes: Object|Type<any>[], initialState: State):
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