// authReducer

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

//  функция декодирования токена

function jwtDecode(token) {
  const [, payload] = token.split(".");

  const secretPart = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(secretPart);
}
// экшены для авторизации

const actionAuthLogin = (token) => ({ type: "AUTH_LOGIN", token });
const actionAuthLogout = () => ({ type: "AUTH_LOGOUT" });

// сам токен
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOnsiaWQiOiI2Mzc3ZTEzM2I3NGUxZjVmMmVjMWMxMjUiLCJsb2dpbiI6InRlc3Q1IiwiYWNsIjpbIjYzNzdlMTMzYjc0ZTFmNWYyZWMxYzEyNSIsInVzZXIiXX0sImlhdCI6MTY2ODgxMjQ1OH0.t1eQlRwkcP7v9JxUPMo3dcGKprH-uy8ujukNI7xE3A0";

// редюсер для токена

function authReducer(state = {}, {type, token}) {
  if (type === "AUTH_LOGIN") {
    const payload = jwtDecode(token);
    return {token, payload};
  } else if (type === "AUTH_LOGOUT") {
    return {};
  } else {
    return state;
  }
}


// проверка писанины


const store = createStore(authReducer)

store.subscribe(() => console.log(store.getState()))  

store.dispatch(actionAuthLogin(token))


// У меня выводится не в таком виде, где у меня неправильно в коде? 



/*{
    token: "eyJhbGc.....", 
    payload: {
      "sub": {
        "id": "6377e133b74e1f5f2ec1c125",
        "login": "test5",
        "acl": [
          "6377e133b74e1f5f2ec1c125",
          "user"
        ]
      },
      "iat": 1668812458
    }
}*/

store.dispatch(actionAuthLogout()) // {}