function Watcher(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    this.exp = exp;
    // 包含n个dep对象的对象, 属性名是dep的id
    this.depIds = {};
    this.value = this.get();
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        var value = this.get();
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    },
    addDep: function(dep) {
        if (!this.depIds.hasOwnProperty(dep.id)) {
            // 将当前watcher添加到dep中
            dep.addSub(this);
            this.depIds[dep.id] = dep;
        }
    },
    get: function() {
        Dep.target = this;
        var value = this.getVMVal();
        Dep.target = null;
        return value;
    },

    getVMVal: function() {
        var exp = this.exp.split('.');
        var val = this.vm._data;
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    }
};