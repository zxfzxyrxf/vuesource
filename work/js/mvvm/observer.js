function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },

    defineReactive: function(data, key, val) {
        // 创建当前key属性所对应的dep对象
        // dep对象的个数为data中所有层次属性的个数
        var dep = new Dep();
        // 递归监视
        var childObj = observe(val);

        // 对当前key属性进行劫持/监视
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {// 作用: 返回属性值, 建立dep与watcher之间关系
                if (Dep.target) {
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {// 作用: 监视属性的变化, 实现数据绑定
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    //  保存相应的所有watcher的数组
    this.subs = [];  // subscribes
}

Dep.prototype = {
    // 添加watcher
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        // 调用dep所对应的watcher实现添加
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;