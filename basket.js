// СОЗДАНИЕ СТОРА

function createStore(reducer) {
  let state = reducer(undefined, {}); //стартовая инициализация состояния, запуск редьюсера со state === undefined
  let cbs = []; //массив подписчиков

  const getState = () => state; //функция, возвращающая переменную из замыкания
  const subscribe = (cb) => (
    cbs.push(cb), //запоминаем подписчиков в массиве
    () => (cbs = cbs.filter((c) => c !== cb))
  ); //возвращаем функцию unsubscribe, которая удаляет подписчика из списка

  const dispatch = (action) => {
    if (typeof action === "function") {
      //если action - не объект, а функция
      return action(dispatch, getState); //запускаем эту функцию и даем ей dispatch и getState для работы
    }
    const newState = reducer(state, action); //пробуем запустить редьюсер
    if (newState !== state) {
      //проверяем, смог ли редьюсер обработать action
      state = newState; //если смог, то обновляем state
      for (let cb of cbs) cb(); //и запускаем подписчиков
    }
  };

  return {
    getState, //добавление функции getState в результирующий объект
    dispatch,
    subscribe, //добавление subscribe в объект
  };
}

// {
//   idТовара1: {count: число1, good: {....інфа про товар з бекенда, включаючи ціну, опис та картинки}},
//   idТовара2: {count: число2, good: {....інфа про товар з бекенда, включаючи ціну, опис та картинки}},
// }

// типы экшОнов

const actionCartAdd = (good, count = 1) => ({ type: "CART_ADD", count, good });

const actionCartSub = (good, count = 1) => ({ type: "CART_SUB", count, good });

const actionCartDel = (good) => ({ type: "CART_DEL", good });

const actionCartSet = (good, count = 1) => ({ type: "CART_SET", count, good });

const actionCartClear = () => ({type: 'CART_CLEAR'})

// функция редюсер

function cartReducer(state = {}, { type, count, good }) {
  if (type === "CART_ADD") {
    const { _id, price } = good;
    if (count < 0) {
      return { ...state };
    } else {
      return {
        ...state,
        [_id]: {
          good: { _id, price },
          count: state[_id] ? state[_id].count + count : count,
        },
      };
    }
  }

  if (type === "CART_SUB") {
    const { _id, price } = good;
    const newCount = state[_id].count - count;
    if (count < 0) {
      return { ...state };
    }
    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good: { _id, price },
          count: newCount,
        },
      };
    } else {
      const newState = { ...state };
      delete newState[_id];
      return newState;
    }
  }

  if (type === "CART_DEL") {
    const { _id } = good;
    const newState = { ...state };
    delete newState[_id];
    return newState;
  }

  if (type === "CART_SET") {
    const { _id, price } = good;
    const newCount = count;

    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good: { _id, price },
          count: newCount,
        },
      };
    } else {
      const newState = { ...state };
      delete newState[_id];
      return newState;
    }
  }
  
  if (type === "CART_CLEAR") {
    
    return state = {};
  }
  
  else {
    return state;
  }
}

// проверка

const store = createStore(cartReducer);

store.subscribe(() => console.log(store.getState())); //

console.log(store.getState()); //{}

store.dispatch(actionCartAdd({ _id: "пиво", price: 50 }));
// {пиво: {good: {_id: 'пиво', price: 50}, count: 1}}
store.dispatch(actionCartAdd({ _id: "чіпси", price: 75 }));
// {
// пиво: {good: {_id: 'пиво', price: 50}, count: 1},
// чіпси: {good: {_id: 'чіпси', price: 75}, count: 1},
//}
store.dispatch(actionCartAdd({ _id: "пиво", price: 50 }, 5));
// {
// пиво: {good: {_id: 'пиво', price: 50}, count: 6},
// чіпси: {good: {_id: 'чіпси', price: 75}, count: 1},
//}
store.dispatch(actionCartSet({ _id: "чіпси", price: 75 }, 2));
// {
// пиво: {good: {_id: 'пиво', price: 50}, count: 6},
// чіпси: {good: {_id: 'чіпси', price: 75}, count: 2},
//}

store.dispatch(actionCartSub({ _id: "пиво", price: 50 }, 4));
// {
// пиво: {good: {_id: 'пиво', price: 50}, count: 2},
// чіпси: {good: {_id: 'чіпси', price: 75}, count: 2},
//}
store.dispatch(actionCartClear()) // {}