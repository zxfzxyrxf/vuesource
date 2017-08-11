function MVVM(options) {
    // 保存配置对象到vm中
    this.$options = options;
    // 保存data对象到vm和data变量
    var data = this._data = this.$options.data;
    // 保存vm
    var me = this;

    // 遍历data中所有属性
    Object.keys(data).forEach(function(key) { // 属性名
        // 对指定属性名的属性实现代理
        me._proxy(key);
    });

    observe(data, this);

    // 创建一个compile对象
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxy: function(key) {// key是data中的属性
        //保存vm
        var me = this;
        //给vm添加指定名称(data中的)的属性, 指定get/set
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() { // 读取data中对应的属性值作为vm的当前属性值
                return me._data[key];
            },
            set: function proxySetter(newVal) { // 将vm的当前属性值保存到data中对应的属性中
                me._data[key] = newVal;
            }
        });
    }
};