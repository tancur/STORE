// ===========================================
// СОЗДАНИЕ СТОРА
// ==============================================

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

// ==========================================

// КОРЗИНА И ВСЕ РЕДЮСЕРЫ И ЭКШЕНЫ ПО КОРЗИНЕ
// =============================================

// типы экшОнов

const actionCartAdd = (good, count = 1) => ({ type: "CART_ADD", count, good });

const actionCartSub = (good, count = 1) => ({ type: "CART_SUB", count, good });

const actionCartDel = (good) => ({ type: "CART_DEL", good });

const actionCartSet = (good, count = 1) => ({ type: "CART_SET", count, good });

const actionCartClear = () => ({ type: "CART_CLEAR" });

// функция редюсер

function cartReducer(state = {}, { type, count, good }) {
  if (type === "CART_ADD") {
    const { _id } = good;
    if (count < 0) {
      return { ...state };
    } else {
      return {
        ...state,
        [_id]: {
          good,
          count: state[_id] ? state[_id].count + count : count,
        },
      };
    }
  }

  if (type === "CART_SUB") {
    const { _id } = good;
    const newCount = state[_id].count - count;
    if (count < 0) {
      return { ...state };
    }
    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good,
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
    const { _id } = good;
    const newCount = count;

    if (newCount > 0) {
      return {
        ...state,
        [_id]: {
          good,
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
    return (state = {});
  } else {
    return state;
  }
}

// localStoredReducer
//  Декоратор возвращает функцию-обертку (тоже редьюсер)

function localStoredReducer(originalReducer, localStorageKey) {
  let firstRun = true;

  return function wrapper(state, action) {
    if (firstRun) {
      firstRun = false;
      const keyData = localStorage.getItem(localStorageKey);

      if (keyData !== "{}" && keyData !== null) {
        return JSON.parse(keyData);
      }
    }

    const newState = originalReducer(state, action);
    localStorage.setItem(localStorageKey, JSON.stringify(newState));
    return newState;
  };
}

// =================================================

// ВСЕ ПРОМИСЫ И ЗАПРОСЫ НА СЕРВЕР

// ====================================================

// РЕДЮСЕР ДЛЯ ПРОМИСОВ

function promiseReducer(
  state = {},
  { type, promiseName, status, payload, error }
) {
  if (type === "PROMISE") {
    return {
      ...state,
      [promiseName]: { status, payload, error },
    };
  }
  return state;
}

const actionPending = (promiseName) => ({
  type: "PROMISE",
  promiseName,
  status: "PENDING",
});
const actionFulfilled = (promiseName, payload) => ({
  type: "PROMISE",
  promiseName,
  status: "FULFILLED",
  payload,
});
const actionRejected = (promiseName, error) => ({
  type: "PROMISE",
  promiseName,
  status: "REJECTED",
  error,
});

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

// функция для запросов

function getGQL(url = "http://shop-roles.node.ed.asmer.org.ua/graphql") {
  return async function gql(query, variables = {}) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (localStorage.authToken) {
      headers.Authorization = "Bearer " + localStorage.authToken;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query: query, variables: variables }),
    });
    const data = await response.json();

    if (data.errors) {
      throw new Error("Ошибка сервера:" + JSON.stringify(data.errors));
    }
    return Object.values(data)[0];
  };
}

// переменная для замыкания
const url = "http://shop-roles.node.ed.asmer.org.ua/graphql";

// замыкаем функцию на url-е

const gql = getGQL(url);

// вывод корневого каталога

const gqlRootCats = () => {
  const catQuery = `query cats($q: String) {
      CategoryFind(query: $q) {
        _id
        name
       
      }
    }`;

  return gql(catQuery, { q: '[{"parent": null}]' });
};

// Запит для отримання однієї категорії з товарами та картинками

