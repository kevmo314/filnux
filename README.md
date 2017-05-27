# Filnux

Isolate, immutable state management for TypeScript.

**Actually, right now just for Angular, but generalized TypeScript support coming soon.**

__Filnux is still in active development. Many parts may not be working yet, see [planned features](#planned-features).__

Filnux takes its inspiration from [@ngrx/store](https://github.com/ngrx/store) with a few key modifications.

- Stores can be created on-demand.
- Class-based actions are used instead of a centralized reducer, allowing them to be contained within the module.
- Actions do not rely on magic strings for identification.

## Installation

`npm install filnux --save` or `yarn add filnux`.

# Example setup

For this example setup, we'll go through the standard Redux counter actions. Suppose our application consists a `CounterModule`, living in `counter.module.ts`, which is imported by `AppModule`.

We'll first create a state interface, then create actions, then install the actions into our modules. It is recommended to put the state and actions in a `counter.store.ts`, however this is not required. Feel free to mimic whatever naming convention you have in use.

## Create a state

```ts
// counter.store.ts
export class State {
  value: number = 0;
  constructor(previous?: State) {
    if (previous) {
      this.value = previous.value;
    }
  }
}
```

`State` doesn't have to be a class, it can be an interface instead, however it is nice to have a copy constructor for easy immutability in the actions. Additionally, having a class allows us some nice semantics for defining initial values.

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
    FilnuxModule.forRoot(AppModule)
  ],
})
export class AppModule {
  ...
}
```

The second optional argument to `.forRoot()` is passed to Redux DevTools. See the available parameters [here](http://extension.remotedev.io/docs/API/Arguments.html).

## Using the store

In `CounterComponent`, we can inject `Store` to retrieve the store for our `State`.

```ts
// counter.component.ts
import {Store} from 'filnux';
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
  store: Store<State>;

  constructor(private store: Store){
    this.store = new Store<State>({
                   initialState: new State()
                 }).addActions([ResetCounterAction, DeltaCounterAction]);
    this.counter = this.store.select(s => s.value);
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

To dispatch actions, we simply create a new instance of the action we'd like to dispatch and send it off to the store with `.dispatch()`.

# Simplified example

In the [example setup](#example-setup), we used a full object to represent state for demonstration purposes. We can get away with a much simpler set of definitions.

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

# Planned features

In descending order of priority,

- [ ] Support for lazy-loaded modules.
- [ ] Remove the need to supply the module and children in module installation.
- [ ] Add a `@Select(Module, func)` decorator.
- [ ] Add event hooks and router bindings.
- [ ] Add tests.
- [ ] Improve DevTools integration.
- [ ] Add cleanup hooks for component destruction.

# Why "Filnux"?

It's the word *influx* with the letters sorted alphabetically. 🙂
