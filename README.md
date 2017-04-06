# Filnux
Isolate, immutable state management for Angular.

__Filnux is still in active development. Many parts may not be working yet, see [planned features](#planned-features).__

Filnux takes its inspiration from @ngrx/store.

## Installation

```sh
npm install filnux --save
```

# Example setup

For this example setup, we'll go through the standard Redux counter actions. Suppose our application consists a `CounterModule`, living in `counter.module.ts`, which is imported by `AppModule`.

We'll first create a state interface, then create actions, then install the actions into our modules. It is recommended to put the state and actions in a `counter.store.ts` to mimic `counter.module.ts`, however this is not required. Feel free to mimic whatever naming convention you have in use.

## Create a state

```ts
// counter.module.ts
export class State {
  value: number;
  constructor(copy: State) {
    this.value = copy.value;
  }
}
```

`State` doesn't have to be a class, it can be an interface instead, however it is nice to have a copy constructor for easy immutability in the actions.

## Creating actions

Create individual classes for each action type. It is also recommended to put this in `counter.store.ts`.

```ts
// counter.store.ts
import {Action} from 'filnux';

class ResetCounterAction implements Action {
  reduce(state: State): State {
    state = new State(state);
    state.value = 0;
    return state;
  }
}

class DeltaCounterAction implements Action {
  constructor(private delta: number) {}
  reduce(state: State): State {
    state = new State(state);
    state.value += this.delta;
    return state;
  }
}
```

A note on the above implementation, there is no explicit requirement for `State` to be an object, it can just be a number instead. However, it is wrapped in an object for demonstration here. See [the simplified example](#simplified-example) for more details.

## Installing `FilnuxModule`

In `AppModule`'s `@NgModule()`, add an import for `FilnuxModule.forRoot()`.

```ts
// app.module.ts
import {FilnuxModule} from 'filnux';
import {CounterModule} from './counter.module';

@NgModule({
  imports: [
    CounterModule,
    FilnuxModule.forRoot({module: AppModule, children: [CounterModule]})
  ],
})
export class AppModule {
  ...
}
```

and then add an import for `CounterModule`, but instead with `FilnuxModule.forChild()`, installing the actions.

```ts
// counter.module.ts
import {FilnuxModule} from 'filnux';

@NgModule({
  imports: [
    FilnuxModule.forChild({module: CounterModule, actions: [ResetCounterAction, DeltaCounterAction], initialState: {value: 0}})
  ],
})
export class CounterModule {
  ...
}
```

## Using the store

In `CounterComponent`, we can inject `Store<State>` to retrieve the store for our `State`.

```ts
// counter.component.ts
import {Store} from 'filnux';
import {CounterModule} from './counter.module';
import {State, ResetCounterAction, DeltaCounterAction} from './counter.store';

@Component({
	selector: 'counter',
	template: `
		<button (click)="increment()">Increment</button>
		<div>Current Count: {{ counter | async }}</div>
		<button (click)="decrement()">Decrement</button>
		<button (click)="reset()">Reset Counter</button>
	`
})
class CounterComponent {
	counter: Observable<number>;

	constructor(private store: Store<State>){
		this.counter = store.select(CounterModule).map(state => state.value);
	}

	increment(){
		this.store.dispatch(new DeltaCounterAction(1));
	}

	decrement(){
		this.store.dispatch(new DeltaCounterAction(-1));
	}

	reset(){
		this.store.dispatch(new ResetCounterAction());
	}
}
```

Note that unlike other Redux implementations that take the key as an argument to `.select()`, Filnux takes the module whose store you'd like to access. This allows you to access any module's store from any component, however it is recommended to only access child module's stores to maintain encapsulation. Additionally, you will always receive the module's entire state, so we must map the observable to the relevant value.

To dispatch actions, we simply create a new instance of the action we'd like to dispatch and send it off to the store with `.dispatch()`.

# Configuration

The `.forRoot()` and `.forChild()` accept a single object as argument, which takes the following parameters

```ts
export interface StoreConfig {
  children?: Type<any>[];
  reducer?: Reducer<State, Action>;
  actions?: Object|Action[];
  module: Type<any>;
  devtoolsOptions?: ReduxDevtoolsOptions;
  initialState?: State;
}
```

- `children` is an optional list of child modules.
- `reducer` is an optional function that, if provided, behaves like the standard Redux reducer.
- `actions` is a list of actions, or an object to restrict actions to specific fields.
- `module` is the current module.
- `devtoolsOptions` is an object that is passed to [Redux DevTools](http://extension.remotedev.io/docs/API/Arguments.html).
- `initialState` is the state to start with.

## Devtools

Filnux works with the [Redux DevTools](http://extension.remotedev.io/) with no additional configuration.

# Concepts

Filnux is inspired by [Redux](http://redux.js.org/) with a few key modifications.

- Each module has its own store.
- Class-based actions are used instead of a centralized reducer.
- Actions do not rely on magic strings for identification.

## Simplified example

In the [example setup](#example-setup), we used a full object to represent state for demonstration purposes. We can get away with a much simpler set of definitions.

```ts
// counter.module.ts
import {FilnuxModule} from 'filnux';

@NgModule({
  imports: [
    FilnuxModule.forRoot({module: CounterModule, actions: [ResetCounterAction, DeltaCounterAction], initialState: 0})
  ],
})
export class CounterModule {
  ...
}
```

Note that `.forRoot()` doesn't need to be installed necessarily at the root of your application, but it should be installed as far up your feature tree as possible. It's generally a good idea to put it in the root `AppModule`.

```ts
// counter.store.ts
import {Action} from 'filnux';

class ResetCounterAction implements Action {
  reduce(state: number): number {
    return 0;
  }
}

class DeltaCounterAction implements Action {
  constructor(private delta: number) {}
  reduce(state: number): number {
    return state + delta;
  }
}
```

```ts
// counter.component.ts
import {Store} from 'filnux';
import {CounterModule} from './counter.module';
import {State, ResetCounterAction, DeltaCounterAction} from './counter.store';

@Component({
	selector: 'counter',
	template: `
		<button (click)="increment()">Increment</button>
		<div>Current Count: {{ counter | async }}</div>
		<button (click)="decrement()">Decrement</button>
		<button (click)="reset()">Reset Counter</button>
	`
})
class CounterComponent {
	counter: Observable<number>;

	constructor(private store: Store<State>){
		this.counter = store.select(CounterModule);
	}

	increment(){
		this.store.dispatch(new DeltaCounterAction(1));
	}

	decrement(){
		this.store.dispatch(new DeltaCounterAction(-1));
	}

	reset(){
		this.store.dispatch(new ResetCounterAction());
	}
}
```

# Planned features

In descending order of priority,

- [ ] Support for lazy-loaded modules.
- [ ] Remove the need to supply the module and children in module installation.
- [ ] Add a `@Select(Module, func)` decorator.
- [ ] Add tests.
- [ ] Improve DevTools integration.
- [ ] Add cleanup hooks for component destruction.

# Why "Filnux"?

It's the word *influx* with the letters sorted alphabetically. 🙂