const gqlOneCatWithGoodsImgs = (id) => {
  const catsWithImgsQuery = `query oneCatWithGoodsImgs($q: String){
    CategoryFindOne(query: $q){ _id name image{url}
    goods{_id name price images{url}}
  }}`;

  return gql(catsWithImgsQuery, {
    //  q: '[{"_id":"62c94b10b74e1f5f2ec1a0dd"}]' исходник

    q: JSON.stringify([{ _id: id }]),
  });
};

// Запит на отримання товару з описом та картинками

const gqlCatsWithImgsDescription = (id) => {
  const catsWithImgsDescriptionQuery = `query catsWithImgsDescription($q: String) {
      GoodFindOne(query: $q) {
        _id
        images {
          url
        }
        name
        price
        description
      }
    }`;

  return gql(catsWithImgsDescriptionQuery, {
    q: JSON.stringify([{ _id: id }]),

    // q: '[{"_id":${id}}]', не работает

    // q: '[{"_id":"62d57ab8b74e1f5f2ec1a148"}]', исходник
  });
};

// Запит на реєстрацію

const gqlRegister = (login, password) => {
  const registerMutation = `mutation register($login: String, $password: String) {
      UserUpsert(user: { login: $login, password: $password }) {
        login
        createdAt
        _id
      }
    }`;
  return gql(registerMutation, { login: login, password: password });
  // return gql(registerMutation, { login: "vasya1999", password: "пороль" });
};

// Запит на логін

const gqlLogin = (login, password) => {
  const loginQuery = `query login($login: String, $password: String) {
      login(login: $login, password: $password)
    }`;

  return gql(loginQuery, { login: login, password: password });
};
// Запрос истории заказов  OrderFind, выводит заказы, но не выводт полную инфу ( наименования, кратинки и пр ),  total = 0  !!!

const gqlOrderFind = () => {
  const OrderFind = `query OrderFind ($q: String) {OrderFind (query: $q) {
    _id 
    createdAt 
   
    orderGoods {count good{name price }}
    
}
}`;

  return gql(OrderFind, { q: "[{}]" });
};

// Запрос на корзину OrderUpsert

const gqlOrderUpsert = (goods) => {
  const OrderUpsert = `mutation newOrder($goods: [OrderGoodInput]) {
          OrderUpsert(order: {orderGoods: $goods}) {
              _id
              createdAt
              total
          }
        }`;

  return gql(OrderUpsert, {
    goods: goods,
    // good: { _id: "62d3099ab74e1f5f2ec1a125" },
  });
};

// THUNK  корзины OrderUpsert сложный вариант Кирилла

const actionOrderCreate = () => {
  return async (dispatch, state) => {
    const goodToOrder =
      state().basket &&
      Object.values(state().basket) &&
      Object.values(state().basket).map((item) => ({
        count: item.count,
        good: { _id: item.good._id },
      }));
    console.log(`ВЫВОД goodToOrder`);
    console.log(goodToOrder);

    const data = await dispatch(
      actionPromise("getOrderUpsert", gqlOrderUpsert(goodToOrder))
    );
    if (data) {
      await dispatch(actionCartClear());
    }
  };
};


// ======================================================

// РЕДЮСЕР ДЛЯ АВТОРИЗАЦИИ (ТОКЕН)

// =========================================================

function jwtDecode(token) {
  const [, payload] = token.split(".");
  // console.log(payload);
  const secretPart = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  // console.log("SECRET PART");
  return JSON.parse(secretPart);
}
// экшены для авторизации

const actionAuthLogin = (token) => ({ type: "AUTH_LOGIN", token });
const actionAuthLogout = () => ({ type: "AUTH_LOGOUT" });

// редюсер для токена

function authReducer(state = {}, { type, token }) {
  if (type === "AUTH_LOGIN") {
    const payload = jwtDecode(token);
    // console.log(payload);

    localStorage.authToken = token;
    // console.log(token);
    if (localStorage.authToken) {
      userName.innerHTML = `Добро пожаловать,${payload.sub.login}`;
    }

    return { token, payload };
  }
  if (type === "AUTH_LOGOUT") {
    delete localStorage.authToken;
    userName.innerHTML = "";
    return {};
  }

  return state;
}

