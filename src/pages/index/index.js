Page({
  data: {
    count: 0,
    message: "",
  },
  onIncrement() {
    this.setData({ count: this.data.count + 1 });
  },
  onReset() {
    this.setData({ count: 0 });
  },
  onInput(e) {
    this.setData({ message: e.detail.value });
  },
});
