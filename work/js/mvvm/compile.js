function Compile(el, vm) {
    // 保存vm
    this.$vm = vm;
    // 保存el元素
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        //1. 取出el中所有的子节点移除到fragment中, 并保存fragment
        this.$fragment = this.node2Fragment(this.$el);
        //2. 编译fragment(解析其中表达/指令)
        this.init(); // 编译过程不更新界面
        //3. 将解析好的fragment添加到el元素中(正常显示)
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;
        // 将原生节点移除到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    /*
    编译指定元素的所有层次的子节点
     */
    compileElement: function(el) {
        // 得到所有子节点
        var childNodes = el.childNodes,
          // 保存compile对象
            me = this;
        // 遍历子节点, 一个一个的编译
        [].slice.call(childNodes).forEach(function(node) {
            // 得到节点的文本内容
            var text = node.textContent;
            // 匹配表达式的正则对象
            var reg = /\{\{(.*)\}\}/;   // {{msg}}

            // 判断是否是元素节点
            if (me.isElementNode(node)) {
                // 编译节点(解析指令)
                me.compile(node);
            // 判断是否是表达式文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译文本节本(解析表达式)
                me.compileText(node, RegExp.$1); // RegExp.$1就是msg
            }

            // 如果有子节点, 对子节点进行递归编译
            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        // 得到所有属性节点
        var nodeAttrs = node.attributes,
            me = this;

        // 遍历所有属性节点
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名: v-on:click/v-text
            var attrName = attr.name;
            // 是否指令属性
            if (me.isDirective(attrName)) {
                // 得到指令的表达式文本   show/msg
                var exp = attr.value;
                // 得到指令名  on:click/text
                var dir = attrName.substring(2);
                // 是否是事件指令
                if (me.isEventDirective(dir)) {
                    // 解析事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                // 普通指令
                } else {
                    // 解析一般指令: 确定解析指令的方法并调用
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    /*
    解析{{}}/v-text的方法
     */
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    /*
     解析v-html的方法
     */
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    /*
     解析v-model的方法
     */
    model: function(node, vm, exp) {
        // 显示数据
        this.bind(node, vm, exp, 'model');

        var me = this,
          // 得到表达式对应的值
            val = this._getVMVal(vm, exp);
        // 给节点绑定input监听, 当输入改变时自动调用
        node.addEventListener('input', function(e) {
            // 得到输入的最新的值
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            // 将最新的值保存到data中表达式对应的属性上
            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    /*
     解析v-class的方法
     */
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    /*
    真正解析表达式/指令的方法
     */
    bind: function(node, vm, exp, dir) {
        //得到更新节点的对应函数
        var updaterFn = updater[dir + 'Updater'];

        // 执行更新的函数
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        // 每次解析表达/一般指令都会创建一个对应的watcher
        new Watcher(vm, exp, function(value, oldValue) { // 回调函数
            // 更新对应的node
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        // 得到事件名(类型): click
        var eventType = dir.split(':')[1],
          // 得到回调函数对象
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            // 绑定事件监听(指定事件名/回调函数), 强制绑定了回调函数中的this为vm
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    /*
    得到表达式所对应的值
     */
    _getVMVal: function(vm, exp) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    /*
        给表达式所对应的属性赋指定的value值
     */
    _setVMVal: function(vm, exp, value) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

/*
包含直接更新节点的多个方法的对象
 */
var updater = {
    /*
    更新节点的文本内容: textContent属性
    解析: {{}}/ v-text
     */
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    /*
     更新节点的文本内容(标签): innerHTML属性
     解析: v-html
     */
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    /*
     更新节点的class: className属性
     解析: v-class
     */
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    /*
    更新节点的value值
     解析: v-model
     */
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};