// THUNK  логин и пароль

function actionFullRegister(login, password) {
  return async (dispatch) => {
    try {
      const data = await dispatch(
        actionPromise("getRegister", gqlRegister(login, password))
      );
      // console.log(data  )
      if (data.UserUpsert.login) {
        await dispatch(actionFullLogin(login, password));
        // console.log(login, password )
      }
    } catch (error) {
      console.log(error);
    }
  };
}

function actionFullLogin(login, password) {
  return async (dispatch) => {
    const data = await dispatch(
      actionPromise("getFullLogin", gqlLogin(login, password))
    );
    // console.log(data);

    if (data) {
      await dispatch(actionAuthLogin(data.login));
    }
  };
}

// БЛОК РЕГИСТРАЦИИ И ЛОГИНА

// вход в меню пользователя

const user = document.getElementById("userIco");

user.onclick = () => {
  const userInfo = document.querySelector(".login");
  userInfo.style.display = "inline-block";
  const close = document.getElementById("close");
  close.onclick = () => {
    userInfo.style.display = "none";
  };
};
// при нажатии на кнопку регистрации запускаем функцию регистрации

const getRegistr = document.getElementById("getRegistr");
getRegistr.addEventListener("click", (event) => {
  event.preventDefault();
  register();
});

// при нажатии на кнопку входа запускаем функцию входа по логину

const getSign = document.getElementById("getSign");
getSign.addEventListener("click", (event) => {
  event.preventDefault();
  login();
});

// ПРОЦЕДУРА РЕГИСТРАЦИИ

// function register() {
//   const registr = document.getElementById("registr");
//   registr.style.display = "flex";

//   const loginInput = document.getElementById("loginInput");

//   const passwordInput = document.getElementById("passwordInput");

//   const button = document.getElementById("buttonReg");

//   button.addEventListener("click", (event) => {
//     event.preventDefault();
//     const login = loginInput.value;
//     const password = passwordInput.value;
//     // console.log(login, password);
//     store.dispatch(actionFullRegister(login, password));
//     loginInput.value = "";
//     passwordInput.value = "";
//   });

//   const buttonRegClose = document.getElementById("buttonRegClose");
//   buttonRegClose.onclick = () => {
//     registr.style.display = "none";
//   };
// }

function register() {
  const loginInput = document.getElementById("fullLogin");

  const passwordInput = document.getElementById("fullpassword");

  const button = document.getElementById("getRegistr");

  button.addEventListener("click", (event) => {
    event.preventDefault();
    const login = loginInput.value;
    const password = passwordInput.value;
    // console.log(login, password);
    store.dispatch(actionFullRegister(login, password));
    loginInput.value = "";
    passwordInput.value = "";
  });
}

// ЛОГИН

function login() {
  const fullLogin = document.getElementById("fullLogin");

  const fullpassword = document.getElementById("fullpassword");

  const button = document.getElementById("getSign");

  button.addEventListener("click", (event) => {
    event.preventDefault();
    const login = fullLogin.value;
    const password = fullpassword.value;
    // console.log(login, password);
    store.dispatch(actionFullLogin(login, password));
    fullLogin.value = "";
    fullpassword.value = "";
  });

  // выход из аккаунта
  let outRegistr = document.getElementById("outRegistr");
  outRegistr.onclick = () => {
    // outRegistr.style.fontSize = "50px";

    store.dispatch(actionAuthLogout());
    fullLogin.value = "";
    fullpassword.value = "";

    console.log("fLogout clicked");
  };
}

// Проверка наличия токена при загрузке страницы
window.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.authToken;
  if (token) {
    const payload = jwtDecode(token);
    userName.innerHTML = `Добро пожаловать, ${payload.sub.login}`;
  }
});

