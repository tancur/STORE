// СОЗДАНИЕ СТОРА

function createStore(reducer){
  let state       = reducer(undefined, {}) //стартовая инициализация состояния, запуск редьюсера со state === undefined
  let cbs         = []                     //массив подписчиков
  
  const getState  = () => state            //функция, возвращающая переменную из замыкания
  const subscribe = cb => (cbs.push(cb),   //запоминаем подписчиков в массиве
                           () => cbs = cbs.filter(c => c !== cb)) //возвращаем функцию unsubscribe, которая удаляет подписчика из списка
                           
  const dispatch  = action => { 
      if (typeof action === 'function'){ //если action - не объект, а функция
          return action(dispatch, getState) //запускаем эту функцию и даем ей dispatch и getState для работы
      }
      const newState = reducer(state, action) //пробуем запустить редьюсер
      if (newState !== state){ //проверяем, смог ли редьюсер обработать action
          state = newState //если смог, то обновляем state 
          for (let cb of cbs)  cb() //и запускаем подписчиков
      }
  }
  
  return {
      getState, //добавление функции getState в результирующий объект
      dispatch,
      subscribe //добавление subscribe в объект
  }
}

// РЕДЮСЕР ДЛЯ ПРОМИСОВ 

function promiseReducer(state = {}, { type, promiseName, status, payload, error }) {
  if (type === 'PROMISE') {
    return {
      ...state,
      [promiseName]: { status, payload, error }
    };
  }
  return state;
}

const actionPending = (promiseName) => ({ type: 'PROMISE', promiseName, status: 'PENDING' });
const actionFulfilled = (promiseName, payload) => ({ type: 'PROMISE', promiseName, status: 'FULFILLED', payload });
const actionRejected = (promiseName, error) => ({ type: 'PROMISE', promiseName, status: 'REJECTED', error });



// THUNK для промисов

function actionPromise(promiseName, promise) {
  return async (dispatch) => {
    dispatch(actionPending(promiseName));
    try {
      const payload = await promise;
      dispatch(actionFulfilled(promiseName, payload));
      return payload;
    } catch (error) {
      dispatch(actionRejected(promiseName, error));
    }
  };
}


// Функция delay

const delay = ms => new Promise(ok => setTimeout(() => ok(ms), ms))



// Перевірте отриманий редьюсер:

const store = createStore(promiseReducer)


// про 6 раз я не поняла? пендинг+фулфилд на каждый из трех нижеприведенных примеров? да?

store.subscribe(() => console.log(store.getState())) //має запускатися 6 разів

store.dispatch(actionPromise('delay', delay(1000)))
store.dispatch(actionPromise('luke', fetch("https://swapi.dev/api/people/1").then(res => res.json())))
store.dispatch(actionPromise('tatooine', fetch("https://swapi.dev/api/planets/1").then(res => res.json())))

//за підсумком повинен вийти якийсь такий state:
/*
{
     delay: {status: 'FULFILLED', payload: 1000, error: undefined},
     luke: {status: 'FULFILLED', payload: { ..... тралівали про люка}, error: undefined},
     tatooine: {status: 'FULFILLED', payload: { ..... тралювали про планету татуїн}, error: undefined},
}
*/











