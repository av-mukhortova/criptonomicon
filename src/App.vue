<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div
      v-show="loading"
      class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <svg
        class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
    <div class="container">
      <add-ticker
        :tickers="tickers"
        :disabled="tooManyTickersAdded"
        @add-ticker="add"
      />

      <template v-if="tickers.length">
        <hr class="w-full border-t border-gray-600 my-4" />
        <div>
          <button
            v-if="page > 1"
            class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            @click="page = page - 1"
          >
            Назад
          </button>
          <button
            v-if="hasNextPage"
            class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            @click="page = page + 1"
          >
            Вперед
          </button>
          <div>
            Фильтр:
            <input v-model="filter" />
          </div>
        </div>
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="t in paginatedTickers"
            :key="t.name"
            class="overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
            :class="{
              'border-4': selectedTicker === t,
              'bg-white': !t.error,
              'bg-red-100': t.error,
            }"
            @click="select(t)"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formattedPrice(t.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
              @click.stop="handleDelete(t)"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <!--TODO: вынести график в отдельный компонент-->
      <graph-ticker
        v-if="selectedTicker"
        :selected-ticker="selectedTicker"
        :price="selectedTickerPrice"
        @close="selectedTicker = null"
      />
    </div>
  </div>
</template>

<script>
// watchеры позволяют отделить логику, которая описывается словами "когда что-то меняется, делай то-то"
// очень важно разделять логику при выполнений действий и побочную
// [] 1. Наличие в состоянии зависимых данных | Критичность: 5+  -- перенесли в computed (не изменяет состояние, возвращает какое-то значение, которое используется в шаблоне)
// [] 2. Обработка ошибок API | Критичность: 5
// [x] 3. Запросы напрямую внутри компонента (???) | Критичность: 5
// [x] 4. При удалении остается подписка на загрузку тикера | Критичность: 5
// [x] 5. Количество запросов | Критичность: 4
// [x] 6. При удалении тикера не изменяется localStorage | Критичность: 4
// [x] 7. Одинаковый код в watch | Критичность : 3
// [] 8. localStorage и анонимные вкладки (localStorage м.б. не доступен) | Критичность: 3
// [x] 9. График ужасно выглядит, если будет много цен | Критичность: 2
// [] 10. Магические строки и числа (URL, 5000 милисекунд задержки, ключ localStorage) | Критичность: 1
// написать критерии оценки
// Параллельно
// [x] График сломан, если везде одинаковые значения
// [х] При удалении тикера остается пустая страница
// [x] При удалении тикера остается выбор
import { subscribeToTicker, unsubscribeFromTicker } from "./api";
import AddTicker from "./components/AddTicker.vue";
import GraphTicker from "./components/GraphTicker.vue";
export default {
  components: { AddTicker, GraphTicker },
  name: "App",
  data() {
    return {
      filter: "",
      tickers: [],
      selectedTicker: null,
      selectedTickerPrice: 0,
      page: 1,
      loading: false,
    };
  },
  computed: {
    startIndex() {
      return (this.page - 1) * 6;
    },
    endIndex() {
      return this.page * 6;
    },
    filteredTickers() {
      return this.tickers.filter((ticker) => ticker.name.includes(this.filter));
    },
    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },
    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },
    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },
    tooManyTickersAdded() {
      return this.tickers.length > 4;
    },
  },
  methods: {
    formattedPrice(price) {
      if (price === "-") return price;
      return price > 1
        ? Number(price).toFixed(2)
        : Number(price).toPrecision(2);
    },
    add(ticker) {
      this.filter = "";
      const currentTicker = {
        name: ticker,
        price: "-",
      };
      this.tickers = [...this.tickers, currentTicker];
      subscribeToTicker(currentTicker.name, (price, isValid = true) => {
        if (isValid) {
          this.updateTicker(currentTicker.name, price);
        } else {
          this.highlightTicker(currentTicker.name);
        }
      });
    },
    handleDelete(tickerToRemove) {
      this.tickers = this.tickers.filter((t) => t !== tickerToRemove);
      if (this.selectedTicker === tickerToRemove) this.selectedTicker = null;
      unsubscribeFromTicker(tickerToRemove.name);
    },

    select(ticker) {
      this.selectedTicker = ticker;
    },

    updateTicker(tickerName, price) {
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          t.price = price;
          if (this.selectedTicker && t.name === this.selectedTicker.name) {
            this.selectedTickerPrice = price;
          }
        });
    },
    highlightTicker(tickerName) {
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          t.error = true;
        });
    },
  },
  created() {
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );

    const VALID_KEYS = ["filter", "page"];
    VALID_KEYS.forEach((key) => {
      if (windowData[key]) {
        this[key] = windowData.key;
      }
    });

    const tickersData = localStorage.getItem("cryptonomicon-list");
    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach((ticker) => {
        subscribeToTicker(ticker.name, (price, isValid = true) => {
          if (isValid) {
            this.updateTicker(ticker.name, price);
          } else {
            this.highlightTicker(ticker.name);
          }
        });
      });
    }
  },
  watch: {
    // убрали это из действия handleDelete, т.к. это не логика удаления
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },
    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },
    filter() {
      this.page = 1;
    },
    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },
  },
};
</script>
