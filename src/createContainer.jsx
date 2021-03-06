import shallowEqual from 'shallowequal';
import React, {Component} from 'react';
import { createStructuredSelector } from 'reselect';
import { argumentContainer } from './utils';
import { createEmptyContainer } from './createEmptyContainer';

function createSelectGetter(s) {
  return state => state[s];
}

function defaultMapStoreProps(store) {
  return {
    getStoreState: store.getState,
    setStoreState: store.setState,
    batchStore: store.batch,
  };
}

export function createContainer(selector_, option = {}) {
  const {pure = true, mapStoreProps = defaultMapStoreProps, ref, storeName = 'store'} = option;

  if (!selector_) {
    return createEmptyContainer(mapStoreProps, storeName);
  }

  let selector = selector_;

  if (typeof selector === 'object') {
    const selectMap = {};
    for (const s in selector) {
      if (selector.hasOwnProperty(s)) {
        selectMap[s] = createSelectGetter(selector[s]);
      }
    }
    selector = createStructuredSelector(selectMap);
  }

  const shouldUpdateStateProps = selector.length > 1;

  return function create(WrappedComponent) {
    class Container extends Component {
      constructor(props, context) {
        super(props, context);
        this.onChange = this.onChange.bind(this);
        this.state = {
          appState: this.getAppState() || {},
        };
      }

      // use componentWillMount instead of componentDidMount to support setState inside WrappedComponent's componentDidMount and componentWillMount
      componentWillMount() {
        if (!this.unsubscribe) {
          this.unsubscribe = this.context[storeName].subscribe(this.onChange);
        }
      }

      componentWillReceiveProps(nextProps) {
        let appState;
        if (pure) {
          let propsChanged = false;
          if (shouldUpdateStateProps) {
            propsChanged = !shallowEqual(nextProps, this.props);
          }
          if (propsChanged) {
            appState = this.getAppState(nextProps);
          }
        } else if (shouldUpdateStateProps) {
          appState = this.getAppState(nextProps);
        }
        if (appState) {
          this.setState({
            appState,
          });
        }
      }

      shouldComponentUpdate(nextProps, nextState) {
        if (pure) {
          const propsChanged = !shallowEqual(nextProps, this.props);
          if (propsChanged) {
            return true;
          }
          return !shallowEqual(nextState.appState, this.state.appState);
        }
        return true;
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
      }

      onChange() {
        this.setState({
          appState: this.getAppState(),
        });
      }

      getAppState(props = this.props) {
        const store = this.context[storeName];
        const state = store.getState();
        return shouldUpdateStateProps ?
          selector(state, props) :
          selector(state);
      }

      render() {
        const {appState} = this.state;
        const store = this.context[storeName];
        return (
          <WrappedComponent {...appState}
            {...mapStoreProps(store)}
            {...this.props}
            ref={ref}/>
        );
      }
    }

    return argumentContainer(Container, WrappedComponent, storeName);
  };
}