// ===============================================================

// Комбайн редюсеров
// ==================================================================

// Определние обьекта с Редьюсерами

const reducers = {
  basket: localStoredReducer(cartReducer, "basket"),
  query: promiseReducer,
  auth: localStoredReducer(authReducer, "auth"),
};

// Комбайн редюсеров

function combineReducers(reducers) {
  function totalReducer(totalState = {}, action) {
    const newTotalState = {}; //об'єкт, який зберігатиме лише нові стани дочірніх редьюсерів

    //цикл + квадратні дужки дозволяють написати код, який працюватиме з будь-якою кількістю дочірніх ред'юсерів
    for (const [reducerName, childReducer] of Object.entries(reducers)) {
      const newState = childReducer(totalState[reducerName], action); //запуск дочірнього ред'юсера
      if (newState !== totalState[reducerName]) {
        //якщо він відреагував на action
        newTotalState[reducerName] = newState; //додаємо його в NewTotalState
      }
    }

    //Універсальна перевірка на те, що хоча б один дочірній редьюсер створив новий стейт:
    if (Object.values(newTotalState).length) {
      return { ...totalState, ...newTotalState }; //створюємо новий загальний стейт, накладаючи новий стейти дочірніх редьюсерів на старі
    }

    return totalState; //якщо екшен був зрозумілий жодним із дочірніх редьюсерів, повертаємо загальний стейт як був.
  }

  return totalReducer;
}

// ВЫВОД КОРНЕВОГО КАТАЛОГА В БОКОВОЙ ПАЕНЛИ

function asideRootCatalog(resultOfGetState) {
  // выборка из пайлоада

  let rootCategories =
    resultOfGetState.query?.getCategories?.payload?.CategoryFind;

  if (!rootCategories) {
    return;
  }
  // заготовка для списка
  let aside = document.getElementById("asideRootCategory");

  aside.innerHTML = "";

  for (let category of rootCategories) {
    let a = document.createElement("a");

    a.className = "aForAside";
    a.href = `#/category/${category._id}`;
    a.innerHTML = category.name;
    aside.append(a);
  }
}

// ВЫВОД КАТАЛОГА ПОДКАТЕГОРИЙ

function cartOfCategory(state) {
  // выборка из пайлоада

  let podCategory =
    state?.query?.getOneCatWithGoodsImgs?.payload?.CategoryFindOne;

  const [, key] = window.location.hash.split("/");
  console.log(`ВКАТАЛОГА ПОДКАТЕГОРИЙ ${key}`);

  if (!podCategory || !(key === "category")) {
    return;
  }

  // console.log(podCategory);

  // console.log(state);

  // кнопка скрыть подкаталог товаров одной категории

  //   let item = document.getElementById("itemCat");

  //   let hiddenBtn = document.getElementById("our-works");

  //   hiddenBtn.innerText = "Закрыть страницу";

  //   hiddenBtn.onclick = () => {
  //     //   console.log("hiddenBtn нажата")

  //     item.style.visibility = "hidden";
  //   };

  // // восстанавливаем содержимое подкатегории
  //   item.style.visibility = "visible";

  // название подктегории
  let nameOfCategory = document.getElementById("podCat");

  nameOfCategory.innerHTML = podCategory.name;

  let currentCategory = document.getElementById("containerOfCategory");
  currentCategory.innerHTML = "";
  for (let elem of podCategory.goods) {
    let cardsItem = document.createElement("div");
    cardsItem.className = "cards-item";

    let cardsInside = document.createElement("div");
    cardsInside.className = "inside";

    let img = document.createElement("img");
    img.className = "img-card";
    // console.log(elem.images);
    img.src = `http://shop-roles.node.ed.asmer.org.ua/${elem.images[0].url}`;

    let h = document.createElement("h2");
    h.className = "h-card";
    h.innerHTML = elem.name;

    let p = document.createElement("p");
    p.className = "p-card";
    p.innerHTML = `${elem.price} грн.`;

    let button = document.createElement("a");
    button.className = "button";
    // a.innerHTML = `${elem.price} грн.`;
    button.href = `#/nogood/${elem._id}`;
    button.innerText = "Подробнее";

    cardsInside.append(img);
    cardsInside.append(h);
    cardsInside.append(p);

    cardsItem.append(cardsInside);
    currentCategory.append(cardsItem);
    cardsItem.appendChild(button);
  }
}

