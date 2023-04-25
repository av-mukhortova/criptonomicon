const API_KEY =
  "1622bb808e582d734ffb6f1b1110778336ec3eae606a024e87de3c665df20720";

const tickersHandlers = new Map();
// tickers['DOGE'] = функции, которые надо выполнить, если изменился тикер DOGE

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = "5";
const ERROR_INDEX = "500";

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
    MESSAGE: message,
    PARAMETER: param,
  } = JSON.parse(e.data);

  if (type === ERROR_INDEX && message === "INVALID_SUB") {
    const tickerName = param.split("~")[2];
    updateTicker(tickerName, 0, false);
    return;
  }

  if (type !== AGGREGATE_INDEX || !newPrice) {
    return;
  }
  updateTicker(currency, newPrice, true);
});

export const loadCoinList = () =>
  fetch(
    `https://min-api.cryptocompare.com/data/blockchain/list?api_key=${API_KEY}`
  )
    .then((r) => r.json())
    .then((r) => r.Data);

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker, type) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${type}`],
  });
}

function unsubscribeFromTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`],
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker, "USD");
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};

function updateTicker(currency, newPrice, isValid) {
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach((fn) => fn(newPrice, isValid));
}

// БИЗНЕС-ЗАДАЧА
// получить стоимость криптовалютных пар с АПИшки?
// получать ОБНОВЛЕНИЯ стоимости криптовалютных пар с АПИшки
