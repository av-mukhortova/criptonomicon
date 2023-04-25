<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер {{ ticker }}</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
            @keydown.enter="add"
          />
        </div>
        <div
          v-show="hints && hints.length > 0"
          class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="(hint, ndx) in hints"
            :key="ndx"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
            @click="addHint(hint)"
          >
            {{ hint }}
          </span>
        </div>
        <div v-show="error" class="text-sm text-red-600">
          Такой тикер уже добавлен
        </div>
      </div>
    </div>
    <add-button type="button" class="my-4" :disabled="disabled" @click="add" />
  </section>
</template>
<script>
import AddButton from "./AddButton.vue";
import { loadCoinList } from "../api";

export default {
  components: { AddButton },
  props: {
    tickers: { type: Array, default: () => [] },
    disabled: { type: Boolean, defult: false },
  },
  emits: {
    "add-ticker": {
      type: (value) => typeof value === String && value.length > 0,
    },
  },
  data() {
    return {
      ticker: "",
      coinList: [],
    };
  },
  computed: {
    hints() {
      const value = this.ticker.toLowerCase();
      if (value) {
        const values = Object.keys(this.coinList).filter((item) => {
          if (
            item.toLowerCase().includes(value) ||
            this.coinList[item].symbol.toLowerCase().includes(value)
          )
            return true;
          return false;
        });
        return values.slice(0, 4);
      }
      return [];
    },
    error() {
      if (
        this.tickers.find(
          (item) =>
            String(item.name).toLowerCase() ===
            String(this.ticker).toLowerCase()
        )
      ) {
        return true;
      }
      return false;
    },
  },
  methods: {
    add() {
      if (!this.error && this.ticker.length > 0) {
        this.$emit("add-ticker", this.ticker);
        this.ticker = "";
      }
    },
    addHint(hint) {
      this.ticker = hint;
      this.add();
    },
    async getCoinList() {
      this.coinList = await loadCoinList();
    },
  },
  created() {
    this.getCoinList();
  },
};
</script>