// ВЫВОД ИНФОРМАЦИИ ПРО ОТДЕЛЬНЫЙ ТОВАР

function cartOfOneGood(state) {
  // выборка из пайлоада
  let OneGood = state?.query?.getCatsWithImgsDescription?.payload?.GoodFindOne;

  // ВНИМАНИЕ!!!!!!!!
  // не надо рисовать товар, если это не страница товара

  const [, key] = window.location.hash.split("/");
  // console.log(`ВЫВОД ИНФОРМАЦИИ ПРО ОТДЕЛЬНЫЙ ТОВАР ${key}`);

  if (!OneGood || !(key === "nogood")) {
    return;
  }
  // скрываем каталог товаров одной категории

  let item = document.getElementById("containerOfCategory");
  item.style.visibility = "hidden";

  // отображение карточки отдельного товара и очистка перед заполнением

  let popup = document.getElementById("popup");

  popup.style.display = "flex";
  popup.innerHTML = "";

  let popupDiv = document.createElement("div");
  popupDiv.className = "inside";
  popup.append(popupDiv);

  for (let image of OneGood.images) {
    // console.log(image);
    let img = document.createElement("img");
    img.className = "img-card";
    img.src = `http://shop-roles.node.ed.asmer.org.ua/${image.url}`;
    popupDiv.append(img);
  }

  let h = document.createElement("h2");
  h.className = "h-card";
  h.innerHTML = OneGood.name;
  popupDiv.append(h);

  let p = document.createElement("p");
  p.className = "p-card";
  p.innerHTML = OneGood.description;
  popupDiv.append(p);

  let price = document.createElement("p");
  price.className = "p-card";
  price.innerHTML = ` ЦЕНА : ${OneGood.price} грн.`;
  popupDiv.append(price);

  let a = document.createElement("a");
  a.className = "button";
  a.id = "but";
  a.href = `#/good/${OneGood._id}`;
  a.innerText = "Купить";
  popupDiv.append(a);

  let button = document.createElement("button");
  button.className = "button";
  button.id = "but";

  button.innerText = "ЗАКРЫТЬ";
  popupDiv.append(button);

  // при онклике скрываем карточку и очищаем, открывая каталог товаров одной категории

  button.onclick = () => {
    item.style.visibility = "visible";

    popup.style.display = "none";

    popup.innerHTML = "";
  };
  // ДИСПАТЧ ПО КЛИКУ "ПОЛОЖИТЬ В КОРЗИНУ"

  a.onclick = () => {
    store.dispatch(actionCartAdd(OneGood));
  };

  // console.log(OneGood);
  // console.log(state);
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ОПЕРАЦИИ  С КОРЗИНОЙ.

function getBasket(state) {
  let goodsToBuy = state.basket;

  const [, key] = window.location.hash.split("/");
  console.log(`$ОПЕРАЦИИ  С КОРЗИНОЙ  ${key}`);
  const basket = document.getElementById("basket");

  if (!goodsToBuy || Object.keys(goodsToBuy).length === 0) {
    // если корзина нулевая очищаем ее
    basket.innerHTML = "";
    return;
  }
  // назначаем корзину
  // const basket = document.getElementById("basket");

  basket.innerHTML = "";

  //  переменная для подсчета итоговой суммы корзины

  let totalSum = 0;
  // прописываем каждый отдельный товар в корзине
  for (let goods in goodsToBuy) {
    // console.log(goodsToBuy[goods].good.images[0].url);
    // console.log(`http://shop-roles.node.ed.asmer.org.ua/${goodsToBuy[goods].good.images[0].url}`);
    let oneItemtoBuy = document.createElement("div");
    oneItemtoBuy.className = "oneItemtoBuy";
    basket.append(oneItemtoBuy);

    let imgGoodsToBuy = document.createElement("img");
    imgGoodsToBuy.className = "imgGoodsToBuy";
    imgGoodsToBuy.src = `http://shop-roles.node.ed.asmer.org.ua/${goodsToBuy[goods].good.images[0].url}`;

    oneItemtoBuy.append(imgGoodsToBuy);

    let nameGoodsToBuy = document.createElement("h4");
    nameGoodsToBuy.id = "nameGoodsToBuy";
    nameGoodsToBuy.innerHTML = goodsToBuy[goods].good.name;
    oneItemtoBuy.append(nameGoodsToBuy);

    let acount = document.createElement("div");
    acount.className = "acount";
    oneItemtoBuy.append(acount);

    // кнопка уменьшения кол-ва товара

    let decreaseBtn = document.createElement("img");
    decreaseBtn.id = "decreaseBtn";
    decreaseBtn.className = "decrease-btn";
    decreaseBtn.src = "./css/minus.ico";
    acount.append(decreaseBtn);

    // если в корзине остается одно наименование товара, то количество обнуляется но это не отображается
    // пока не выйдешь  и не зайдешь обратно

    decreaseBtn.onclick = () => {
      store.dispatch(actionCartSub(goodsToBuy[goods].good));
    };

    // индикатор количества товара

    let quantity = document.createElement("input");
    quantity.id = "quantity";
    quantity.value = goodsToBuy[goods].count;
    acount.append(quantity);

    quantity.oninput = () => {
      let count = parseInt(quantity.value, 10);
      store.dispatch(actionCartSet(goodsToBuy[goods].good, count));
    };

    // кнопка увеличения кол-ва товара

    let increaseBtn = document.createElement("img");
    increaseBtn.className = "increase-btn";
    increaseBtn.id = "increaseBtn";
    increaseBtn.src = "./css/add.ico";
    acount.append(increaseBtn);

    increaseBtn.onclick = () => {
      //  диспатчим  actionAddtSub на увеличение товара

      store.dispatch(actionCartAdd(goodsToBuy[goods].good));
    };

    let sum = document.createElement("div");
    sum.id = "sum";
    sum.innerHTML = `${
      goodsToBuy[goods].good.price * goodsToBuy[goods].count
    }грн.`;
    acount.append(sum);

    totalSum += goodsToBuy[goods].good.price * goodsToBuy[goods].count;

    console.log(totalSum);

    // кнопка удаления товара

    let deleteBtn = document.createElement("img");
    deleteBtn.className = "increase-btn";
    deleteBtn.id = "deleteBtn";
    deleteBtn.src = "./css/delete1.ico";
    acount.append(deleteBtn);
    deleteBtn.onclick = () => {
      store.dispatch(actionCartDel(goodsToBuy[goods].good));
      //  диспатчим  actionCartDel на УДАЛЕНИЕ товара
      // или это дожно быть в отдельной функции?
    };
  }

  // прописываем кнопки общие для целой корзины

  // кнопка закрытия корзины

  let closeBasket = document.createElement("img");
  closeBasket.className = "close-basket";
  closeBasket.id = "clickToCloseBasket";
  closeBasket.src = "./css/close.ico";
  basket.prepend(closeBasket);

  // раздел с суммой

  let div = document.createElement("div");
  basket.append(div);

  let pOne = document.createElement("div");
  pOne.innerHTML = "К оплате";
  div.append(pOne);

  let totalPrice = document.createElement("span");
  totalPrice.innerHTML = `   ${totalSum}    грн.`;
  pOne.append(totalPrice);

  // раздел  оформление заказа

  let divTwo = document.createElement("div");
  basket.append(divTwo);

  let button = document.createElement("button");
  button.className = "buttonPay";

  button.innerText = "ОПЛАТИТЬ";
  divTwo.append(button);

  button.onclick = () => {
    const [, key1] = window.location.hash.split("/");

    // console.log(`проверка KEY при онклике на "ОТПРАВИТЬ ЗАКАЗ"  ${key1}`);

    // console.log(`вывод state.basket`);
    // console.log(state.basket);

    // console.log(`ВЫБОРКА Object.values(state.basket)`);
    // console.log(Object.values(state.basket));

    store.dispatch(actionOrderCreate());
    //  по клику диспатч отправки заказа
  };

  // / раздел очистки корзины

  let divThree = document.createElement("div");
  basket.append(divThree);

  let buttonClear = document.createElement("button");
  buttonClear.className = "buttonPay";

  buttonClear.innerText = "ОЧИСТИТЬ";
  divThree.append(buttonClear);

  buttonClear.onclick = () => {
    store.dispatch(actionCartClear());
  };

  // Отображениея

  let open = document.getElementById("userBasket");

  open.onclick = () => {
    basket.style.display = "flex";
  };
  let close = document.getElementById("clickToCloseBasket");
  close.onclick = () => {
    basket.style.display = "none";
  };
}

// ИСТОРИЯ ЗАКАЗОВ

// let historyLink = document.getElementById("historyLink");

//   historyLink.href = "#/history/";

function orderHistory(state) {
  // кликабельная ссылка для перехода к списку заказов

  const historyLink = document.getElementById("historyLink");
  historyLink.href = "#/history/";

  const orderFind = state?.query?.orderFind?.payload?.OrderFind;

  // const goodsToOrderFind = Object.values(orderFind);

  console.log( state);
  console.log( orderFind);
  
 
 for (let order in orderFind) {
  
  // console.log (orderFind[order].createdAt);

  // console.log (orderFind[order]._id);
  console.log (orderFind[order]);

  // console.log (orderFind[order].orderGoods);

  for (let goods of order){

    console.log (goods.orderGoods);
  }

}
 

  // проверки
  const [, key] = window.location.hash.split("/");
  // console.log(`ВЫВОД  let orderFind ${key}`);
  // console.log( orderFind);

  // console.log(typeof orderFind);

  // const goodsToOrderFind =
  // orderFind?.Object.values(orderFind)?.
  //     Object.values(orderFind).map((item) => ({
  //       count: item.count,
  //       good: { _id: item.good._id },
  //     }));
  //   console.log(`ВЫВОД goodToOrder`);
  //   console.log(goodToOrder);


  if (!(key === "history")) {
    return;
  }
}
  

// скрываем каталог товаров одной категории

// let item = document.getElementById("itemCat");

// item.style.visibility = "hidden";

// оболочка для списка

// let history = document.getElementById("history");
//     history.style.display = "flex";
//   history.innerHTML = "";

// // строю карточку вывода каждого  заказов

// itemCat.style.display = "none";

// asideRootCategory.style.display = "none";

// let historyDiv = document.createElement("div");
// historyDiv.className = "history-inside";
// history.append(historyDiv);

// let createdAtElement = document.createElement("p");
// let createdAt = new Date(parseInt(order.createdAt)).toLocaleString();
// createdAtElement.innerHTML = `Дата создания: ${createdAt}`;
// console.log(createdAt)
// historyDiv.append(createdAtElement);

// // кнопка закрытия

// let button = document.createElement("button");
//   button.className = "button_small";
//   // button.id = "but";

//   button.innerText = "ЗАКРЫТЬ";
//   history.append(button);

//   // при онклике скрываем карточку и очищаем, открывая доступ для просмотра каталог товаров одной категории

//   button.onclick = () => {
//     item.style.visibility = "visible";

//     history.style.display = "none";

// history.innerHTML = "";
// };

// console.log("orderHistory");

// ХЭШ

window.onhashchange = async function () {
  const [, key, hash] = window.location.hash.split("/");
  // console.log(key)
  // const hash = window.location.hash.split("/").pop();
  if (key === "category") {
    // console.log(hash)
    // console.log(key);
    store.dispatch(
      actionPromise(
        "getOneCatWithGoodsImgs",
        await gqlOneCatWithGoodsImgs(hash)
      )
    );
  }
  if (key === "nogood") {
    // console.log(hash)
    // console.log(key);
    store.dispatch(
      actionPromise(
        "getCatsWithImgsDescription",
        await gqlCatsWithImgsDescription(hash)
      )
    );
  }
  if (key === "history") {
    console.log(key);
    console.log(hash);

    store.dispatch(actionPromise("orderFind", await gqlOrderFind()));
  }
};

// =========================================================

// ТЕСТИРОВАНИЕ

// ===========================================================

const store = createStore(combineReducers(reducers));

// Корневой каталог первый запуск

store.dispatch(actionPromise("getCategories", gqlRootCats()));

store.subscribe(() => {
  // console.log(store.getState());
  asideRootCatalog(store.getState());
});
store.subscribe(() => {
  cartOfCategory(store.getState());
});

store.subscribe(() => {
  cartOfOneGood(store.getState());
});

store.subscribe(() => {
  getBasket(store.getState());
});

store.subscribe(() => {
  orderHistory(store.getState());
});

// store.subscribe(() => console.log(store.getState()));

// getBasket(store.getState())

// store.subscribe(() => {
//   login(store.getState());
// });

// store.dispatch(actionFullRegister("your12Login", "yourPassword"));

// store.subscribe(() => console.log(store.getState()))

// ==============================================================

// store.dispatch(actionCartAdd({ _id: "пиво", price: 50 }));

// const store = createStore(localStoredReducer(cartReducer, "cart"));

// store.dispatch(actionCartAdd({ _id: "пиво", price: 50 }));
// store.dispatch(actionCartAdd({ _id: "чипсы", price: 75 }));

// то что ниже работает

// store.dispatch(
//   actionPromise(
//     "Подкаталог с картиНками: getOneCatWithGoodsImgs",
//     gqlOneCatWithGoodsImgs("62c94b10b74e1f5f2ec1a0dd")
//   )
// );

// store.dispatch(
//   actionPromise(
//     "Подкаталог с картиНками и описанием: getCatsWithImgsDescription",
//     gqlCatsWithImgsDescription("62d57ab8b74e1f5f2ec1a148")
//   )
// );

// store.dispatch(
//   actionPromise("РеГистрация: getRegister", gqlRegister("vasya15221999", "пороль"))
// );
// actionFullRegister("vasya15221999", "пороль")

// store.dispatch(
//   actionPromise("Запит на логин: getLogin", gqlLogin("katya145", "пороль"))
// );

// store.dispatch(
//   actionPromise(
//     "Запрос истории заказов: getOrderUpsert",
//     gqlOrderUpsert(3, "62d3099ab74e1f5f2ec1a125")
//   )
// );

// // токен отобразился

// // / сам токен для проверки
// const token =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOnsiaWQiOiI2Mzc3ZTEzM2I3NGUxZjVmMmVjMWMxMjUiLCJsb2dpbiI6InRlc3Q1IiwiYWNsIjpbIjYzNzdlMTMzYjc0ZTFmNWYyZWMxYzEyNSIsInVzZXIiXX0sImlhdCI6MTY2ODgxMjQ1OH0.t1eQlRwkcP7v9JxUPMo3dcGKprH-uy8ujukNI7xE3A0";

// store.dispatch(actionAuthLogin(token))

// store.dispatch(actionAuthLogout()) // {}
